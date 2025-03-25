export enum ConnectedState {
  STANDBY,
  CONNECTED,
  JOINED,
}

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
};
