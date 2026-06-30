import { ChatConnector, ChatMessage } from '@shared/types';

interface KickChatMessage {
  id: string;
  sender: { username: string; slug: string; identity: { color: string; badges: string[] } };
  content: string;
  created_at: number;
}

export class KickConnector implements ChatConnector {
  private ws: WebSocket | null = null;
  private onMessageCb?: (msg: ChatMessage) => void;
  private onConnectedCb?: () => void;
  private onDisconnectedCb?: () => void;
  private onErrorCb?: (err: Error) => void;
  private currentTarget = '';
  private shouldReconnect = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private chatroomId: number | null = null;

  async connect(target: string): Promise<void> {
    this.currentTarget = target.toLowerCase().replace(/^https?:\/\/(www\.)?kick\.com\//, '');
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    if (this.ws) await this.disconnect();

    try {
      this.chatroomId = await this.resolveChatroomId(this.currentTarget);
      if (!this.chatroomId) throw new Error('Channel not found or not live');

      await this.connectWebSocket();
      this.onConnectedCb?.();
    } catch (err: any) {
      this.onErrorCb?.(err);
      if (this.shouldReconnect) this.scheduleReconnect();
      throw err;
    }
  }

  private async resolveChatroomId(slug: string): Promise<number | null> {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`Kick API returned ${res.status}`);
      const data = await res.json();
      return data?.chatroom?.id || data?.id || null;
    } catch {
      // Fallback: try the livestream page
      try {
        const res = await fetch(`https://kick.com/api/v2/channels/${slug}/livestream`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.chatroom?.id || null;
      } catch {
        return null;
      }
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.3.0&flash=false`);

        this.ws.onopen = () => {
          // Subscribe to the chatroom channel
          this.ws?.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { channel: `chatrooms.${this.chatroomId}.v2` }
          }));
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'App\\Events\\ChatMessageEvent' || data.event === 'App\\Events\\MessageCreated') {
              const payload = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
              const msg = this.parseMessage(payload);
              if (msg) this.onMessageCb?.(msg);
            }
          } catch { /* ignore parse errors */ }
        };

        this.ws.onerror = () => {
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          this.onDisconnectedCb?.();
          if (this.shouldReconnect) this.scheduleReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private parseMessage(payload: any): ChatMessage | null {
    const msg: KickChatMessage | undefined =
      payload?.message || payload?.data?.message || payload;

    if (!msg?.content && !msg?.sender) return null;

    const sender = msg.sender || payload.sender || {};
    const senderIdentity = (sender as any).identity || {};
    return {
      id: msg.id || `kc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      platform: 'kick',
      username: (sender as any).username || (sender as any).slug || 'Unknown',
      avatar: (sender as any).profile_pic || (sender as any).avatar || '',
      message: msg.content || payload.content || '',
      timestamp: new Date(msg.created_at || Date.now()).getTime(),
      badges: (senderIdentity as any).badges || (sender as any).badges || [],
      color: (senderIdentity as any).color || '#53FC18',
      isModerator: ((senderIdentity as any).badges || []).includes('moderator') || false,
      isSubscriber: ((senderIdentity as any).badges || []).includes('subscriber') || false,
      isVerified: false,
      eventType: 'chat'
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onErrorCb?.(new Error(`Kick: Max reconnect attempts reached`));
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 15000);
    setTimeout(() => {
      if (this.shouldReconnect && this.currentTarget) {
        this.connect(this.currentTarget).catch(() => {});
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
    this.onDisconnectedCb?.();
  }

  async reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    if (this.currentTarget) {
      await this.connect(this.currentTarget);
    }
  }

  onConnected(cb: () => void): void { this.onConnectedCb = cb; }
  onDisconnected(cb: () => void): void { this.onDisconnectedCb = cb; }
  onMessage(cb: (msg: ChatMessage) => void): void { this.onMessageCb = cb; }
  onError(cb: (err: Error) => void): void { this.onErrorCb = cb; }
}