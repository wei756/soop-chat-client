export enum ServiceCommand {
  PING = 0, // 접속 유지
  LOGIN = 1, // 로그인
  JOIN = 2, // 입장
  JOINPART_USER = 4, // 열혈팬 입장/유저 강퇴
  USER_TIMEOUT = 8, // 채금
  CHAT = 5, // 일반 채팅
  CHAT_OGQ = 109, // OGQ스티커 채팅
  OGQ_GIFT = 118, // OGQ스티커 선물
  SET_USERFLAG = 12, // 유저플래그 변경됨
  INOUT_MANAGER = 13, // 매니저 임명/해임
  SUBNICKNAME = 14, // 채팅방 닉네임 설정
  ICE1 = 19, // 얼리기
  ICE2 = 21, // 얼리기
  SLOWMODE = 23, // 저속모드
  BALLOON = 18, // 별풍선
  BALLOON_AD = 87, // 애드벌룬
  BALLOON_AD_STATION = 107, // 방송국 별풍선
  BLOCK_WORDS_LIST = 54, // [ '', '', '' ]
  STREAM_CLOSED = 88, // 뱅종
  SUBSCRIPTION_NEW = 91, // 신규 구독
  SUBSCRIPTION = 93, // 구독 연장
  SUBSCRIPTION_GIFT = 108, // 구독권 선물
  SYSTEM_NOTICE = 58, // 별별 수다 이런거 공지
  CHANNEL_NOTICE = 104, // 채팅 공지
  MISSION = 121, // 도전 미션 {"type":"CHALLENGE_GIFT","chno":number,"is_relay":boolean,"key":number,"title":"string unicoded","image":string,"gift_count":number,"user_id":string,"user_nick":"unicoded string","bj_id":string,"bj_nick":"unicoded string"}
}

export enum Userflag1 {
  HOST = 2, // 방장
  FANCLUB = 5, // 팬클럽
  MANAGER1 = 6, // 매니저
  MANAGER2 = 8, // 매니저
  FEMALE = 9, // 여성
  TIMEOUT_BY_DOBAE1 = 11, // 도배 채금
  TIMEOUT_BY_DOBAE2 = 12, // 도배 채금
  TIMEOUT_BY_DOBAE3 = 24, // 도배 채금
  MOBILE = 14, // 모바일 접속
  TOPFAN = 15, // 열혈
  DM_BLCOKED = 17, // 귓속말 차단
  QUICKVIEW = 19, // 퀵뷰
  MOBILE_WEB = 23, // 모바일 웹 접속
  FOLLOWER = 28, // 팔로워
}

export enum Userflag2 {
  SUBSCRIPTION_TIER1 = 18, // 1티어 구독
  SUBSCRIPTION_TIER2 = 19, // 2티어 구독
  SUBSCRIPTION_TIER3 = 20, // 3티어 구독
}

export enum IceFlag {
  FANCLUB = 5, // 팬클럽
  SUPPORTER = 6, // 서포터
  TOPFAN = 7, // 열혈팬
  SUBSCRIPTION = 8, // 구독팬
  MANAGER = 9, // 매니저
}

export const IceFlagName = {
  [IceFlag.FANCLUB]: '팬클럽',
  [IceFlag.SUPPORTER]: '서포터',
  [IceFlag.TOPFAN]: '열혈팬',
  [IceFlag.SUBSCRIPTION]: '구독팬',
  [IceFlag.MANAGER]: '매니저',
};

export const CMD_CONNECT =
  '\x1b\x09\x30\x30\x30\x31\x30\x30\x30\x30\x30\x36\x30\x30\x0c\x0c\x0c\x31\x36\x0c';
