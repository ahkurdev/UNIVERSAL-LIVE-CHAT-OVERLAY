import Store from 'electron-store'
import { AppSettings, OverlayBounds } from '../shared/types'

interface StoreSchema {
  settings: AppSettings;
  overlayBounds: OverlayBounds;
}

export const store = new Store<StoreSchema>({
  defaults: {
    settings: {
      language: 'en',
      youtubeApiKey: '',
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
      soundEnabled: false,
      soundVolume: 80,
      notificationSound: 'default',
      ttsEnabled: false,
      ttsVoice: 'default',
      ttsVolume: 80,
      ttsRate: 1,
    },
    overlayBounds: {
      x: -1, // -1 means default center
      y: -1,
      width: 450,
      height: 700,
    }
  }
})
