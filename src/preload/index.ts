import { contextBridge, ipcRenderer } from 'electron'
import { AppSettings, ChatMessage, OverlayBounds } from '../shared/types'

const api = {
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  updateOverlayBounds: (bounds: OverlayBounds) => ipcRenderer.send('save-overlay-bounds', bounds),
  broadcastMessages: (messages: ChatMessage[]) => ipcRenderer.send('messages-update', messages),
  sendSettingsUpdate: (settings: AppSettings) => ipcRenderer.send('send-settings-update', settings),
  sendOverlayBoundsUpdate: (bounds: OverlayBounds) => ipcRenderer.send('send-overlay-bounds-update', bounds),
  onMessagesUpdate: (callback: (messages: ChatMessage[]) => void) => {
    ipcRenderer.removeAllListeners('messages-update');
    ipcRenderer.on('messages-update', (_event, messages) => callback(messages))
  },
  onSettingsUpdate: (callback: (settings: AppSettings) => void) => {
    ipcRenderer.removeAllListeners('settings-update');
    ipcRenderer.on('settings-update', (_event, settings) => callback(settings))
  },
  onOverlayBoundsUpdate: (callback: (bounds: OverlayBounds) => void) => {
    ipcRenderer.removeAllListeners('overlay-bounds-update');
    ipcRenderer.on('overlay-bounds-update', (_event, bounds) => callback(bounds))
  },
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: any) => ipcRenderer.send('store-set', key, value),
  onStoreChange: (key: string, callback: (key: string, value: any) => void) => {
    ipcRenderer.removeAllListeners('store-on-change');
    ipcRenderer.on('store-on-change', (_event, changedKey, value) => {
      if (changedKey === key) {
        callback(changedKey, value)
      }
    })
  },
  // TikTok IPC (main process connector)
  tikTokConnect: (username: string) => ipcRenderer.send('tiktok-connect', username),
  tikTokDisconnect: () => ipcRenderer.send('tiktok-disconnect'),
  onTikTokStatus: (callback: (status: string, errorMsg: string) => void) => {
    ipcRenderer.removeAllListeners('tiktok-status');
    ipcRenderer.on('tiktok-status', (_event, status, errorMsg) => callback(status, errorMsg))
  },
  onTikTokMessage: (callback: (msg: any) => void) => {
    ipcRenderer.removeAllListeners('tiktok-message');
    ipcRenderer.on('tiktok-message', (_event, msg) => callback(msg))
  },
  // YouTube IPC (main process connector)
  youTubeConnect: (target: string) => ipcRenderer.send('youtube-connect', target),
  youTubeDisconnect: () => ipcRenderer.send('youtube-disconnect'),
  onYouTubeStatus: (callback: (status: string, errorMsg: string) => void) => {
    ipcRenderer.removeAllListeners('youtube-status');
    ipcRenderer.on('youtube-status', (_event, status, errorMsg) => callback(status, errorMsg))
  },
  onYouTubeMessage: (callback: (msg: any) => void) => {
    ipcRenderer.removeAllListeners('youtube-message');
    ipcRenderer.on('youtube-message', (_event, msg) => callback(msg))
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: (channel: string, data: any) => ipcRenderer.send(channel, data),
        on: (channel: string, func: (...args: any[]) => void) => {
          ipcRenderer.on(channel, (_event, ...args) => func(...args))
        }
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = { ipcRenderer }
  // @ts-ignore
  window.api = api
}
