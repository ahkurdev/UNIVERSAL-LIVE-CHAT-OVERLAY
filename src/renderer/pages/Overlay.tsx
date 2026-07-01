import { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { ChatMessage, AppSettings } from '@shared/types'
import { useSettingsStore } from '../store/settingsStore'
import { motion, AnimatePresence } from 'framer-motion'
import '../index.css'

const PLATFORM_META: Record<string, { label: string; icon: string; accentA: string; accentB: string; darkText: boolean }> = {
  tiktok: { label: 'TikTok', icon: '♪', accentA: '#FE2C55', accentB: '#25F4EE', darkText: false },
  youtube: { label: 'YouTube', icon: '▶', accentA: '#FF0033', accentB: '#FF0033', darkText: false },
  twitch: { label: 'Twitch', icon: '◆', accentA: '#9146FF', accentB: '#9146FF', darkText: false },
  kick: { label: 'Kick', icon: 'K', accentA: '#53FC18', accentB: '#53FC18', darkText: true },
};

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  youtubeApiKey: '',
  youtubeMode: 'scrape',
  savedChannels: {},
  streamMode: false,
  isLocked: false,
  opacity: 100,
  scale: 1,
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
};

export function Overlay() {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const { settings, init } = useSettingsStore();
  const [hidden, setHidden] = useState(false);
  const currentSettings = { ...DEFAULT_SETTINGS, ...settings };

  // Refs for settings used in IPC callbacks (avoid stale closure)
  const fadeRef = useRef(currentSettings.chatFadeDuration);
  const maxRef = useRef(currentSettings.maxChats);
  fadeRef.current = currentSettings.chatFadeDuration;
  maxRef.current = currentSettings.maxChats;

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    init();

    // @ts-ignore
    if (!window.electron?.ipcRenderer) {
      console.error('[Overlay] No electron IPC available');
      return;
    }

    // Direct IPC listener (bypasses preload abstraction for reliability)
    // @ts-ignore
    window.electron.ipcRenderer.on('messages-update', (_event: any, allMessages: ChatMessage[]) => {
      console.log('[Overlay] messages received:', allMessages?.length);
      if (!allMessages || allMessages.length === 0) return;
      setDisplayMessages(allMessages);
    });

    // @ts-ignore
    window.electron.ipcRenderer.on('settings-update', (_event: any, newSettings: AppSettings) => {
      useSettingsStore.setState((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    });

    // Periodic cleanup of old messages (overlay only)
    // Special events (superchat/gift/cheers) stay 3x longer
    const cleanup = setInterval(() => {
      setDisplayMessages((prev) => {
        if (prev.length <= (maxRef.current || 8)) return prev;
        const now = Date.now();
        const fadeMs = (fadeRef.current || 12) * 1000;
        const filtered = prev.filter(m => {
          const isSpecial = m.eventType && m.eventType !== 'chat';
          const timeout = isSpecial ? fadeMs * 3 : fadeMs;
          return m.timestamp > now - timeout;
        });
        return filtered.length >= (maxRef.current || 8) ? filtered : prev;
      });
    }, 3000);

    return () => {
      clearInterval(cleanup);
    };
  }, []);

  useLayoutEffect(() => {
    // @ts-ignore
    if (window.api) {
      // @ts-ignore
      window.api.setIgnoreMouseEvents(settings.isLocked);
    }
  }, [settings.isLocked]);

  // Hotkey: F9 toggle stream mode (hide/show overlay)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setHidden(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const getMeta = (platform: string) => {
    return PLATFORM_META[platform] || { label: platform, icon: '•', accentA: '#666', accentB: '#666', darkText: false };
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {settings.isLocked && <div className="absolute inset-0 z-50" />}

      <div
        className={`absolute inset-0 z-40 transition-all duration-300 ${
          settings.isLocked ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
        }`}
        style={{
          WebkitAppRegion: 'drag',
          background: 'rgba(0,0,0,0.4)',
          border: '2px solid #4f46e5',
          boxShadow: 'inset 0 0 50px rgba(79,70,229,0.3)',
        } as React.CSSProperties}
      />

      {!settings.isLocked && (
        <>
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-indigo-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 border border-indigo-400/50 text-sm tracking-wide">
              <span className="text-lg">✥</span> Drag to Move &bull; Corners to Resize
            </div>
          </div>
          <div className="absolute top-0 left-0 w-4 h-4 bg-indigo-500 cursor-nwse-resize -mt-2 -ml-2 rounded-sm z-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}/>
          <div className="absolute top-0 right-0 w-4 h-4 bg-indigo-500 cursor-nesw-resize -mt-2 -mr-2 rounded-sm z-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}/>
          <div className="absolute bottom-0 left-0 w-4 h-4 bg-indigo-500 cursor-nesw-resize -mb-2 -ml-2 rounded-sm z-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}/>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 cursor-nwse-resize -mb-2 -mr-2 rounded-sm z-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}/>
        </>
      )}

      {displayMessages.length === 0 && !hidden && (
        <div className="absolute top-4 right-4 bg-black/50 text-white/50 px-3 py-1 rounded-full text-xs font-bold border border-white/10 z-30 pointer-events-none">
          Overlay Active
        </div>
      )}

      {/* Stream mode / hidden indicator */}
      {hidden && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="bg-black/60 text-gray-500 px-4 py-2 rounded-full text-xs font-bold border border-gray-700/30">
            🔴 Stream Mode — Press F9 to show
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-6 left-6 z-10 transition-all duration-300 ${hidden ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{
          opacity: currentSettings.opacity / 100,
          transform: `scale(${currentSettings.scale})`,
          transformOrigin: 'bottom left',
        }}
      >
        <div className="w-[420px] max-h-[78vh] flex flex-col justify-end gap-2 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {displayMessages.slice(-currentSettings.maxChats).map((msg) => {
              const meta = getMeta(msg.platform);
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95, transition: { duration: 0.25, ease: 'easeIn' } }}
                  transition={{ type: 'spring', stiffness: 400, damping: 26, mass: 0.8 }}
                  className={`flex items-start gap-3 rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-l-[4px] ${
                    msg.eventType === 'superchat' ? 'bg-gradient-to-r from-[rgba(255,200,0,0.2)] to-[rgba(12,12,16,0.65)]' :
                    msg.eventType === 'gift' ? 'bg-gradient-to-r from-[rgba(255,0,150,0.2)] to-[rgba(12,12,16,0.65)]' :
                    msg.eventType === 'cheers' ? 'bg-gradient-to-r from-[rgba(0,150,255,0.2)] to-[rgba(12,12,16,0.65)]' :
                    'bg-[rgba(12,12,16,0.65)]'
                  }`}
                  style={{
                    backdropFilter: `blur(${currentSettings.messageBlur || 8}px)`,
                    WebkitBackdropFilter: `blur(${currentSettings.messageBlur || 8}px)`,
                    borderLeftColor: msg.eventType === 'superchat' ? '#FFD700' :
                      msg.eventType === 'gift' ? '#FF69B4' :
                      msg.eventType === 'cheers' ? '#00BFFF' : meta.accentA,
                    background: msg.eventType === 'superchat' ? `linear-gradient(to right, rgba(255,200,0,0.2), rgba(12,12,16,${(currentSettings.messageBgOpacity || 55)/100}))` :
                      msg.eventType === 'gift' ? `linear-gradient(to right, rgba(255,0,150,0.2), rgba(12,12,16,${(currentSettings.messageBgOpacity || 55)/100}))` :
                      msg.eventType === 'cheers' ? `linear-gradient(to right, rgba(0,150,255,0.2), rgba(12,12,16,${(currentSettings.messageBgOpacity || 55)/100}))` :
                      `rgba(12,12,16,${(currentSettings.messageBgOpacity || 55)/100})`,
                    borderRadius: `${currentSettings.messageRounding || 12}px`,
                    boxShadow: msg.eventType && msg.eventType !== 'chat'
                      ? `0 0 20px ${msg.eventType === 'superchat' ? 'rgba(255,215,0,0.3)' :
                          msg.eventType === 'gift' ? 'rgba(255,105,180,0.3)' :
                          'rgba(0,191,255,0.3)'}`
                      : '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                  >
                  {currentSettings.showAvatar !== false && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold mt-0.5 overflow-hidden"
                    style={msg.avatar ? {} : {
                      background: `linear-gradient(135deg, ${meta.accentA}, ${meta.accentB})`,
                      color: meta.darkText ? '#0c0c10' : '#fff',
                    }}
                  >
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      meta.icon
                    )}
                  </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentSettings.showPlatformTag !== false && (
                      <span
                        className="text-[10px] font-bold tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md"
                        style={{
                          background: `linear-gradient(135deg, ${meta.accentA}, ${meta.accentB})`,
                          color: meta.darkText ? '#0c0c10' : '#fff',
                        }}
                      >
                        {meta.label}
                      </span>
                      )}
                      {msg.eventType && msg.eventType !== 'chat' && (
                        <span className={`text-[10px] font-bold tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md ${
                          msg.eventType === 'superchat' ? 'bg-yellow-500/30 text-yellow-300' :
                          msg.eventType === 'gift' ? 'bg-pink-500/30 text-pink-300' :
                          msg.eventType === 'cheers' ? 'bg-blue-500/30 text-blue-300' :
                          'bg-green-500/30 text-green-300'
                        }`}>
                          {msg.eventType === 'superchat' ? '⭐ Superchat' :
                           msg.eventType === 'gift' && msg.extra?.eventName === 'member' ? '🎉 Member' :
                           msg.eventType === 'gift' && msg.extra?.eventName === 'follow' ? '➕ Follow' :
                           msg.eventType === 'gift' && msg.extra?.eventName === 'share' ? '🔄 Share' :
                           msg.eventType === 'gift' && msg.extra?.eventName === 'like' ? '❤️ Like' :
                           msg.eventType === 'gift' && msg.extra?.eventName === 'roomUser' ? '👋 Join' :
                           msg.eventType === 'gift' ? '🎁 Gift' :
                           msg.eventType === 'cheers' ? '🎉 Cheers' : '💎'}
                        </span>
                      )}
                      <span className="text-sm font-bold text-[#F5F5F7] truncate max-w-[200px]">
                        {msg.username}
                      </span>
                      {/* TikTok badges */}
                      {msg.platform === 'tiktok' && msg.badges?.length > 0 && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-white/10 text-gray-300 truncate max-w-[80px]">
                          {msg.badges.slice(0, 2).join(', ')}
                        </span>
                      )}
                      {msg.platform === 'tiktok' && msg.extra?.level > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FE2C55]/40 to-[#25F4EE]/40 text-white">
                          Lv.{msg.extra!.level}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: `${currentSettings.fontSize || 13.5}px` }} className="text-[#EDEDF0] leading-snug mt-1 break-words">
                      {msg.message}
                      {/* TikTok gift details */}
                      {msg.platform === 'tiktok' && msg.extra?.giftName && (
                        <span className="ml-1 text-pink-300 font-semibold">
                          {msg.extra.giftCount > 1 && `${msg.extra.giftCount}x `}
                          {msg.extra.giftName}
                          {msg.extra.diamondCount > 0 && ` 💎${msg.extra.diamondCount}`}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

