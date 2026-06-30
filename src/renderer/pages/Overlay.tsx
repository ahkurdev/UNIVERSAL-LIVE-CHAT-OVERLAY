import { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { ChatMessage, AppSettings } from '@shared/types'
import { useSettingsStore } from '../store/settingsStore'
import { motion, AnimatePresence } from 'framer-motion'
import { soundService } from '../services/soundService'
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
  soundEnabled: false,
  soundVolume: 80,
  notificationSound: 'default',
  ttsEnabled: false,
  ttsVoice: 'default',
  ttsVolume: 80,
  ttsRate: 1,
};

export function Overlay() {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const { settings, init } = useSettingsStore();
  const currentSettings = { ...DEFAULT_SETTINGS, ...settings };

  // Refs for settings used in IPC callbacks (avoid stale closure)
  const soundRef = useRef({ enabled: currentSettings.soundEnabled, volume: currentSettings.soundVolume });
  const ttsRef = useRef({ enabled: currentSettings.ttsEnabled, voice: currentSettings.ttsVoice, rate: currentSettings.ttsRate, volume: currentSettings.ttsVolume });
  const fadeRef = useRef(currentSettings.chatFadeDuration);
  const maxRef = useRef(currentSettings.maxChats);
  soundRef.current = { enabled: currentSettings.soundEnabled, volume: currentSettings.soundVolume };
  ttsRef.current = { enabled: currentSettings.ttsEnabled, voice: currentSettings.ttsVoice, rate: currentSettings.ttsRate, volume: currentSettings.ttsVolume };
  fadeRef.current = currentSettings.chatFadeDuration;
  maxRef.current = currentSettings.maxChats;

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    init();
  }, []);

  useEffect(() => {
    console.log('[Overlay] Mounted, api:',
    // @ts-ignore
    typeof window.api !== 'undefined' ? 'yes' : 'no');
    // @ts-ignore
    if (!window.api) return;

    let prevLen = 0;
    // @ts-ignore
    window.api.onMessagesUpdate((allMessages: ChatMessage[]) => {
      if (!allMessages || allMessages.length === 0) return;
      // Sound & TTS for truly new messages
      const newMessages = allMessages.slice(prevLen);
      newMessages.forEach((msg) => {
        const s = soundRef.current;
        const t = ttsRef.current;
        const isEvent = msg.eventType && msg.eventType !== 'chat';
        if (isEvent && s.enabled) {
          soundService.playNotification(msg.eventType!, s.volume / 100);
        }
        if (t.enabled && msg.message) {
          soundService.speak(`${msg.username} says: ${msg.message}`, t.voice, t.rate, t.volume / 100);
        }
      });
      prevLen = allMessages.length;
      setDisplayMessages(allMessages);
    });

    // @ts-ignore
    window.api.onSettingsUpdate((newSettings: AppSettings) => {
      useSettingsStore.setState((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    });

    // Periodic cleanup of old messages (overlay only)
    const cleanup = setInterval(() => {
      setDisplayMessages((prev) => {
        if (prev.length <= (maxRef.current || 8)) return prev;
        const cutoff = Date.now() - (fadeRef.current || 12) * 1000;
        const filtered = prev.filter(m => m.timestamp > cutoff);
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

      {displayMessages.length === 0 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white/50 px-3 py-1 rounded-full text-xs font-bold border border-white/10 z-30 pointer-events-none">
          Overlay Active
        </div>
      )}

      <div
        className="absolute bottom-6 left-6 z-10"
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
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderLeftColor: msg.eventType === 'superchat' ? '#FFD700' :
                      msg.eventType === 'gift' ? '#FF69B4' :
                      msg.eventType === 'cheers' ? '#00BFFF' : meta.accentA,
                    boxShadow: msg.eventType && msg.eventType !== 'chat'
                      ? `0 0 20px ${msg.eventType === 'superchat' ? 'rgba(255,215,0,0.3)' :
                          msg.eventType === 'gift' ? 'rgba(255,105,180,0.3)' :
                          'rgba(0,191,255,0.3)'}`
                      : '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold mt-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${meta.accentA}, ${meta.accentB})`,
                      color: meta.darkText ? '#0c0c10' : '#fff',
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-bold tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md"
                        style={{
                          background: `linear-gradient(135deg, ${meta.accentA}, ${meta.accentB})`,
                          color: meta.darkText ? '#0c0c10' : '#fff',
                        }}
                      >
                        {meta.label}
                      </span>
                      {msg.eventType && msg.eventType !== 'chat' && (
                        <span className={`text-[10px] font-bold tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md ${
                          msg.eventType === 'superchat' ? 'bg-yellow-500/30 text-yellow-300' :
                          msg.eventType === 'gift' ? 'bg-pink-500/30 text-pink-300' :
                          msg.eventType === 'cheers' ? 'bg-blue-500/30 text-blue-300' :
                          'bg-green-500/30 text-green-300'
                        }`}>
                          {msg.eventType === 'superchat' ? '⭐ Superchat' :
                           msg.eventType === 'gift' ? '🎁 Gift' :
                           msg.eventType === 'cheers' ? '🎉 Cheers' : '💎'}
                        </span>
                      )}
                      <span className="text-sm font-bold text-[#F5F5F7] truncate max-w-[200px]">
                        {msg.username}
                      </span>
                    </div>
                    <div className="text-[13.5px] text-[#EDEDF0] leading-snug mt-1 break-words">
                      {msg.message}
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

