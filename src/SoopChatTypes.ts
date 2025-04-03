export enum ConnectedState {
  STANDBY,
  CONNECTED,
  JOINED,
}

export type ConnectionInfo = {
  channelId: string;
  host: string;
  port: number;
  password: string;
};

export type SoopChatMessage = {
  content: string;
  channelId: string;
  userId: string;
  normalColor: string;
  language: string;
  userType: string;
  nickname: string;
  subscription: number;
  isStreamer: boolean;
  isFan: boolean;
  isTopfan: boolean;
  isManager: boolean;
  isFemale: boolean;
  color: string;
  colorDarkmode: string;
  userflag1: number;
  userflag2: number;
  stickerUrl: string;
};

export enum SoopBalloonType {
  NORMAL,
  AD,
  VOD,
}

export type SoopBalloon = {
  type: SoopBalloonType;
  userId: string;
  nickname: string;
  count: number;
  fanClubOrder: number;
  isStation: boolean;
  imageName: string;
  ttsType: string;
};

export enum SoopBlockType {
  TIMEOUT,
  KICK,
}

export type SoopBlock = {
  type: SoopBlockType;
  duration: number;
  userId: string;
  nickname: string;
  by: string;
};
