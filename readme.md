# soop-chat-client

SOOP Chat Client for node.js

## Install

`npm i soop-chat-client`

or

`yarn add soop-chat-client`

## Usage

```js
import { SoopChatClient } from 'soop-chat-client';

const client = new SoopChatClient({
  logging: false,
});

client.on('join', (channel) => {
  console.log(`Joined to ${channel}`);
});
client.on('part', (channel) => {
  console.log(`Parted from ${channel}`);
});
client.on('chat', (chat) => {
  console.log(`${chat.nickname}(${chat.userId}): ${chat.content}`);
});

// join
client.connect('channel id');

// part
client.close();
```
