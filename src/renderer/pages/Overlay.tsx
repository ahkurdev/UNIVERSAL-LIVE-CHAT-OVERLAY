import { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { ChatMessage, AppSettings, OverlayTemplate } from '@shared/types'
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
  overlayTemplate: 'indofinity' as OverlayTemplate,
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
    window.electron.ipcRenderer.on('messages-update', (allMessages: ChatMessage[]) => {
      console.log('[Overlay] messages received:', allMessages?.length);
      if (!allMessages || allMessages.length === 0) return;
      setDisplayMessages(allMessages);
    });

    // @ts-ignore
    window.electron.ipcRenderer.on('settings-update', (newSettings: AppSettings) => {
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

  // ===== 5 overlay templates =====
  const renderMessage = (msg: ChatMessage) => {
    const meta = getMeta(msg.platform);
    const tpl: OverlayTemplate = currentSettings.overlayTemplate || 'indofinity';
    const key = msg.id;
    const eventLabel = msg.eventType && msg.eventType !== 'chat'
      ? (msg.eventType === 'superchat' ? '⭐ Superchat' : msg.eventType === 'gift' ? '🎁 Gift' : '🎉 ' + msg.eventType)
      : '';
    const motionProps = {
      key,
      layout: true,
      initial: { opacity: 0, x: -30, scale: 0.95 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: 30, scale: 0.95, transition: { duration: 0.25, ease: 'easeIn' } },
      transition: { type: 'spring', stiffness: 400, damping: 26, mass: 0.8 },
    } as const;

    const avatar = (size: string, rounded: string) => (
      msg.avatar ? (
        <img src={msg.avatar} alt="" className={`${size} ${rounded} object-cover shrink-0`} />
      ) : (
        <div className={`${size} ${rounded} shrink-0 flex items-center justify-center text-xs font-bold`}
          style={{ background: tpl === 'bubble' ? accent : `linear-gradient(135deg, ${meta.accentA}, ${meta.accentB})`, color: meta.darkText ? '#0c0c10' : '#fff' }}>
          {(msg.username || '?').charAt(0).toUpperCase()}
        </div>
      )
    );
    const accent = meta.accentA;
    const bg = (currentSettings.messageBgOpacity || 55) / 100;
    const platformTag = (textColor: string) => currentSettings.showPlatformTag !== false && (
      <span className="text-[10px] font-bold tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md"
        style={{ background: `linear-gradient(135deg, ${meta.accentA}, ${meta.accentB})`, color: textColor }}>
        {meta.label}
      </span>
    );
    const eventBadge = (cls: string) => eventLabel && (
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${cls}`}>{eventLabel}</span>
    );
    const body = (nameColor: string, textColor: string) => (
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {platformTag(meta.darkText ? '#0c0c10' : '#fff')}
          {eventBadge('')}
          <span className="font-bold truncate max-w-[200px]" style={{ color: nameColor }}>{msg.username}</span>
        </div>
        <div style={{ fontSize: `${currentSettings.fontSize || 13.5}px`, color: textColor }} className="leading-snug mt-1 break-words">
          {msg.message}
          {msg.platform === 'tiktok' && msg.extra?.giftName && (
            <span className="ml-1 font-semibold" style={{ color: '#FF69B4' }}>
              {msg.extra.giftCount > 1 && `${msg.extra.giftCount}x `}{msg.extra.giftName}
              {msg.extra.diamondCount > 0 && ` 💎${msg.extra.diamondCount}`}
            </span>
          )}
        </div>
      </div>
    );

    if (tpl === 'minimal') {
      // Minimalis: bar gelap polos tanpa avatar
      return (
        <motion.div {...motionProps}
          className="flex items-center gap-3 px-4 py-2"
          style={{ background: `rgba(10,10,14,${Math.max(bg, 0.5)})`, borderRadius: '8px' }}>
          <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: accent }} />
          {body('#EDEDF0', '#D8D8DE')}
        </motion.div>
      );
    }
    if (tpl === 'neon') {
      // Neon Glow: border glow warna platform, cyber
      return (
        <motion.div {...motionProps}
          className="flex items-start gap-3 p-3"
          style={{
            background: `rgba(8,8,16,${Math.max(bg, 0.6)})`,
            borderRadius: '10px',
            border: `1px solid ${accent}`,
            boxShadow: `0 0 12px ${accent}66, inset 0 0 8px ${accent}22`,
          }}>
          {currentSettings.showAvatar !== false && avatar('w-7 h-7', 'rounded-md')}
          {body(accent, '#E8E8F5')}
        </motion.div>
      );
    }
    if (tpl === 'bubble') {
      // Bubble: putih rounded, teks gelap, friendly
      return (
        <motion.div {...motionProps}
          className="flex items-start gap-3 p-3 bg-white"
          style={{ borderRadius: `${Math.max(currentSettings.messageRounding || 12, 16)}px`, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {currentSettings.showAvatar !== false && avatar('w-8 h-8', 'rounded-full')}
          {body(accent, '#1a1a1a')}
        </motion.div>
      );
    }
    if (tpl === 'game') {
      // Klasik Game: kotak tegas, border tebal, bold
      return (
        <motion.div {...motionProps}
          className="flex items-start gap-3 p-2.5"
          style={{
            background: `rgba(20,16,10,${Math.max(bg, 0.7)})`,
            borderRadius: '4px',
            border: `2px solid ${accent}`,
            borderLeft: `8px solid ${accent}`,
          }}>
          {currentSettings.showAvatar !== false && avatar('w-8 h-8', 'rounded-sm')}
          {body('#FFE9B8', '#F5E9D0')}
        </motion.div>
      );
    }
    // indofinity (default): kartu oranye hangat ala IndoFinity
    const isSpecial = msg.eventType && msg.eventType !== 'chat';
    return (
      <motion.div {...motionProps}
        className="flex items-start gap-3 p-3"
        style={{
          background: isSpecial
            ? `linear-gradient(to right, rgba(255,107,0,0.25), rgba(26,18,8,${bg}))`
            : `rgba(26,18,8,${bg})`,
          borderRadius: '14px',
          borderLeft: `4px solid #FF6B00`,
          boxShadow: isSpecial ? '0 0 18px rgba(255,107,0,0.35)' : '0 4px 20px rgba(0,0,0,0.4)',
          backdropFilter: `blur(${currentSettings.messageBlur || 8}px)`,
        }}>
        {currentSettings.showAvatar !== false && avatar('w-7 h-7', 'rounded-lg')}
        {body('#FFD166', '#F5EFE6')}
      </motion.div>
    );
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
            {displayMessages.slice(-currentSettings.maxChats).map(renderMessage)}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

