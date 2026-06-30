import tmi from 'tmi.js';
import { ChatConnector, ChatMessage } from '@shared/types';

export class TwitchConnector implements ChatConnector {
  private client: tmi.Client | null = null;
  private onMessageCb?: (msg: ChatMessage) => void;
  private onConnectedCb?: () => void;
  private onDisconnectedCb?: () => void;
  private onErrorCb?: (err: Error) => void;
  private currentTarget: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private shouldReconnect = false;

  async connect(target: string): Promise<void> {
    this.currentTarget = target.toLowerCase().replace(/^#/, '');
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    if (this.client) {
      await this.disconnect();
    }

    this.client = new tmi.Client({
      connection: {
        reconnect: false, // We handle reconnection ourselves
        secure: true
      },
      channels: [this.currentTarget]
    });

    this.client.on('message', (_channel, tags, message, self) => {
      if (self) return;

      const chatMessage: ChatMessage = {
        id: tags.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        platform: 'twitch',
        username: tags['display-name'] || tags.username || 'Unknown',
        avatar: '',
        message: message,
        timestamp: tags['tmi-sent-ts'] ? parseInt(tags['tmi-sent-ts']) : Date.now(),
        badges: tags.badges ? Object.keys(tags.badges) : [],
        color: tags.color || '#9146FF',
        isModerator: tags.mod || false,
        isSubscriber: tags.subscriber || false,
        isVerified: false,
        eventType: tags.bits ? 'cheers' : 'chat'
      };

      if (this.onMessageCb) {
        this.onMessageCb(chatMessage);
      }
    });

    this.client.on('connected', () => {
      this.reconnectAttempts = 0;
      if (this.onConnectedCb) this.onConnectedCb();
    });

    this.client.on('disconnected', () => {
      if (this.onDisconnectedCb) this.onDisconnectedCb();
      // Auto-reconnect with exponential backoff
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    try {
      await this.client.connect();
    } catch (err: any) {
      if (this.onErrorCb) this.onErrorCb(err);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        throw err;
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.onErrorCb) {
        this.onErrorCb(new Error(`Twitch: Max reconnection attempts (${this.maxReconnectAttempts}) reached`));
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    setTimeout(() => {
      if (this.shouldReconnect && this.currentTarget) {
        this.connect(this.currentTarget).catch(() => {});
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.client = null;
    }
  }

  async reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    if (this.currentTarget) {
      await this.connect(this.currentTarget);
    }
  }

  onConnected(cb: () => void): void {
    this.onConnectedCb = cb;
  }

  onDisconnected(cb: () => void): void {
    this.onDisconnectedCb = cb;
  }

  onMessage(cb: (msg: ChatMessage) => void): void {
    this.onMessageCb = cb;
  }

  onError(cb: (err: Error) => void): void {
    this.onErrorCb = cb;
  }
}
