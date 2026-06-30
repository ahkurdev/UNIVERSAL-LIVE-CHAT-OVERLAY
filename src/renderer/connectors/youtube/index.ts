import { ChatConnector, ChatMessage } from '@shared/types';

export class YouTubeConnector implements ChatConnector {
  private onMessageCb?: (msg: ChatMessage) => void;
  private onConnectedCb?: () => void;
  private onDisconnectedCb?: () => void;
  private onErrorCb?: (err: Error) => void;
  private currentTarget = '';

  async connect(target: string): Promise<void> {
    this.currentTarget = target.trim();
    // @ts-ignore
    if (!window.api) return;

    // @ts-ignore
    window.api.onYouTubeStatus((status: string, errorMsg: string) => {
      if (status === 'connected') this.onConnectedCb?.();
      else if (status === 'error') this.onErrorCb?.(new Error(errorMsg || 'Connection failed'));
      else if (status === 'idle') this.onDisconnectedCb?.();
    });

    // @ts-ignore
    window.api.onYouTubeMessage((msg: ChatMessage) => {
      this.onMessageCb?.(msg);
    });

    // @ts-ignore
    window.api.youTubeConnect(this.currentTarget);
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    // @ts-ignore
    if (window.api) window.api.youTubeDisconnect();
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