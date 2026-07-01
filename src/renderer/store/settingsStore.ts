import { create } from 'zustand'
import { AppSettings, OverlayBounds } from '@shared/types'

// Define the shape of the store
interface SettingsStore {
  settings: AppSettings;
  overlayBounds: OverlayBounds;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setOverlayBounds: (bounds: OverlayBounds) => void;
  init: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    language: 'en',
    youtubeApiKey: '',
  youtubeMode: 'scrape',
    savedChannels: {},
  streamMode: false,
    isLocked: true,
    opacity: 100,
    scale: 1.0,
    maxChats: 8,
    chatFadeDuration: 12,
    chatAlign: 'bottom-left',
    chatWidth: 420,
    messageBgOpacity: 55,
    messageBlur: 8,
    messageRounding: 12,
    showPlatformIcon: true,
    showPlatformTag: true,
    showAvatar: true,
    fontSize: 13.5,
    maxMessages: 200,
    hideMessagesAfter: 12,
    duplicateFilter: true,
    duplicateFilterWindow: 3,
    dashboardMaxMessages: 100,
    soundEnabled: false,
    soundVolume: 80,
    notificationSound: 'default',
    ttsEnabled: false,
    ttsVoice: 'default',
    ttsVolume: 80,
    ttsRate: 1,
  },
  overlayBounds: {
    x: 0,
    y: 0,
    width: 420,
    height: 600,
  },
  setSetting: (key, value) => {
    set((state) => {
      const newSettings = { ...state.settings, [key]: value };
      // @ts-ignore
      if (window.api) {
        // @ts-ignore
        window.api.storeSet('settings', newSettings);
        // @ts-ignore
        window.api.sendSettingsUpdate(newSettings);
      }
      return { settings: newSettings };
    });
  },
  setOverlayBounds: (bounds) => {
    set(() => {
      // @ts-ignore
      if (window.api) {
        // @ts-ignore
        window.api.storeSet('overlayBounds', bounds);
        // @ts-ignore
        window.api.sendOverlayBoundsUpdate(bounds);
      }
      return { overlayBounds: bounds };
    });
  },
  init: async () => {
    // @ts-ignore
    if (window.api) {
      // @ts-ignore
      const loadedSettings = await window.api.storeGet('settings');
      // @ts-ignore
      const loadedOverlayBounds = await window.api.storeGet('overlayBounds');

      set((state) => ({
        settings: { ...state.settings, ...loadedSettings },
        overlayBounds: { ...state.overlayBounds, ...loadedOverlayBounds },
      }));
      // @ts-ignore
      if (loadedSettings && window.api.setIgnoreMouseEvents) {
        // @ts-ignore
        window.api.setIgnoreMouseEvents(loadedSettings.isLocked);
      }

      // @ts-ignore
      if (window.api.onStoreChange) {
        // @ts-ignore
        window.api.onStoreChange('settings', (key, value) => {
          if (key === 'settings') {
            set((state) => ({ settings: { ...state.settings, ...value } }));
          } else if (key === 'overlayBounds') {
            set((state) => ({ overlayBounds: { ...state.overlayBounds, ...value } }));
          }
        });
      }
    }
  }
}))
