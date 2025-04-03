import { StreamInfo } from 'SoopApiTypes';

const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Content-Type': 'application/x-www-form-urlencoded',
};

export const getPlayerLiveInfo = async (
  userId: string,
): Promise<StreamInfo> => {
  const res = await fetch(
    `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${userId}`,
    {
      method: 'POST',
      headers,
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
