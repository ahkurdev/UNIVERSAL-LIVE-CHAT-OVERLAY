import { ChatMessage } from '../../shared/types';

let LiveConnection: any;
let connection: any = null;
let onMessageCb: ((msg: ChatMessage) => void) | null = null;
let onConnectedCb: (() => void) | null = null;
let onDisconnectedCb: (() => void) | null = null;
let onErrorCb: ((err: Error) => void) | null = null;

export async function tiktokConnect(username: string): Promise<void> {
  try {
    if (!LiveConnection) {
      const mod = await import('tiktok-live-connector');
      LiveConnection = mod.TikTokLiveConnection;
    }

    if (connection) await tiktokDisconnect();

    connection = new LiveConnection(username, {});

    connection.on('connected', () => onConnectedCb?.());
    connection.on('disconnected', () => onDisconnectedCb?.());
    connection.on('error', (err: any) => onErrorCb?.(err instanceof Error ? err : new Error(String(err))));

    connection.on('chat', (data: any) => {
      console.log('[TikTok] chat event received:', JSON.stringify(data).substring(0, 200));
      const msg = toChatMessage(data);
      if (msg) {
        console.log('[TikTok] message parsed OK:', msg.username, msg.message);
        onMessageCb?.(msg);
      } else {
        console.log('[TikTok] message parsed as NULL');
      }
    });

    connection.on('gift', (data: any) => {
      const msg = toChatMessage(data, 'gift');
      if (msg) onMessageCb?.(msg);
    });

    connection.connect().catch((err: any) => {
      const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
      onErrorCb?.(new Error(msg));
    });
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
    onErrorCb?.(new Error(msg));
    throw new Error(msg);
  }
}

export function tiktokDisconnect(): void {
  try { connection?.disconnect(); } catch {}
  connection = null;
  onDisconnectedCb?.();
}

export function tiktokCleanup(): void {
  tiktokDisconnect();
  onMessageCb = null;
  onConnectedCb = null;
  onDisconnectedCb = null;
  onErrorCb = null;
}

function toChatMessage(data: any, eventType: ChatMessage['eventType'] = 'chat'): ChatMessage | null {
  if (!data) return null;
  // Log raw data for debugging
  console.log('[TikTok] raw data keys:', Object.keys(data).join(', '));

  const username = data.nickname || data.uniqueId || data.user?.uniqueId || data.user?.nickname ||
                   data.sender?.nickname || data.sender?.uniqueId || '';
  const comment = data.comment || data.describe || data.message || data.content ||
                  data.giftName || data.text || '';
  const avatar = data.profilePictureUrl || data.user?.profilePicture?.url || '';
  const id = data.msgId || data.createTime || Date.now();
  const timestamp = (data.createTime || data.timestamp || 0) * 1000 || Date.now();

  if (!username && !comment) return null;

  return {
    id: `tk-${id}-${Math.random().toString(36).slice(2, 7)}`,
    platform: 'tiktok',
    username: username || 'Unknown',
    avatar: avatar || '',
    message: comment || '',
    timestamp,
    badges: data.badges?.map((b: any) => b.label || b.type || '') || [],
    color: '#FE2C55',
    isModerator: data.isModerator || data.moderation || false,
    isSubscriber: data.isSubscriber || (data.followInfo?.followStatus || 0) > 1 || false,
    isVerified: data.isVerified || false,
    eventType: data.giftId ? 'gift' : eventType,
  };
}

export function tiktokOnMessage(cb: (msg: ChatMessage) => void) { onMessageCb = cb; }
export function tiktokOnConnected(cb: () => void) { onConnectedCb = cb; }
export function tiktokOnDisconnected(cb: () => void) { onDisconnectedCb = cb; }
export function tiktokOnError(cb: (err: Error) => void) { onErrorCb = cb; }