import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { AppSettings, OverlayBounds, ChatMessage } from '../shared/types';
import ElectronStore from 'electron-store';
import {
  tiktokConnect, tiktokDisconnect,
  tiktokOnMessage, tiktokOnConnected, tiktokOnDisconnected, tiktokOnError
} from './connectors/tiktok';
import {
  youtubeConnect, youtubeDisconnect, youtubeSetWindows
} from './connectors/youtube';
import {
  obsServerStart, obsServerStop, obsServerBroadcastMessages,
  obsServerSetStatusCb, obsServerIsRunning, obsServerGetPort
} from './obs-server';

// --- Low-RAM & Low-CPU Optimization Switches ---
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

let dashboardWindow: BrowserWindow | null;
let overlayWindow: BrowserWindow | null;

// Initialize Electron Store
const store = new ElectronStore({
  name: 'user-settings',
  defaults: {
    settings: {
      language: 'en',
      youtubeApiKey: '',
  youtubeMode: 'scrape',
      savedChannels: {},
  streamMode: false,
      isLocked: false,
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
    floodProtection: true,
    floodMaxPerSecond: 5,
    blacklistWords: "",
    hideLinks: false,
    hideAllCaps: false,
    hideBots: false,
    dashboardMaxMessages: 100,
      soundEnabled: false,
      soundVolume: 80,
      notificationSound: 'default',
    obsServerEnabled: false,
    obsServerPort: 3000,
      ttsEnabled: false,
      ttsVoice: 'default',
      ttsVolume: 80,
      ttsRate: 1,
    } as AppSettings,
    overlayBounds: {
      x: 50,
      y: 50,
      width: 420,
      height: 600,
    } as OverlayBounds,
  },
});

function createDashboardWindow(): void {
  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  dashboardWindow.on('ready-to-show', () => {
    dashboardWindow?.show();
  });

  dashboardWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    dashboardWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    dashboardWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function createOverlayWindow(): void {
  const storedBounds = store.get('overlayBounds') as OverlayBounds;
  const storedSettings = store.get('settings') as AppSettings;

    overlayWindow = new BrowserWindow({
      x: storedBounds.x,
      y: storedBounds.y,
      width: storedBounds.width,
      height: storedBounds.height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      movable: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
        backgroundThrottling: false,
      },
    });

    // Force highest alwaysOnTop level for fullscreen compatibility
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  overlayWindow.on('ready-to-show', () => {
    overlayWindow?.show();
    // Initial state: ignore mouse events if locked
    overlayWindow?.setIgnoreMouseEvents(storedSettings.isLocked, { forward: true });
  });

  // Handle window move/resize events to save bounds
  overlayWindow.on('move', () => {
    if (overlayWindow) {
      const currentSettings = store.get('settings') as AppSettings;
      if (!currentSettings.isLocked) { // Only save if not locked
        const [x, y] = overlayWindow.getPosition();
        const [width, height] = overlayWindow.getSize();
        const newBounds: OverlayBounds = { x, y, width, height };
        store.set('overlayBounds', newBounds);
        // Inform renderer about bounds update (for internal consistency)
        overlayWindow?.webContents.send('overlay-bounds-update', newBounds);
      }
    }
  });

  overlayWindow.on('resize', () => {
    if (overlayWindow) {
      const currentSettings = store.get('settings') as AppSettings;
      if (!currentSettings.isLocked) { // Only save if not locked
        const [x, y] = overlayWindow.getPosition();
        const [width, height] = overlayWindow.getSize();
        const newBounds: OverlayBounds = { x, y, width, height };
        store.set('overlayBounds', newBounds);
        // Inform renderer about bounds update
        overlayWindow?.webContents.send('overlay-bounds-update', newBounds);
      }
    }
  });


  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`);
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createDashboardWindow();
  createOverlayWindow();

  // Set window references for main-process connectors
  youtubeSetWindows(dashboardWindow);

  // Start OBS Browser Source server if enabled
  const settings = store.get('settings') as any;
  if (settings?.obsServerEnabled) {
    obsServerStart(settings?.obsServerPort || 3000, '');
  }

  obsServerSetStatusCb((status, url) => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('obs-server-status', status, url);
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDashboardWindow();
      createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

// IPC to get a value from the store
ipcMain.handle('store-get', async (_event, key) => {
  return store.get(key);
});

// IPC to set a value in the store
ipcMain.on('store-set', (_event, key, value) => {
  store.set(key, value);
  // Also notify all windows that settings have changed
  dashboardWindow?.webContents.send('store-on-change', key, value);
  overlayWindow?.webContents.send('store-on-change', key, value);
});

// IPC to set ignore mouse events for overlay window
ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean) => {
  overlayWindow?.setIgnoreMouseEvents(ignore, { forward: true });
});

// IPC to send chat messages to overlay
ipcMain.on('messages-update', (_event, messages: ChatMessage[]) => {
  if (overlayWindow && !overlayWindow.isDestroyed())
    overlayWindow.webContents.send('messages-update', messages);
  // Also broadcast to OBS Browser Source clients
  obsServerBroadcastMessages(messages.slice(-50)); // Last 50 messages
});

// IPC to send settings update to overlay
ipcMain.on('send-settings-update', (_event, settings: AppSettings) => {
  // Update overlay window mouse events based on new lock setting
  overlayWindow?.setIgnoreMouseEvents(settings.isLocked, { forward: true });
  overlayWindow?.webContents.send('settings-update', settings);
});

// IPC to send overlay bounds update to overlay
ipcMain.on('send-overlay-bounds-update', (_event, bounds: OverlayBounds) => {
  if (overlayWindow) {
    overlayWindow.setBounds(bounds);
    overlayWindow.webContents.send('overlay-bounds-update', bounds);
  }
});

// IPC from renderer to trigger a manual bounds save (e.g. after user dragging/resizing finishes)
ipcMain.on('save-overlay-bounds', (_event, bounds: OverlayBounds) => {
  store.set('overlayBounds', bounds);
});

// --- TikTok IPC ---

tiktokOnConnected(() => {
  if (dashboardWindow && !dashboardWindow.isDestroyed())
    dashboardWindow.webContents.send('tiktok-status', 'connected', '');
});

tiktokOnDisconnected(() => {
  if (dashboardWindow && !dashboardWindow.isDestroyed())
    dashboardWindow.webContents.send('tiktok-status', 'idle', '');
});

tiktokOnError((err) => {
  if (dashboardWindow && !dashboardWindow.isDestroyed())
    dashboardWindow.webContents.send('tiktok-status', 'error', err.message);
});

tiktokOnMessage((msg) => {
  if (dashboardWindow && !dashboardWindow.isDestroyed())
    dashboardWindow.webContents.send('tiktok-message', msg);
  if (overlayWindow && !overlayWindow.isDestroyed())
    overlayWindow.webContents.send('tiktok-message', msg);
});

ipcMain.on('tiktok-connect', async (_event, username: string) => {
  dashboardWindow?.webContents.send('tiktok-status', 'connecting', '');
  try {
    await tiktokConnect(username);
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || 'Failed to connect';
    dashboardWindow?.webContents.send('tiktok-status', 'error', msg);
  }
});

ipcMain.on('tiktok-disconnect', () => {
  tiktokDisconnect();
});

// --- YouTube IPC ---

ipcMain.on('youtube-connect', async (_event, target: string) => {
  try {
    await youtubeConnect(target);
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || 'Failed to connect';
    if (dashboardWindow && !dashboardWindow.isDestroyed())
      dashboardWindow.webContents.send('youtube-status', 'error', msg);
  }
});

ipcMain.on('youtube-disconnect', () => {
  youtubeDisconnect();
});

// --- OBS Browser Source IPC ---

ipcMain.on('obs-server-start', (_event, serverPort: number) => {
  // Serve obs-overlay.html inline (embedded in server)
  obsServerStart(serverPort || 3000, '');
});

ipcMain.on('obs-server-stop', () => {
  obsServerStop();
});

ipcMain.on('obs-server-status-request', (_event) => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    const status = obsServerIsRunning() ? 'running' : 'stopped';
    const url = obsServerIsRunning() ? `http://localhost:${obsServerGetPort()}` : '';
    dashboardWindow.webContents.send('obs-server-status', status, url);
  }
});

