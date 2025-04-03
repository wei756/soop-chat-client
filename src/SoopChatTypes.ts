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

export type ChannelEmoteInfo = {
  title: string;
  tier: 1 | 2 | 3;
  pcImg: string;
  pcAltImg: string;
  mobileImg: string;
  mobileAltImg: string;
  isAnimated: boolean;
  orderNo: string;
  blackKeyword: boolean;
};

export type SoopChatMessage = {
  content: string;
  parsedContent: SoopChatMessageContent[];
  emotes: Record<string, ChannelEmoteInfo>;
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

export type SoopChatMessageContent =
  | SoopChatMessageContentText
  | SoopChatMessageContentEmote;

export type SoopChatMessageContentText = {
  type: SoopChatMessageContentType.TEXT;
  body: string;
};

export type SoopChatMessageContentEmote = {
  type: SoopChatMessageContentType.EMOTE;
  body: string;
};

export enum SoopChatMessageContentType {
  TEXT,
  EMOTE,
}

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
