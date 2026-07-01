export interface ChatMessage {
  id: string;
  platform: "youtube" | "tiktok" | "twitch" | "kick";
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
  badges: string[];
  color: string;
  isModerator: boolean;
  isSubscriber: boolean;
  isVerified: boolean;
  eventType?: "chat" | "gift" | "donation" | "superchat" | "cheers";
  extra?: Record<string, any>;
}

export interface ChatConnector {
  connect(target: string): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  onConnected(cb: () => void): void;
  onDisconnected(cb: () => void): void;
  onMessage(cb: (msg: ChatMessage) => void): void;
  onError(cb: (err: Error) => void): void;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface AppSettings {
  // General
  language: string;
  youtubeMode: 'scrape' | 'apikey';
  youtubeApiKey: string;
  savedChannels: Record<string, string>;
  streamMode: boolean; // { twitch: 'channel', youtube: 'url', tiktok: '@user', kick: 'slug' }
  
  // Overlay
  isLocked: boolean;
  opacity: number;
  scale: number;
  maxChats: number;
  chatFadeDuration: number;
  chatAlign: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  chatWidth: number;
  
  // Appearance
  messageBgOpacity: number;
  messageBlur: number;
  messageRounding: number;
  showPlatformIcon: boolean;
  showPlatformTag: boolean;
  showAvatar: boolean;
  fontSize: number;
  
  // Chat
  maxMessages: number;
  dashboardMaxMessages: number;
  hideMessagesAfter: number;
  duplicateFilter: boolean;
  duplicateFilterWindow: number;
  
  // Sound
  soundEnabled: boolean;
  soundVolume: number;
  notificationSound: string;
  
  // TTS
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsVolume: number;
  ttsRate: number;
}

export interface OverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
