import { ChatMessage } from '../../shared/types';
import ElectronStore from 'electron-store';

const store = new ElectronStore({
  name: 'user-settings',
  defaults: { settings: { youtubeApiKey: '', youtubeMode: 'scrape' } },
});

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;
let currentMode: 'scrape' | 'apikey' = 'scrape';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function safeSend(win: Electron.BrowserWindow | null, ch: string, ...args: any[]) {
  if (win && !win.isDestroyed()) win.webContents.send(ch, ...args);
}

let dashboardWindow: Electron.BrowserWindow | null = null;

export function youtubeSetWindows(dw: Electron.BrowserWindow | null) {
  dashboardWindow = dw;
}

export async function youtubeConnect(target: string): Promise<void> {
  await youtubeDisconnect();
  abortController = new AbortController();

  const settings = store.get('settings') as any;
  currentMode = settings?.youtubeMode || 'scrape';

  try {
    const videoId = await resolveVideoId(target);
    if (!videoId) throw new Error('Could not find live stream');

    if (currentMode === 'apikey') {
      await connectWithApiKey(videoId, settings?.youtubeApiKey || '');
    } else {
      await connectWithScrape(videoId);
    }
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || 'Failed';
    safeSend(dashboardWindow, 'youtube-status', 'error', msg);
    throw new Error(msg);
  }
}

// ========== SCRAPE MODE (no API key) ==========

let scrapeApiKey = '';
let scrapeClientVersion = '';
let continuation = '';
let isReplay = false;

async function connectWithScrape(videoId: string): Promise<void> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: abortController!.signal,
  });
  if (!res.ok) throw new Error(`Watch page returned ${res.status}`);

  const html = await res.text();

  // Extract INNERTUBE_API_KEY from ytcfg.set()
  const keyMatch = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
  if (!keyMatch) throw new Error('Could not find innerTube API key');
  scrapeApiKey = keyMatch[1];

  const cvMatch = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/);
  scrapeClientVersion = cvMatch?.[1] || '2.20240101.00.00';

  // Extract continuation from ytInitialData
  continuation = await extractContinuationFromWatchPage(videoId, html);

  if (!continuation) {
    // Try live_chat page directly
    continuation = await extractContinuationFromLiveChatPage(videoId);
  }

  if (!continuation) {
    throw new Error('No live chat continuation found. Stream may not be live.');
  }

  safeSend(dashboardWindow, 'youtube-status', 'connected', '');
  pollScrape();
}

async function extractContinuationFromWatchPage(_videoId: string, html: string): Promise<string> {
  // Find ytInitialData JSON
  const dataMatch = html.match(/window\["ytInitialData"\]\s*=\s*({[\s\S]*?});\s*(<\/script>|window)/);
  const altMatch = dataMatch || html.match(/var\s+ytInitialData\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (!altMatch) return '';

  try {
    const data = JSON.parse(altMatch[1]);
    const chatRenderer = data?.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer;
    if (!chatRenderer) return '';

    const continuations = chatRenderer.continuations as any[] || [];
    for (const c of continuations) {
      if (c?.liveChatReplayContinuationData?.continuation) {
        isReplay = true;
        return c.liveChatReplayContinuationData.continuation;
      }
      const token = c?.reloadContinuationData?.continuation ||
                    c?.invalidationContinuationData?.continuation ||
                    c?.timedContinuationData?.continuation;
      if (token) return token;
    }
  } catch {}
  return '';
}

async function extractContinuationFromLiveChatPage(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: abortController!.signal,
    });
    if (!res.ok) return '';
    const html = await res.text();

    if (!scrapeApiKey) {
      const km = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
      if (km) scrapeApiKey = km[1];
    }

    const dm = html.match(/ytInitialData\s*=\s*({[\s\S]*?});\s*<\/script>/);
    if (!dm) return '';

    const data = JSON.parse(dm[1]);
    return findContinuation(data);
  } catch { return ''; }
}

function findContinuation(data: any): string {
  const conts = data?.contents?.liveChatRenderer?.continuations as any[] || [];
  for (const c of conts) {
    if (c?.liveChatReplayContinuationData?.continuation) {
      isReplay = true;
      return c.liveChatReplayContinuationData.continuation;
    }
    const token = c?.invalidationContinuationData?.continuation ||
                  c?.timedContinuationData?.continuation ||
                  c?.reloadContinuationData?.continuation;
    if (token) return token;
  }
  return '';
}

async function pollScrape(): Promise<void> {
  if (!abortController || abortController.signal.aborted) return;
  try {
    const endpoint = isReplay ? 'get_live_chat_replay' : 'get_live_chat';
    const url = `https://www.youtube.com/youtubei/v1/live_chat/${endpoint}?key=${scrapeApiKey}&prettyPrint=false`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: scrapeClientVersion } },
        continuation,
      }),
      signal: abortController.signal,
    });

    if (res.ok) {
      const data: any = await res.json();
      // Update continuation
      const conts = data?.continuationContents?.liveChatContinuation?.continuations;
      if (conts?.length) {
        const c = conts[0];
        continuation = c?.invalidationContinuationData?.continuation ||
                       c?.timedContinuationData?.continuation ||
                       c?.liveChatReplayContinuationData?.continuation ||
                       continuation;
      } else if (isReplay) {
        continuation = ''; // Replay finished
      }

      // Parse actions
      const actions = data?.continuationContents?.liveChatContinuation?.actions as any[] || [];
      for (const action of actions) {
        const items = isReplay
          ? (action?.replayChatItemAction?.actions || [])
          : [action];
        for (const a of items) {
          const msg = parseAction(a);
          if (msg) {
            safeSend(dashboardWindow, 'youtube-message', msg);
          }
        }
      }
    }

    if (!abortController?.signal.aborted && continuation) {
      const interval = isReplay ? 500 : 5000;
      pollTimer = setTimeout(pollScrape, interval);
    } else if (!abortController?.signal.aborted) {
      safeSend(dashboardWindow, 'youtube-status', 'idle', 'Stream ended');
    }
  } catch {
    if (!abortController?.signal.aborted) {
      pollTimer = setTimeout(pollScrape, 5000);
    }
  }
}

// ========== API KEY MODE ==========

async function connectWithApiKey(videoId: string, apiKey: string): Promise<void> {
  if (!apiKey) throw new Error('YouTube API key not configured');

  const vidRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`,
    { signal: abortController!.signal }
  );
  const vidData: any = await vidRes.json();
  if (!vidData.items?.length) throw new Error('Video not found');

  const liveChatId = vidData.items[0].liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) throw new Error('Live chat not active');

  safeSend(dashboardWindow, 'youtube-status', 'connected', '');
  pollApiKey(apiKey, liveChatId);
}

async function pollApiKey(apiKey: string, liveChatId: string): Promise<void> {
  if (!abortController || abortController.signal.aborted) return;
  try {
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=authorDetails,snippet&key=${apiKey}`;
    if (continuation) url += `&pageToken=${continuation}`;

    const res = await fetch(url, { signal: abortController.signal });
    if (!res.ok) throw new Error(`API error ${res.status}`);

    const data: any = await res.json();
    continuation = data.nextPageToken || '';

    for (const item of (data.items || [])) {
      const msg = toApiMessage(item);
      if (msg) safeSend(dashboardWindow, 'youtube-message', msg);
    }

    if (!abortController?.signal.aborted) {
      const ms = data.pollingIntervalMillis || 5000;
      pollTimer = setTimeout(() => pollApiKey(apiKey, liveChatId), Math.max(ms, 5000));
    }
  } catch (err: any) {
    safeSend(dashboardWindow, 'youtube-status', 'error', err?.message || 'Polling failed');
  }
}

function toApiMessage(item: any): ChatMessage | null {
  if (!item?.snippet || !item?.authorDetails) return null;
  return {
    id: item.id || `yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    platform: 'youtube',
    username: item.authorDetails.displayName || 'Unknown',
    avatar: item.authorDetails.profileImageUrl || '',
    message: item.snippet.displayMessage || '',
    timestamp: new Date(item.snippet.publishedAt || Date.now()).getTime(),
    badges: [],
    color: '#FF0033',
    isModerator: item.authorDetails.isChatModerator || false,
    isSubscriber: item.authorDetails.isChatOwner || item.authorDetails.isChatSponsor || false,
    isVerified: false,
    eventType: item.snippet.type === 'superChatEvent' ? 'superchat' :
               item.snippet.type === 'superStickerEvent' ? 'gift' : 'chat',
  };
}

function parseAction(action: any): ChatMessage | null {
  if (!action) return null;
  const item = action?.addChatItemAction?.item;
  if (!item) return null;

  const renderer = item.liveChatTextMessageRenderer ||
                   item.liveChatPaidMessageRenderer ||
                   item.liveChatMembershipItemRenderer;
  if (!renderer) return null;

  const runs = renderer.message?.runs;
  const text = runs?.map((r: any) => r.text).join('') || '';
  if (!text) return null;

  const badges = (renderer.authorBadges || []).map((b: any) =>
    b?.liveChatAuthorBadgeRenderer?.tooltip || ''
  ).filter(Boolean);

  let eventType: ChatMessage['eventType'] = 'chat';
  if (item.liveChatPaidMessageRenderer) eventType = 'superchat';
  else if (item.liveChatMembershipItemRenderer) eventType = 'gift';

  return {
    id: renderer.id || `yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    platform: 'youtube',
    username: renderer.authorName?.simpleText || 'Unknown',
    avatar: renderer.authorPhoto?.thumbnails?.[0]?.url || '',
    message: text,
    timestamp: Date.now(),
    badges,
    color: '#FF0033',
    isModerator: badges.some((b: string) => b.toLowerCase().includes('moderator')),
    isSubscriber: badges.some((b: string) => b.toLowerCase().includes('member')),
    isVerified: false,
    eventType,
  };
}

// ========== SHARED ==========

async function resolveVideoId(target: string): Promise<string | null> {
  if (/^[a-zA-Z0-9_-]{11}$/.test(target)) return target;
  const u = target.match(/(?:youtube\.com|youtu\.be)\/.*[?&]v=([a-zA-Z0-9_-]{11})/);
  if (u) return u[1];
  const s = target.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (s) return s[1];
  try {
    const r = await fetch(`https://www.youtube.com/@${target}/live`, {
      headers: { 'User-Agent': UA }, redirect: 'follow', signal: abortController?.signal,
    });
    const h = await r.text();
    const m = h.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (m) return m[1];
  } catch {}
  return null;
}

export async function youtubeDisconnect(): Promise<void> {
  abortController?.abort();
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  continuation = '';
  isReplay = false;
  safeSend(dashboardWindow, 'youtube-status', 'idle', '');
}

export function youtubeCleanup(): void {
  youtubeDisconnect();
}