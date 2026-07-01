import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useSettingsStore } from '../store/settingsStore'
import { MockConnector } from '../connectors/base/mock'
import { TwitchConnector } from '../connectors/twitch'
import { YouTubeConnector } from '../connectors/youtube'
import { TikTokConnector } from '../connectors/tiktok'
import { KickConnector } from '../connectors/kick'
import '../index.css'

const mockConnector = new MockConnector();
const twitchConnector = new TwitchConnector();
const youtubeConnector = new YouTubeConnector();
const tiktokConnector = new TikTokConnector();
const kickConnector = new KickConnector();

function ConnectionRow({ label, status, connectedColor, onToggle, disabled, children }: any) {
  return (
    <div className="bg-[#25252e] rounded-xl border border-gray-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            status === 'connected' ? `shadow-[0_0_8px_currentColor]` :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' : 'bg-gray-600'
          }`}
            style={{ color: status === 'connected' ? connectedColor : 'transparent',
                     background: status === 'connected' ? connectedColor : undefined }}
          />
          <span className="text-sm font-semibold text-gray-200">{label}</span>
        </div>
        <button onClick={onToggle} disabled={disabled}
          className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
            status === 'connected'
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
              : disabled
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                : `text-white shadow-lg`
          }`}
          style={status !== 'connected' && !disabled ? {
            background: connectedColor,
            boxShadow: `0 4px 14px ${connectedColor}40`
          } : {}}
        >
          {status === 'connected' ? 'Disconnect' :
           status === 'connecting' ? 'Connecting..' : 'Connect'}
        </button>
      </div>
      {children}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { connections, messages, setConnectionStatus, addMessage, clearMessages } = useChatStore();
  const { settings, setSetting, init } = useSettingsStore();

  const mockStatus = connections['mock']?.status || 'idle';
  const twitchStatus = connections['twitch']?.status || 'idle';
  const youtubeStatus = connections['youtube']?.status || 'idle';
  const tiktokStatus = connections['tiktok']?.status || 'idle';
  const kickStatus = connections['kick']?.status || 'idle';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const [twitchChannel, setTwitchChannel] = useState('');
  const [twitchError, setTwitchError] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [tiktokChannel, setTiktokChannel] = useState('');
  const [tiktokError, setTiktokError] = useState('');
  const [kickChannel, setKickChannel] = useState('');
  const [kickError, setKickError] = useState('');

  useEffect(() => {
    init();

    mockConnector.onConnected(() => setConnectionStatus('mock', 'connected'));
    mockConnector.onDisconnected(() => setConnectionStatus('mock', 'idle'));
    mockConnector.onMessage((msg) => addMessage(msg));

    twitchConnector.onConnected(() => {
      setConnectionStatus('twitch', 'connected');
      setTwitchError('');
    });
    twitchConnector.onDisconnected(() => setConnectionStatus('twitch', 'idle'));
    twitchConnector.onError((err) => {
      setConnectionStatus('twitch', 'error');
      setTwitchError(err.message || 'Connection failed');
    });
    twitchConnector.onMessage((msg) => addMessage(msg));

    youtubeConnector.onConnected(() => { setConnectionStatus('youtube', 'connected'); setYoutubeError(''); });
    youtubeConnector.onDisconnected(() => setConnectionStatus('youtube', 'idle'));
    youtubeConnector.onError((err) => { setConnectionStatus('youtube', 'error'); setYoutubeError(err.message); });
    youtubeConnector.onMessage((msg) => addMessage(msg));

    tiktokConnector.onConnected(() => { setConnectionStatus('tiktok', 'connected'); setTiktokError(''); });
    tiktokConnector.onDisconnected(() => setConnectionStatus('tiktok', 'idle'));
    tiktokConnector.onError((err) => { setConnectionStatus('tiktok', 'error'); setTiktokError(err.message); });
    tiktokConnector.onMessage((msg) => addMessage(msg));

    kickConnector.onConnected(() => { setConnectionStatus('kick', 'connected'); setKickError(''); });
    kickConnector.onDisconnected(() => setConnectionStatus('kick', 'idle'));
    kickConnector.onError((err) => { setConnectionStatus('kick', 'error'); setKickError(err.message); });
    kickConnector.onMessage((msg) => addMessage(msg));
  }, []);

  // Load saved channels when settings change
  useEffect(() => {
    const saved = settings.savedChannels;
    if (saved?.twitch) setTwitchChannel(saved.twitch);
    if (saved?.youtube) setYoutubeChannel(saved.youtube);
    if (saved?.tiktok) setTiktokChannel(saved.tiktok);
    if (saved?.kick) setKickChannel(saved.kick);
  }, [settings.savedChannels]);

  useEffect(() => {
    if (autoScrollRef.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleMockConnection = useCallback(async () => {
    if (mockStatus === 'connected') {
      await mockConnector.disconnect();
    } else {
      setConnectionStatus('mock', 'connecting');
      try { await mockConnector.connect('mock-channel'); }
      catch { setConnectionStatus('mock', 'error'); }
    }
  }, [mockStatus]);

  const toggleTwitchConnection = useCallback(async () => {
    if (twitchStatus === 'connected') {
      await twitchConnector.disconnect();
      setTwitchError('');
    } else {
      if (!twitchChannel.trim()) return;
      setConnectionStatus('twitch', 'connecting');
      setTwitchError('');
      try {
        await twitchConnector.connect(twitchChannel.trim());
        const current = useSettingsStore.getState().settings.savedChannels || {};
        setSetting('savedChannels', { ...current, twitch: twitchChannel.trim() });
      }
      catch (err: any) { setTwitchError(err.message || 'Connection failed'); }
    }
  }, [twitchStatus, twitchChannel]);

  const toggleYoutube = useCallback(async () => {
    if (youtubeStatus === 'connected') { await youtubeConnector.disconnect(); setYoutubeError(''); }
    else {
      if (!youtubeChannel.trim()) return;
      setConnectionStatus('youtube', 'connecting'); setYoutubeError('');
      try {
        await youtubeConnector.connect(youtubeChannel.trim());
        const current = useSettingsStore.getState().settings.savedChannels || {};
        setSetting('savedChannels', { ...current, youtube: youtubeChannel.trim() });
      }
      catch (err: any) { setYoutubeError(err.message); }
    }
  }, [youtubeStatus, youtubeChannel]);

  const toggleTiktok = useCallback(async () => {
    if (tiktokStatus === 'connected') { await tiktokConnector.disconnect(); setTiktokError(''); }
    else {
      if (!tiktokChannel.trim()) return;
      setConnectionStatus('tiktok', 'connecting'); setTiktokError('');
      try {
        await tiktokConnector.connect(tiktokChannel.trim());
        const current = useSettingsStore.getState().settings.savedChannels || {};
        setSetting('savedChannels', { ...current, tiktok: tiktokChannel.trim() });
      }
      catch (err: any) { setTiktokError(err.message); }
    }
  }, [tiktokStatus, tiktokChannel]);

  const toggleKick = useCallback(async () => {
    if (kickStatus === 'connected') { await kickConnector.disconnect(); setKickError(''); }
    else {
      if (!kickChannel.trim()) return;
      setConnectionStatus('kick', 'connecting'); setKickError('');
      try { await kickConnector.connect(kickChannel.trim()); }
      catch (err: any) { setKickError(err.message); }
    }
  }, [kickStatus, kickChannel]);

  return (
    <div className="flex h-screen bg-[#0f0f13] text-gray-200 select-none">
      <div className="w-80 bg-[#1a1a21] border-r border-gray-800/60 flex flex-col z-10 shadow-2xl overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-gray-800/60">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-xs text-gray-500 mt-1">Universal Live Chat Overlay</p>
            </div>
            <button onClick={() => navigate('/settings')}
              className="text-gray-500 hover:text-gray-300 text-lg transition-colors p-1" title="Settings">
              ⚙
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Overlay Settings</h2>
          <div className="bg-[#25252e] rounded-xl border border-gray-800/50 overflow-hidden divide-y divide-gray-800/30">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-gray-300">Lock Position</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer"
                  checked={settings.isLocked}
                  onChange={() => setSetting('isLocked', !settings.isLocked)} />
                <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            {(['maxChats', 'opacity'] as const).map(key => (
              <div key={key} className="px-4 py-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-400">{key === 'maxChats' ? 'Max Chats' : 'Opacity'}</span>
                  <span className="text-xs font-bold text-gray-300">{settings[key]}{key === 'opacity' ? '%' : ''}</span>
                </div>
                <input type="range" min={key === 'maxChats' ? 1 : 10} max={key === 'maxChats' ? 15 : 100}
                  value={settings[key]}
                  onChange={(e) => setSetting(key, parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5" />
              </div>
            ))}
            <div className="px-4 py-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-400">Scale</span>
                <span className="text-xs font-bold text-gray-300">{settings.scale.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={settings.scale}
                onChange={(e) => setSetting('scale', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5" />
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Connections</h2>

          <ConnectionRow label="Mock Data" status={mockStatus} connectedColor="#22c55e"
            onToggle={toggleMockConnection} disabled={false} />

          <ConnectionRow label="Twitch" status={twitchStatus} connectedColor="#9146FF"
            onToggle={toggleTwitchConnection}
            disabled={!twitchChannel.trim() && twitchStatus !== 'connected'}>
            {twitchStatus !== 'connected' && (
              <input type="text" placeholder="twitch channel name" value={twitchChannel}
                onChange={(e) => setTwitchChannel(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#9146FF] focus:ring-1 focus:ring-[#9146FF]/50 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter' && twitchChannel.trim()) toggleTwitchConnection(); }} />
            )}
            {twitchError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{twitchError}</div>}
            {twitchStatus === 'idle' && !twitchError && <p className="text-[11px] text-gray-600">Connect to any live Twitch channel</p>}
          </ConnectionRow>

          <ConnectionRow label="YouTube" status={youtubeStatus} connectedColor="#FF0033"
            onToggle={toggleYoutube} disabled={!youtubeChannel.trim() && youtubeStatus !== 'connected'}>
            {youtubeStatus !== 'connected' && (
              <input type="text" placeholder="channel name or video ID" value={youtubeChannel}
                onChange={(e) => setYoutubeChannel(e.target.value)}
                className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0033] focus:ring-1 focus:ring-[#FF0033]/50 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter' && youtubeChannel.trim()) toggleYoutube(); }} />
            )}
            {youtubeError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{youtubeError}</div>}
            {youtubeStatus === 'idle' && !youtubeError && <p className="text-[11px] text-gray-600">Connect to a live YouTube stream</p>}
          </ConnectionRow>

          <ConnectionRow label="TikTok" status={tiktokStatus} connectedColor="#FE2C55"
            onToggle={toggleTiktok} disabled={!tiktokChannel.trim() && tiktokStatus !== 'connected'}>
            {tiktokStatus !== 'connected' && (
              <input type="text" placeholder="@username" value={tiktokChannel}
                onChange={(e) => setTiktokChannel(e.target.value)}
                className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FE2C55] focus:ring-1 focus:ring-[#FE2C55]/50 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter' && tiktokChannel.trim()) toggleTiktok(); }} />
            )}
            {tiktokError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{tiktokError}</div>}
            {tiktokStatus === 'idle' && !tiktokError && <p className="text-[11px] text-gray-600">Connect to a TikTok live stream</p>}
          </ConnectionRow>

          <ConnectionRow label="Kick" status={kickStatus} connectedColor="#53FC18"
            onToggle={toggleKick} disabled={!kickChannel.trim() && kickStatus !== 'connected'}>
            {kickStatus !== 'connected' && (
              <input type="text" placeholder="channel slug" value={kickChannel}
                onChange={(e) => setKickChannel(e.target.value)}
                className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] focus:ring-1 focus:ring-[#53FC18]/50 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter' && kickChannel.trim()) toggleKick(); }} />
            )}
            {kickError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{kickError}</div>}
            {kickStatus === 'idle' && !kickError && <p className="text-[11px] text-gray-600">Connect to a Kick channel</p>}
          </ConnectionRow>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a1a2e]/40 to-[#0f0f13]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/40">
          <h2 className="text-sm font-bold text-gray-300">
            Chat Log
            <span className="ml-2 text-xs font-normal text-gray-600">({messages.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={() => { autoScrollRef.current = !autoScrollRef.current; }}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${autoScrollRef.current ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
              Auto-scroll
            </button>
            {messages.length > 0 && (
              <button onClick={clearMessages}
                className="text-xs px-2.5 py-1 rounded-md font-semibold bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-all">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 px-6 py-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <div className="text-3xl mb-3 opacity-30">💬</div>
              <p className="text-sm italic">No messages yet</p>
              <p className="text-xs mt-1 opacity-60">Connect Mock or a Twitch channel</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id}
                  className="px-4 py-3 bg-[#1a1a22] rounded-xl border-l-[3px] border-gray-700 hover:bg-[#22222d] transition-colors text-sm flex items-start gap-4"
                  style={{
                    borderLeftColor: msg.platform === 'tiktok' ? '#FE2C55' :
                      msg.platform === 'youtube' ? '#FF0033' :
                      msg.platform === 'twitch' ? '#9146FF' : '#53FC18'
                  }}>
                  <span className="font-bold text-[10px] uppercase tracking-wider text-gray-500 w-14 shrink-0 mt-0.5">{msg.platform}</span>
                  <span className="font-bold text-indigo-300/90 truncate max-w-[140px] shrink-0">{msg.username}</span>
                  <span className="text-gray-300 break-words flex-1 min-w-0">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
