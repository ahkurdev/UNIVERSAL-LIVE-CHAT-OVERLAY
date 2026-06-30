import { create } from 'zustand'
import { ChatMessage, ConnectionStatus } from '@shared/types'

interface ConnectionState {
  status: ConnectionStatus;
  target: string;
}

interface ChatStore {
  connections: Record<string, ConnectionState>;
  messages: ChatMessage[];
  maxMessages: number;
  
  setConnectionStatus: (platform: string, status: ConnectionStatus, target?: string) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  connections: {
    mock: { status: 'idle', target: '' },
    twitch: { status: 'idle', target: '' },
    youtube: { status: 'idle', target: '' },
    tiktok: { status: 'idle', target: '' },
    kick: { status: 'idle', target: '' }
  },
  messages: [],
  maxMessages: 200,
  
  setConnectionStatus: (platform, status, target = '') => set((state) => ({
    connections: {
      ...state.connections,
      [platform]: { status, target }
    }
  })),
  
  addMessage: (msg) => {
    set((state) => {
      const newMessages = [...state.messages, msg];
      // Keep max messages in store to avoid memory leak
      if (newMessages.length > state.maxMessages) {
        newMessages.shift();
      }
      
      // Broadcast only to overlay window (not self)
      // @ts-ignore
      if (window.api) {
        // @ts-ignore
        window.api.broadcastMessages(newMessages);
      }
      
      return { messages: newMessages };
    });
  },
  
  clearMessages: () => set({ messages: [] })
}))
