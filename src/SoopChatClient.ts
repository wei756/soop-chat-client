import WebSocket from 'ws';
import { TypedEmitter } from 'tiny-typed-emitter';
import chalk from 'chalk';
import { Logger } from 'Logger';
import { getPlayerLiveInfo, StreamInfoOnline } from 'SoopApi';
import {
  CMD_CONNECT,
  IceFlag,
  IceFlagName,
  ServiceCommand,
  Userflag1,
  Userflag2,
} from 'SoopChatConstants';
import {
  ConnectedState,
  SoopBalloon,
  SoopBalloonType,
  SoopBlock,
  SoopBlockType,
  SoopChatMessage,
} from 'SoopChatTypes';

interface SoopChatClientEvents {
  join: (channelId: string) => void;
  part: (channelId: string) => void;
  chat: (chat: SoopChatMessage) => void;
  balloon: (balloon: SoopBalloon) => void;
  block: (block: SoopBlock) => void;
}

export class SoopChatClient extends TypedEmitter<SoopChatClientEvents> {
  socket: WebSocket | null = null;
  log: Logger;

  streamInfo: StreamInfoOnline | null = null;
  connectInfo: {
    channelId: string;
    host: string;
    port: number;
    password: string;
  } | null = null;

  connectedState: ConnectedState;

  loopPingPong: NodeJS.Timeout;

  decoder = new TextDecoder();

  constructor({ logging = false }) {
    super();
    this.connectedState = ConnectedState.STANDBY;
    this.loopPingPong = setInterval(this.sendPing, 60000);
    this.log = new Logger('soop-chat', logging);
  }

  sendPing = () => {
    if (
      this.connectedState === ConnectedState.CONNECTED ||
      this.connectedState === ConnectedState.JOINED
    ) {
      this.send(ServiceCommand.PING, '\x0c');
      this.log.verbose(`PING: ${this.connectInfo!.channelId}`);
    }
  };

  setConnectedState = (state: ConnectedState): void => {
    this.connectedState = state;
  };

  connect = async (userId: string, password = '') => {
    this.setConnectedState(ConnectedState.STANDBY);
    try {
      const liveInfo = await getPlayerLiveInfo(userId);
      if (liveInfo.CHANNEL?.RESULT !== 1) {
        throw new Error(`방송 중이 아닙니다. (${userId})`);
      }
      this.streamInfo = liveInfo as StreamInfoOnline;
      this.connectInfo = {
        channelId: this.streamInfo.CHANNEL.BJID,
        host: this.streamInfo.CHANNEL.CHDOMAIN,
        port: parseInt(this.streamInfo.CHANNEL.CHPT) + 1,
        password,
      };
      this.log.name = `soop-chat:${this.connectInfo.channelId}`.padEnd(23);

      const wsHost = `wss://${this.connectInfo.host.toLowerCase()}:${
        this.connectInfo.port
      }/Websocket/${this.connectInfo.channelId}`;

      this.log.info(`연결시도: ${wsHost}`);
      const ws = new WebSocket(wsHost, 'chat');
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        this.setConnectedState(ConnectedState.CONNECTED);
        this.log.info(`연결됨: ${ws.url}`);
        clearInterval(this.loopPingPong);
        this.loopPingPong = setInterval(this.sendPing, 60000);
        ws.send(CMD_CONNECT);
      };
      ws.onclose = () => {
        this.setConnectedState(ConnectedState.STANDBY);
        clearInterval(this.loopPingPong);
        this.log.warn('채팅 서버와 연결이 끊어졌습니다.');
      };
      ws.onerror = (e) => {
        this.setConnectedState(ConnectedState.STANDBY);
        if (e.message == 'unable to verify the first certificate') {
          this.log.warn('채팅 서버 인증서 오류로 인해 연결이 실패했습니다.');
        } else {
          this.log.warn('채팅 서버와 연결 중 오류가 발생했습니다. ' + e.error);
        }
      };
      ws.onmessage = (msg) => {
        if (msg.data) {
          this.processMessage(msg.data as ArrayBuffer);
        }
      };
      this.socket = ws;
    } catch (e) {
      if (e instanceof Error) {
        this.log.warn(e.message);
      }
    }
  };

  send = (serviceCommand: ServiceCommand, body: string) => {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const magicNumber = '\x1b\x09';
    const cmd = serviceCommand.toString().padStart(4, '0');
    const bodyLength = body.length.toString().padStart(6, '0');
    const header = `${magicNumber}${cmd}${bodyLength}\x30\x30`; // 2 4 6 2 = 14
    const sendData = `${header}${body}`;
    this.socket?.send(sendData);
    return true;
  };

  joinChannel = () => {
    if (!this.streamInfo) {
      return;
    }
    const stream = this.streamInfo.CHANNEL;
    const body = [
      `\x0c${stream.CHATNO}`,
      `\x0c${stream.FTK}`,
      '\x0c0\x0c\x0clog\x11',
      '\x06&\x06set_bps\x06=\x06',
      stream.BPS,
      '\x06&\x06view_bps\x06=\x06',
      stream.BPS,
      '\x06&\x06quality\x06=\x06',
      'ori',
      '\x06&\x06geo_cc\x06=\x06',
      stream.geo_cc,
      '\x06&\x06geo_rc\x06=\x06',
      stream.geo_rc,
      '\x06&\x06acpt_lang\x06=\x06',
      stream.acpt_lang,
      '\x06&\x06svc_lang\x06=\x06',
      stream.svc_lang,
      '\x06&\x06subscribe\x06=\x060',
      '\x06&\x06lowlatency\x06=\x061',
      '\x12',
      `pwd\x11${this.connectInfo?.password ?? ''}\x12`,
      'auth_info\x11NULL\x12',
      'pver\x112\x12',
      'access_system\x11html5\x12',
      '\x0c',
    ];
    if (this.streamInfo.CHANNEL.BPWD === 'Y') {
      this.log.info(`비번방에 접속합니다.`);
    }
    this.send(ServiceCommand.JOIN, body.join(''));
  };

  processMessage = (msg: ArrayBuffer): void => {
    const header = msg.slice(0, 14);

    // const magicNumber = header.slice(0, 2); // 1b 09
    const serviceCommand = parseInt(this.decoder.decode(header.slice(2, 6)));
    // const contentLength = parseInt(this.decoder.decode(header.slice(6, 12)));

    const body = msg.slice(15);
    const bodyParted = this.decoder.decode(body).split('\f');

    switch (serviceCommand) {
      case ServiceCommand.LOGIN:
        this.log.info(`로그인: ${this.connectInfo!.channelId}`);
        this.joinChannel();
        break;
      case ServiceCommand.JOIN:
        this.onMsgJoin(bodyParted);
        break;
      case ServiceCommand.JOINPART_USER:
        this.onMsgJoinPartUser(bodyParted);
        break;
      case ServiceCommand.USER_TIMEOUT:
        this.onMsgSetUserTimeout(bodyParted);
        break;
      case ServiceCommand.CHAT:
        this.onMsgChatMsg(bodyParted);
        break;
      case ServiceCommand.CHAT_OGQ:
        this.onMsgChatOgq(bodyParted);
        break;
      case ServiceCommand.OGQ_GIFT:
        this.onMsgOgqGift(bodyParted);
        break;
      case ServiceCommand.SET_USERFLAG:
        this.onMsgSetUserflag(bodyParted);
        break;
      case ServiceCommand.INOUT_MANAGER:
        this.onMsgInoutManager(bodyParted);
        break;
      case ServiceCommand.ICE1:
        break;
      case ServiceCommand.ICE2:
        this.onMsgIce(bodyParted);
        break;
      case ServiceCommand.SLOWMODE:
        this.onMsgSlowMode(bodyParted);
        break;
      case ServiceCommand.BALLOON:
        this.onMsgBalloon(bodyParted);
        break;
      case ServiceCommand.BALLOON_AD:
        this.onMsgBalloonAd(bodyParted);
        break;
      case ServiceCommand.BALLOON_AD_STATION:
        this.onMsgBalloonAdStation(bodyParted);
        break;
      case ServiceCommand.BLOCK_WORDS_LIST:
        this.onMsgBlockWordsList(bodyParted);
        break;
      case ServiceCommand.STREAM_CLOSED:
        this.onMsgStreamClosed(bodyParted);
        break;
      case ServiceCommand.SYSTEM_NOTICE:
        this.onMsgNoticeSystem(bodyParted);
        break;
      case ServiceCommand.CHANNEL_NOTICE:
        this.onMsgNotice(bodyParted);
        break;
      case ServiceCommand.SUBSCRIPTION_GIFT:
        this.onMsgSubscriptionGift(bodyParted);
        break;
      case ServiceCommand.SUBSCRIPTION_NEW:
        this.onMsgSubscriptionNew(bodyParted);
        break;
      case ServiceCommand.SUBSCRIPTION:
        this.onMsgSubscription(bodyParted);
        break;
      default:
        this.log.verbose(
          `${
            ServiceCommand[serviceCommand]
          }(${serviceCommand}): ${bodyParted.join(' ')}`,
        );
        break;
    }
  };

  onMsgJoin = (bodyParted: string[]) => {
    if (bodyParted[0] === '비밀번호가 틀렸습니다.') {
      this.log.warn(`채널 입장 실패: 비밀번호가 틀렸습니다.`);
      this.close();
      return;
    }
    const [
      chatNo,
      channelId,
      unknown1,
      unknown2,
      unknown3,
      unknown4,
      unknown5,
      unknown6,
    ] = bodyParted;
    this.setConnectedState(ConnectedState.JOINED);
    this.log.info(`채널 입장: ${channelId}`);
    this.emit('join', channelId);
  };

  onMsgJoinPartUser = (bodyParted: string[]) => {
    const [
      joinType, // '1': join, other: part
      userId,
      nickname,
      quitType,
      unknown1,
      userFlag,
    ] = bodyParted;
    if (joinType === '1') {
      this.log.verbose(
        `입장: ${nickname}(${userId}),${joinType},${quitType},${unknown1},${userFlag}`,
      );
    } else {
      // 퇴장
      if (quitType === '1') {
        this.log.verbose(
          `퇴장: ${nickname}(${userId}),${joinType},${quitType},${unknown1},${userFlag}`,
        );
      } else {
        this.log.verbose(
          `강퇴: ${nickname}(${userId}),${joinType},${quitType},${unknown1},${userFlag}`,
        );
        this.emit('block', {
          type: SoopBlockType.KICK,
          duration: 0,
          userId,
          nickname,
          by: 'manager',
        });
      }
    }
  };

  onMsgSetUserTimeout = (bodyParted: string[]) => {
    const [
      userId,
      userflag,
      duration, // '30'
      unknown1, // '1'
      byManagerId,
      unknown2, // '2'
      unknown3, // ''
      nickname,
      unknown4, // ''
    ] = bodyParted;
    this.log.verbose(
      `채팅 금지: ${nickname}(${userId}) ${duration}s by ${byManagerId}`,
    );
    this.emit('block', {
      type: SoopBlockType.TIMEOUT,
      duration: parseInt(duration),
      userId,
      nickname,
      by: byManagerId,
    });
  };

  onMsgChatMsg = (bodyParted: string[]) => {
    const [
      content,
      userId,
      normalColor, // '0'
      userType, // '0' 0/3/default: normal, 1: staff, 2:police
      language, // '3'
      nickname,
      userflag,
      subscription,
      color,
      colorDarkmode,
    ] = bodyParted;

    let userTypeName: string;
    switch (parseInt(userType)) {
      case 1:
        userTypeName = 'staff';
        break;
      case 2:
        userTypeName = 'police';
        break;
      case 3:
      case 0:
      default:
        userTypeName = 'normal';
    }

    const subscriptionNum = parseInt(subscription);

    const userflag1 = parseInt(userflag.split('|')[0]);
    const userflag2 = parseInt(userflag.split('|')[1]);
    const isStreamer = this.isUserflag(Userflag1.HOST, userflag1);
    const isFan = this.isUserflag(Userflag1.FANCLUB, userflag1);
    const sub = this.isUserflag(Userflag1.FOLLOWER, userflag1);
    const isTopfan = this.isUserflag(Userflag1.TOPFAN, userflag1);
    const isManager = this.isUserflag(Userflag1.MANAGER2, userflag1);
    const isFemale = this.isUserflag(Userflag1.FEMALE, userflag1);

    const badge = isFemale ? '[여]' : '[남]';
    const badge1 =
      subscriptionNum > 0 ? `[${subscription.padStart(2, '0')}]` : '    ';
    const badge2 = isStreamer
      ? '[스]'
      : isManager
      ? '[매]'
      : isTopfan
      ? '[열]'
      : isFan
      ? '[팬]'
      : '    ';

    const userflags: string[] = [];
    for (const flag in Object.values(Userflag1)) {
      const excluded = [
        Userflag1.HOST,
        Userflag1.FANCLUB,
        Userflag1.FOLLOWER,
        Userflag1.TOPFAN,
        Userflag1.MANAGER2,
        Userflag1.FEMALE,
      ];
      if (excluded.includes(Number(flag))) {
        continue;
      }
      if (Userflag1[flag] == undefined) {
        continue;
      }
      if (this.isUserflag(Number(flag), userflag1)) {
        userflags.push(Userflag1[flag]);
      }
    }
    const userflags2: string[] = [];
    for (const flag in Object.values(Userflag2)) {
      if (Userflag2[flag] == undefined) {
        continue;
      }
      if (this.isUserflag(Number(flag), userflag2)) {
        userflags2.push(Userflag2[flag]);
      }
    }

    this.log.verbose(
      `채팅: ${badge}${badge1}${badge2}${chalk.hex('#' + colorDarkmode)(
        `${nickname}(${userId})`,
      )}: ${content}`,
      '\t|',
      language,
      `${userTypeName}(${userType})`,
      userflags.join(' '),
      '|',
      userflags2.join(' '),
    );

    this.emit('chat', {
      content,
      channelId: this.connectInfo!.channelId,
      userId,
      normalColor,
      language,
      userType: userTypeName,
      nickname,
      subscription: subscriptionNum,
      isStreamer,
      isFan,
      isTopfan,
      isManager,
      isFemale,
      color,
      colorDarkmode,
      userflag1,
      userflag2,
      stickerUrl: '',
    });
  };

  onMsgChatOgq = (bodyParted: string[]) => {
    const [
      unknown1,
      content,
      stickerSetId,
      stickerId,
      stickerVer,
      userId,
      nickname,
      userflag,
      unknown2,
      language,
      userType,
      stickerFiletype,
      subscription,
      color,
      colorDarkmode,
      unknown6,
    ] = bodyParted;

    let userTypeName: string;
    switch (parseInt(userType)) {
      case 1:
        userTypeName = 'staff';
        break;
      case 2:
        userTypeName = 'police';
        break;
      case 3:
      case 0:
      default:
        userTypeName = 'normal';
    }

    const subscriptionNum = parseInt(subscription);

    const userflag1 = parseInt(userflag.split('|')[0]);
    const userflag2 = parseInt(userflag.split('|')[1]);
    const isStreamer = this.isUserflag(Userflag1.HOST, userflag1);
    const isFan = this.isUserflag(Userflag1.FANCLUB, userflag1);
    const isTopfan = this.isUserflag(Userflag1.TOPFAN, userflag1);
    const isManager = this.isUserflag(Userflag1.MANAGER2, userflag1);
    const isFemale = this.isUserflag(Userflag1.FEMALE, userflag1);

    const stickerUrl = `${stickerSetId}/${stickerId}_40.${stickerFiletype}?ver=${stickerVer}`;

    this.log.verbose(
      `OGQ: ${chalk.hex('#' + colorDarkmode)(
        `${nickname}(${userId})`,
      )}: ${content} ${stickerUrl}`,
    );
    this.emit('chat', {
      content,
      channelId: this.connectInfo!.channelId,
      userId,
      normalColor: '',
      language,
      userType: userTypeName,
      nickname,
      subscription: subscriptionNum,
      isStreamer,
      isFan,
      isTopfan,
      isManager,
      isFemale,
      color,
      colorDarkmode,
      userflag1,
      userflag2,
      stickerUrl,
    });
  };

  onMsgOgqGift = (bodyParted: string[]) => {
    const [
      unknown1,
      senderUserId,
      senderNickname,
      receiverUserId,
      receiverNickname,
      stickerName,
      stickerUrl,
    ] = bodyParted;
    this.log.verbose(
      `OGQ 선물: ${receiverNickname}(${receiverUserId}) ${stickerName} from ${senderNickname}(${senderUserId}) ${stickerUrl}`,
    );
  };

  onMsgSetUserflag = (bodyParted: string[]) => {
    const [before, userId, nickname, unknown1, unknown2, after, unknown3] =
      bodyParted;

    const userflagBefore = before.split('|').map(Number);
    const userflagAfter = after.split('|').map(Number);
    const flagDiffList: [flag: string, before: boolean, after: boolean][] = [];

    for (const flag in Object.values(Userflag1)) {
      if (Userflag1[flag] == undefined) {
        continue;
      }
      const userFlagBefore = this.isUserflag(Number(flag), userflagBefore[0]);
      const userFlagAfter = this.isUserflag(Number(flag), userflagAfter[0]);
      if (userFlagBefore != userFlagAfter) {
        flagDiffList.push([Userflag1[flag], userFlagBefore, userFlagAfter]);
      }
    }
    for (const flag in Object.values(Userflag2)) {
      if (Userflag2[flag] == undefined) {
        continue;
      }
      const userFlagBefore = this.isUserflag(Number(flag), userflagBefore[1]);
      const userFlagAfter = this.isUserflag(Number(flag), userflagAfter[1]);
      if (userFlagBefore != userFlagAfter) {
        flagDiffList.push([Userflag2[flag], userFlagBefore, userFlagAfter]);
      }
    }
    this.log.verbose(
      `유저 플래그 변경: ${nickname}(${userId}): `,
      flagDiffList.map(
        ([flagName, before, after]) => `${flagName} -> ${after}`,
      ),
    );
  };

  onMsgInoutManager = (bodyParted: string[]) => {
    const [userId, userflag, unknown, nickname] = bodyParted;
    const userflag1 = parseInt(userflag.split('|')[0]);
    const isManager = this.isUserflag(Userflag1.MANAGER2, userflag1);
    this.log.info(
      `매니저: ${nickname}(${userId}) ${isManager ? '임명' : '해임'}`,
    );
  };

  onMsgIce = (bodyParted: string[]) => {
    const [
      isEnabled, // '1': enable, '0': disable
      isEnabled2, // '1': enable, '0': disable
      _iceflag,
      minFanBalloon,
      minSubscriptionNum,
    ] = bodyParted;

    const iceflag = parseInt(_iceflag);

    if (isEnabled === '1') {
      const iceflags: string[] = [];
      for (const flag in Object.values(IceFlag)) {
        if (IceFlag[flag] == undefined) {
          continue;
        }
        if (this.isIceflag(Number(flag), iceflag)) {
          iceflags.push(IceFlagName[Number(flag) as keyof typeof IceFlagName]);
        }
      }
      this.log.info(
        `얼리기: 설정 스트리머, ${iceflags.join(', ')} 이상, 최소 별풍개수: ${minFanBalloon}, 최소 구독 개월수: ${minSubscriptionNum}`,
      );
    } else {
      this.log.info(`얼리기: 해제`);
    }
  };

  onMsgSlowMode = (bodyParted: string[]) => {
    const [unknown1, duration] = bodyParted;
    this.log.info(`저속모드: ${duration === '0' ? '해제' : duration + '초'}`);
  };

  onMsgBalloon = (bodyParted: string[]) => {
    const [
      channelId,
      userId,
      nickname,
      count,
      fanClubOrder,
      unknown2,
      unknown3,
      imageName,
      unknown4,
      unknown5,
      ttsType,
    ] = bodyParted;

    const joinedFan =
      parseInt(fanClubOrder) > 0
        ? '로 ' + fanClubOrder + '번째 팬클럽 가입'
        : '';

    this.log.verbose(
      `별풍선: ${nickname}(${userId}) ${count}개${joinedFan}`,
      ttsType,
      imageName,
    );
    this.emit('balloon', {
      type: SoopBalloonType.NORMAL,
      userId,
      nickname,
      count: parseInt(count),
      fanClubOrder: parseInt(fanClubOrder),
      isStation: false,
      imageName,
      ttsType,
    });
  };

  onMsgBalloonAd = (bodyParted: string[]) => {
    const [
      unknown1,
      channelId,
      userId,
      nickname,
      title,
      message,
      unknown2, // ''
      icon,
      imageName,
      count,
      fanClubOrder,
      unknown3, // '0'
      unknown4, // '0'
      unknown5, // '0'
      ttsType,
      unknown6, // ''
    ] = bodyParted;
    this.log.verbose(
      `애드벌룬: ${nickname}(${userId}) ${count}개${
        parseInt(fanClubOrder) > 0
          ? '로 ' + fanClubOrder + '번째 팬클럽 가입'
          : ''
      }`,
      ttsType,
    );
    this.emit('balloon', {
      type: SoopBalloonType.AD,
      userId,
      nickname,
      count: parseInt(count),
      fanClubOrder: parseInt(fanClubOrder),
      isStation: false,
      imageName,
      ttsType,
    });
  };

  onMsgBalloonAdStation = (bodyParted: string[]) => {
    const [channelId, userId, nickname, count, image, message, unknown1] =
      bodyParted;
    this.log.verbose(`방송국 애드벌룬: ${nickname}(${userId}) ${count}개`);
    this.emit('balloon', {
      type: SoopBalloonType.AD,
      userId,
      nickname,
      count: parseInt(count),
      fanClubOrder: 0,
      isStation: true,
      imageName: image,
      ttsType: '',
    });
  };

  onMsgBlockWordsList = (bodyParted: string[]) => {
    const [filterded, _targets] = bodyParted;
    if (_targets === '') {
      return;
    }
    const targets = _targets.split('\x06');
    if (targets.length > 0) {
      this.log.verbose(`금칙어 목록: ${targets.join(', ')} -> ${filterded}`);
    }
  };

  onMsgStreamClosed = (_: string[]) => {
    this.log.warn(`방송 종료됨: ${this.connectInfo!.channelId}`);
    this.close();
  };

  onMsgNoticeSystem = (bodyParted: string[]) => {
    const [notice, unknown1] = bodyParted;
    this.log.info(`시스템 공지: ${notice}`);
  };

  onMsgNotice = (bodyParted: string[]) => {
    const [unknown1, unknown2, unknown3, notice] = bodyParted;
    this.log.info(`공지: ${notice}`);
  };

  onMsgSubscriptionGift = (bodyParted: string[]) => {
    const [
      subGiftChatNo,
      subGiftChannelId,
      subGiftChannelName,
      subGiftUserId,
      subGiftNickname,
      subGiftGifterUserId,
      subGiftGifterNickname,
      subGiftTicketDuration,
      subGiftKey,
      subGiftUnknown2, // '0'
      subGiftUnknown3, // '0'
      subGiftUnknown4, // ''
      subGiftUnknown5, // '0'
      subGiftUnknown6, // '0'
      subGiftUnknown7, // ''
      subGiftUnknown8, // ''
    ] = bodyParted;
    this.log.verbose(
      `구독권 선물: ${subGiftNickname}(${subGiftUserId}) ${subGiftTicketDuration}개월 from ${subGiftGifterNickname}(${subGiftGifterUserId}) \t ${subGiftKey}`,
    );
  };

  onMsgSubscriptionNew = (bodyParted: string[]) => {
    const [
      unknown1,
      channelId,
      userId,
      nickname,
      duration, // '-1: 그냥 구독', '15: 그냥 1개월', '13: 1개월', '2: 6개월', '7: 1개월 선물',
      unknown2, // ''
    ] = bodyParted;
    this.log.verbose(
      `신규 구독: ${nickname}(${userId}) \t ${duration}, ${unknown2}`,
    );
  };

  onMsgSubscription = (bodyParted: string[]) => {
    const [
      channelId,
      userId,
      nickname,
      duration,
      unknown1,
      unknown2, // ''
    ] = bodyParted;
    this.log.verbose(
      `구독: ${nickname}(${userId}) ${duration}개월째 \t ${unknown2}`,
    );
  };

  isUserflag = (flagName: Userflag1 | Userflag2, userflag: number) => {
    return !!((userflag >>> flagName) & 1);
  };

  isIceflag = (flagName: IceFlag, iceflag: number) => {
    return !!((iceflag >>> flagName) & 1);
  };

  close = () => {
    if (this.socket) {
      this.socket.close();
      this.setConnectedState(ConnectedState.STANDBY);
      this.log.warn('채팅 서버와 연결을 종료합니다.');
      this.emit('part', this.connectInfo?.channelId ?? '');
    }
  };
}
