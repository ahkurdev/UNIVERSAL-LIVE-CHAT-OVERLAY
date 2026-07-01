import { ChatMessage } from '../../shared/types';

let LiveConnection: any;
let connection: any = null;
let onMessageCb: ((msg: ChatMessage) => void) | null = null;
let onConnectedCb: (() => void) | null = null;
let onDisconnectedCb: (() => void) | null = null;
let onErrorCb: ((err: Error) => void) | null = null;

// Map TikTok event type to our eventType
const EVENT_MAP: Record<string, ChatMessage['eventType']> = {
  chat: 'chat',
  gift: 'gift',
  member: 'gift',
  like: 'chat',
  social: 'chat',
  follow: 'chat',
  share: 'chat',
  envelope: 'gift',
  questionNew: 'chat',
  roomUser: 'chat',
  emote: 'chat',
  goalUpdate: 'chat',
  subNotify: 'gift',
  superFan: 'gift',
  superFanJoin: 'gift',
};

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

    // Important events only - skip high-frequency noise events
    const importantEvents = [
      'chat', 'gift', 'member', 'like', 'social', 'envelope',
      'follow', 'share', 'subNotify', 'superFan', 'superFanJoin',
      'liveIntro', 'questionNew',
    ];

    importantEvents.forEach((eventName) => {
      connection.on(eventName, (data: any) => {
        const msg = toChatMessage(data, eventName);
        if (msg) onMessageCb?.(msg);
      });
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
  onMessageCb = null; onConnectedCb = null; onDisconnectedCb = null; onErrorCb = null;
}

function toChatMessage(data: any, eventName: string): ChatMessage | null {
  if (!data) return null;

  const username = data.nickname || data.uniqueId || data.user?.uniqueId || data.user?.nickname ||
                   data.sender?.nickname || data.sender?.uniqueId || data.userId || '';
  const comment = data.comment || data.describe || data.message || data.content ||
                  data.giftName || data.text || data.label || data.displayText || '';
  const avatar = data.profilePictureUrl || data.user?.profilePicture?.url ||
                 data.sender?.profilePicture?.url || '';

  // Skip if no meaningful data
  if (!username && !comment && eventName !== 'roomUser' && eventName !== 'liveIntro') return null;

  // Extract badges with details
  const rawBadges = data.badges || data.user?.badges || data.sender?.badges || [];
  const badges: string[] = rawBadges.map((b: any) => {
    if (typeof b === 'string') return b;
    // Extract badge label/type from various badge formats
    return b.label || b.type || b.name || b.badgeType || b.displayType || b.url || '';
  }).filter(Boolean);

  // Extract user level from badges or data
  let userLevel = data.user?.level || data.level || data.fanLevel || 0;
  // Some TikTok badge formats have level info
  if (!userLevel) {
    for (const badge of rawBadges) {
      const b = badge.label || badge.type || badge.name || '';
      const lvlMatch = String(b).match(/Level\s*(\d+)/i);
      if (lvlMatch) { userLevel = parseInt(lvlMatch[1]); break; }
    }
  }
  const followerCount = data.followInfo?.followerCount || data.followers || 0;
  const followStatus = data.followInfo?.followStatus || 0;

  // Gift-specific data
  const giftName = data.giftName || data?.gift?.describe || data?.gift?.name || '';
  const giftCount = data.giftCount || data?.repeatCount || data?.combo || 1;
  const diamondCount = data.diamondCount || data?.gift?.diamondCount || 0;

  // Build message text based on event type
  let displayMessage = comment;

  if (eventName === 'gift' && !displayMessage) {
    displayMessage = `Sent ${giftCount}x ${giftName || 'Gift'}` +
      (diamondCount > 0 ? ` (${diamondCount} 💎)` : '');
  } else if (eventName === 'member') {
    displayMessage = `Joined the stream 👋`;
  } else if (eventName === 'like') {
    displayMessage = `Liked! ❤️ (x${data.likeCount || 1})`;
  } else if (eventName === 'follow') {
    displayMessage = `Followed the stream!`;
  } else if (eventName === 'share') {
    displayMessage = `Shared the stream! 🔄`;
  } else if (eventName === 'social') {
    displayMessage = comment || `Social interaction`;
  } else if (eventName === 'envelope') {
    displayMessage = `Sent an envelope! 💌` + (diamondCount > 0 ? ` (${diamondCount} 💎)` : '');
  } else if (eventName === 'roomUser') {
    displayMessage = `Joined the stream 👋`;
  } else if (eventName === 'emote') {
    displayMessage = comment || 'Emote!';
  } else if (eventName === 'subNotify') {
    displayMessage = `Subscribed! 🎉`;
  } else if (eventName === 'superFan' || eventName === 'superFanJoin') {
    displayMessage = `Became a Super Fan! ⭐`;
  }

  if (!displayMessage && eventName !== 'roomUser') return null;

  const id = data.msgId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const eventType = EVENT_MAP[eventName] || 'chat';

  return {
    id: `tk-${id}`,
    platform: 'tiktok',
    username: username || (eventName === 'roomUser' ? 'Viewer' : 'Unknown'),
    avatar: avatar || '',
    message: displayMessage || '',
    timestamp: (data.createTime || data.timestamp || 0) * 1000 || Date.now(),
    badges,
    color: '#FE2C55',
    isModerator: data.isModerator || data.moderation || badges.some((b: string) => /moderator|mod/i.test(b)),
    isSubscriber: data.isSubscriber || followStatus > 1 || badges.some((b: string) => /subscriber|sub|member/i.test(b)),
    isVerified: data.isVerified || false,
    eventType,
    extra: { // Extra TikTok data for rich display
      level: userLevel,
      giftName,
      giftCount,
      diamondCount,
      followerCount,
      eventName,
    },
  };
}

export function tiktokOnMessage(cb: (msg: ChatMessage) => void) { onMessageCb = cb; }
export function tiktokOnConnected(cb: () => void) { onConnectedCb = cb; }
export function tiktokOnDisconnected(cb: () => void) { onDisconnectedCb = cb; }
export function tiktokOnError(cb: (err: Error) => void) { onErrorCb = cb; }