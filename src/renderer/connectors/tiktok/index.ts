import { ChatConnector, ChatMessage } from '@shared/types';

export class TikTokConnector implements ChatConnector {
  private onMessageCb?: (msg: ChatMessage) => void;
  private onConnectedCb?: () => void;
  private onDisconnectedCb?: () => void;
  private onErrorCb?: (err: Error) => void;
  private currentTarget = '';

  async connect(target: string): Promise<void> {
    this.currentTarget = target.replace('@', '').trim();
    // @ts-ignore
    if (!window.api) return;

    // Listen for status/messages from main process
    // @ts-ignore
    window.api.onTikTokStatus((status: string, errorMsg: string) => {
      if (status === 'connected') this.onConnectedCb?.();
      else if (status === 'error') this.onErrorCb?.(new Error(errorMsg || 'Connection failed'));
      else if (status === 'idle') this.onDisconnectedCb?.();
    });

    // @ts-ignore
    window.api.onTikTokMessage((msg: ChatMessage) => {
      this.onMessageCb?.(msg);
    });

    // @ts-ignore
    window.api.tikTokConnect(this.currentTarget);
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    // @ts-ignore
    if (window.api) window.api.tikTokDisconnect();
    this.onDisconnectedCb?.();
    return Promise.resolve();
  }

  async reconnect(): Promise<void> {
    if (this.currentTarget) await this.connect(this.currentTarget);
  }

  onConnected(cb: () => void): void { this.onConnectedCb = cb; }
  onDisconnected(cb: () => void): void { this.onDisconnectedCb = cb; }
  onMessage(cb: (msg: ChatMessage) => void): void { this.onMessageCb = cb; }
  onError(cb: (err: Error) => void): void { this.onErrorCb = cb; }
}