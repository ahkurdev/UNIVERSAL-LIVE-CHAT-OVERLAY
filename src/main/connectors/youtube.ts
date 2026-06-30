import { ChatMessage } from '../../shared/types';
import ElectronStore from 'electron-store';

const store = new ElectronStore({
  name: 'user-settings',
  defaults: { settings: { youtubeApiKey: '' } },
});

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;
let nextPageToken: string | null = null;
let currentVideoId = '';

function safeSend(window: Electron.BrowserWindow | null, channel: string, ...args: any[]) {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, ...args);
  }
}

let dashboardWindow: Electron.BrowserWindow | null = null;

export function youtubeSetWindows(dw: Electron.BrowserWindow | null, _ow: Electron.BrowserWindow | null) {
  dashboardWindow = dw;
}

export async function youtubeConnect(target: string): Promise<void> {
  await youtubeDisconnect();
  abortController = new AbortController();

  const apiKey = (store.get('settings') as any)?.youtubeApiKey || '';
  if (!apiKey) {
    throw new Error('YouTube API key not configured. Set it in Settings > General.');
  }

  try {
    currentVideoId = await resolveVideoId(target) || '';
    if (!currentVideoId) throw new Error('Could not find live stream');

    // Verify the video is a live stream with chat enabled
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${currentVideoId}&key=${apiKey}`,
      { signal: abortController.signal }
    );
    const videoData: any = await videoRes.json();
    if (!videoData.items?.length) throw new Error('Video not found');
    
    const liveDetails = videoData.items[0].liveStreamingDetails;
    if (!liveDetails) throw new Error('This video is not a live stream');
    
    const activeLiveChatId = liveDetails.activeLiveChatId;
    if (!activeLiveChatId) throw new Error('Live chat is not active');

    safeSend(dashboardWindow, 'youtube-status', 'connected', '');
    nextPageToken = null;
    pollChat(apiKey, activeLiveChatId);
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || 'Failed to connect';
    safeSend(dashboardWindow, 'youtube-status', 'error', msg);
    throw new Error(msg);
  }
}

async function resolveVideoId(target: string): Promise<string | null> {
  if (/^[a-zA-Z0-9_-]{11}$/.test(target)) return target;
  const urlMatch = target.match(/(?:youtube\.com|youtu\.be)\/.*[?&]v=([a-zA-Z0-9_-]{11})/);
  if (urlMatch) return urlMatch[1];
  const shortMatch = target.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  try {
    const res = await fetch(`https://www.youtube.com/@${target}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: abortController?.signal,
    });
    const html = await res.text();
    const m = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (m) return m[1];
    const m2 = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (m2) return m2[1];
    return null;
  } catch {
    return null;
  }
}

async function pollChat(apiKey: string, liveChatId: string): Promise<void> {
  if (!abortController || abortController.signal.aborted) return;

  try {
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=authorDetails,snippet&key=${apiKey}`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;

    const res = await fetch(url, { signal: abortController.signal });
    if (!res.ok) {
      const errData: any = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error ${res.status}`);
    }

    const data: any = await res.json();
    nextPageToken = data.nextPageToken || null;

    for (const item of (data.items || [])) {
      const msg = toChatMessage(item);
      if (msg) {
        safeSend(dashboardWindow, 'youtube-message', msg);
      }
    }

    if (!abortController?.signal.aborted) {
      const interval = data.pollingIntervalMillis || 5000;
      pollTimer = setTimeout(() => pollChat(apiKey, liveChatId), Math.max(interval, 5000));
    }
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || 'Polling failed';
    safeSend(dashboardWindow, 'youtube-status', 'error', msg);
  }
}

function toChatMessage(item: any): ChatMessage | null {
  const snippet = item?.snippet;
  const author = item?.authorDetails;
  if (!snippet || !author) return null;

  return {
    id: item.id || `yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    platform: 'youtube',
    username: author.displayName || 'Unknown',
    avatar: author.profileImageUrl || '',
    message: snippet.displayMessage || '',
    timestamp: new Date(snippet.publishedAt || Date.now()).getTime(),
    badges: [],
    color: '#FF0033',
    isModerator: author.isChatModerator || false,
    isSubscriber: author.isChatOwner || author.isChatSponsor || false,
    isVerified: false,
    eventType: snippet.type === 'superChatEvent' ? 'superchat' : snippet.type === 'superStickerEvent' ? 'gift' : 'chat',
  };
}

export async function youtubeDisconnect(): Promise<void> {
  abortController?.abort();
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  nextPageToken = null;
  safeSend(dashboardWindow, 'youtube-status', 'idle', '');
}

export function youtubeCleanup(): void {
  youtubeDisconnect();
}