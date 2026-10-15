// Self-check: Kick Pusher chat flow (key + subscribe-on-established)
// Run: KICK_CHANNEL=xqc node test/pusher-selfcheck.cjs
const WebSocket = require('ws');

const PUSHER_KEY = '34bf7a0ff419a2a775b9';
const PUSHER_WS = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;

function assert(cond, msg) { if (!cond) throw new Error('assert: ' + msg); }

(async () => {
  const slug = process.env.KICK_CHANNEL || 'xqc';
  const ch = await fetch(`https://kick.com/api/v1/channels/${slug}`).then(r => r.json());
  const chatroomId = ch.chatroom?.id;
  assert(chatroomId, 'chatroom id found');
  console.log('chatroomId:', chatroomId);

  const ws = new WebSocket(PUSHER_WS);
  let subscribed = false, messages = 0;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('no subscription_succeeded in 12s')), 12000);
    ws.on('message', (raw) => {
      let d; try { d = JSON.parse(String(raw)); } catch { return; }
      if (d.event === 'pusher:connection_established') {
        ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${chatroomId}.v2` } }));
      }
      if (d.event === 'pusher_internal:subscription_succeeded') { subscribed = true; clearTimeout(t); resolve(); }
      if (d.event === 'App\\Events\\ChatMessageEvent') messages++;
    });
    ws.on('error', reject);
  });
  await new Promise(r => setTimeout(r, 8000));
  console.log('subscribed:', subscribed, '| chat events in 8s:', messages);
  assert(subscribed, 'subscribed to chatroom');
  ws.close();
  process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
