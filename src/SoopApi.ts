import { StreamInfo } from "SoopApiTypes";

export const getPlayerLiveInfo = async (
  userId: string,
): Promise<StreamInfo> => {
  const res = await fetch(
    `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${userId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        bid: userId,
        type: 'live',
        pwd: '',
        player_type: 'html5',
        stream_type: 'common',
        mode: 'landing',
        from_api: '0',
      }),
    },
  );

  const data: StreamInfo = await res.json();

  return data;
};
