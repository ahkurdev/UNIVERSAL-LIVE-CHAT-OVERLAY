import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useSettingsStore } from '../store/settingsStore'
import { BarChart3, Settings, MessageCircle, Sparkles } from 'lucide-react'
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
  const statusLabel = status === 'connected' ? 'Live' :
    status === 'connecting' ? 'Connecting…' :
    status === 'error' ? 'Failed' : 'Offline';
  const statusDotColor = status === 'connected' ? connectedColor :
    status === 'connecting' ? '#eab308' :
    status === 'error' ? '#ef4444' : '#4b5563';
  return (
    <div className="bg-[#25252e] rounded-xl border border-gray-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{ background: statusDotColor,
                     boxShadow: status === 'connected' ? `0 0 8px ${connectedColor}` : 'none' }}
          />
          <span className="text-sm font-semibold text-gray-200">{label}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            status === 'connected' ? 'text-green-400' :
            status === 'connecting' ? 'text-yellow-400' :
            status === 'error' ? 'text-red-400' : 'text-gray-500'
          }`}>{statusLabel}</span>
        </div>
        <button onClick={onToggle} disabled={disabled || status === 'connecting'}
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
           status === 'connecting' ? 'Connecting…' : 'Connect'}
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
  const anyConnected = [twitchStatus, youtubeStatus, tiktokStatus, kickStatus].includes('connected');
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
  const [activeTab, setActiveTab] = useState<'connect' | 'display'>('connect');

  const dashboardMessages = messages.slice(-(settings.dashboardMaxMessages || 100));

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
            <div className="flex gap-1">
              <button onClick={() => navigate('/statistics')}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-gray-800/50" title="Statistics">
                <BarChart3 size={18} />
              </button>
              <button onClick={() => navigate('/settings')}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-gray-800/50" title="Settings">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-4 pt-2">
          {/* Tabs keep each screen to one job: connecting vs. adjusting the overlay */}
          <div className="flex bg-[#15151c] rounded-lg p-1 border border-gray-800/50">
            <button onClick={() => setActiveTab('connect')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'connect' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
              Connect
            </button>
            <button onClick={() => setActiveTab('display')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'display' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
              Tampilan
            </button>
          </div>
        </div>

        {activeTab === 'connect' && !anyConnected && (
          <div className="px-5 pb-4">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 flex items-start gap-3">
              <Sparkles size={16} className="text-indigo-400 mt-0.5 shrink-0" />
              <div className="text-xs text-gray-400 leading-relaxed">
                <span className="font-bold text-indigo-300">Mulai di sini:</span> ketik nama channel Anda di platform di bawah, lalu tekan <span className="text-gray-200 font-semibold">Connect</span>. Bingung? Klik <span className="text-gray-200 font-semibold">Data Contoh</span> untuk lihat hasilnya dulu.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="px-5 py-4 space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Template Overlay</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['indofinity', 'IndoFinity', '🍊'],
                ['minimal', 'Minimalis', '▫️'],
                ['neon', 'Neon Glow', '💜'],
                ['bubble', 'Bubble', '🫧'],
                ['game', 'Klasik Game', '🎮'],
              ] as const).map(([id, label, emoji]) => (
                <button key={id}
                  onClick={() => setSetting('overlayTemplate', id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                    (settings.overlayTemplate || 'indofinity') === id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg'
                      : 'bg-[#25252e] text-gray-400 border-gray-800/50 hover:border-gray-600 hover:text-gray-200'
                  }`}>
                  <span>{emoji}</span>{label}
                </button>
              ))}
            </div>

            <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500 pt-1">Pengaturan Overlay</h2>
            <div className="bg-[#25252e] rounded-xl border border-gray-800/50 overflow-hidden divide-y divide-gray-800/30">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-semibold text-gray-300">Kunci Posisi</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">Chat bisa diklik tembus saat streaming</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer"
                    checked={settings.isLocked}
                    onChange={() => setSetting('isLocked', !settings.isLocked)} />
                  <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {(['maxChats', 'opacity'] as const).map(key => (
                <div key={key} className="px-4 py-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-400">{key === 'maxChats' ? 'Jumlah Chat' : 'Transparansi'}</span>
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
                  <span className="text-xs font-semibold text-gray-400">Ukuran</span>
                  <span className="text-xs font-bold text-gray-300">{settings.scale.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.1" value={settings.scale}
                  onChange={(e) => setSetting('scale', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5" />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 px-1 leading-relaxed">Drag overlay (jendela transparan) ke posisi yang Anda mau, lalu aktifkan Kunci Posisi.</p>
          </div>
        )}

        <div className={`px-5 pb-5 space-y-3 ${activeTab === 'connect' ? '' : 'hidden'}`}>
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">Platform</h2>

          <button onClick={toggleMockConnection}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              mockStatus === 'connected'
                ? 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:bg-gray-800'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}>
            <Sparkles size={15} />
            {mockStatus === 'connected' ? 'Stop Data Contoh' : 'Coba Data Contoh'}
          </button>

          <ConnectionRow label="Twitch" status={twitchStatus} connectedColor="#9146FF"
            onToggle={toggleTwitchConnection}
            disabled={!twitchChannel.trim() && twitchStatus !== 'connected'}>
            <input type="text" placeholder="e.g. xqc (channel name)" value={twitchChannel}
              disabled={twitchStatus === 'connected'}
              onChange={(e) => setTwitchChannel(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-[#9146FF] focus:ring-1 focus:ring-[#9146FF]/50 transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter' && twitchChannel.trim()) toggleTwitchConnection(); }} />
            {twitchError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{twitchError}</div>}
            {twitchStatus === 'idle' && !twitchError && <p className="text-[11px] text-gray-600">Ketik nama channel Twitch yang sedang live, lalu Connect</p>}
          </ConnectionRow>

          <ConnectionRow label="YouTube" status={youtubeStatus} connectedColor="#FF0033"
            onToggle={toggleYoutube} disabled={!youtubeChannel.trim() && youtubeStatus !== 'connected'}>
            <input type="text" placeholder="URL live atau nama channel" value={youtubeChannel}
              disabled={youtubeStatus === 'connected'}
              onChange={(e) => setYoutubeChannel(e.target.value)}
              className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-[#FF0033] focus:ring-1 focus:ring-[#FF0033]/50 transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter' && youtubeChannel.trim()) toggleYoutube(); }} />
            {youtubeError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{youtubeError}</div>}
            {youtubeStatus === 'idle' && !youtubeError && <p className="text-[11px] text-gray-600">Paste URL live (youtube.com/watch?v=...) atau nama channel</p>}
          </ConnectionRow>

          <ConnectionRow label="TikTok" status={tiktokStatus} connectedColor="#FE2C55"
            onToggle={toggleTiktok} disabled={!tiktokChannel.trim() && tiktokStatus !== 'connected'}>
            <input type="text" placeholder="@username (mis. @namaanda)" value={tiktokChannel}
              disabled={tiktokStatus === 'connected'}
              onChange={(e) => setTiktokChannel(e.target.value)}
              className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-[#FE2C55] focus:ring-1 focus:ring-[#FE2C55]/50 transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter' && tiktokChannel.trim()) toggleTiktok(); }} />
            {tiktokError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{tiktokError}</div>}
            {tiktokStatus === 'idle' && !tiktokError && <p className="text-[11px] text-gray-600">Ketik @username TikTok Anda yang sedang live</p>}
          </ConnectionRow>

          <ConnectionRow label="Kick" status={kickStatus} connectedColor="#53FC18"
            onToggle={toggleKick} disabled={!kickChannel.trim() && kickStatus !== 'connected'}>
            <input type="text" placeholder="nama channel, mis. xqc" value={kickChannel}
              disabled={kickStatus === 'connected'}
              onChange={(e) => setKickChannel(e.target.value)}
              className="w-full bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-[#53FC18] focus:ring-1 focus:ring-[#53FC18]/50 transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter' && kickChannel.trim()) toggleKick(); }} />
            {kickError && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{kickError}</div>}
            {kickStatus === 'idle' && !kickError && <p className="text-[11px] text-gray-600">Ketik nama channel Kick (bagian setelah kick.com/)</p>}
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
          {dashboardMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <MessageCircle size={40} className="opacity-30 mb-3" />
              <p className="text-sm italic">Belum ada chat masuk</p>
              <p className="text-xs mt-1 opacity-60">Connect platform di sidebar, atau</p>
              <button onClick={toggleMockConnection}
                className="mt-3 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition-all">
                Coba Data Contoh
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dashboardMessages.map((msg) => {
                const accent = msg.platform === 'tiktok' ? '#FE2C55' :
                  msg.platform === 'youtube' ? '#FF0033' :
                  msg.platform === 'twitch' ? '#9146FF' : '#53FC18';
                return (
                  <div key={msg.id}
                    className="px-4 py-3 bg-[#1a1a22] rounded-xl hover:bg-[#22222d] transition-colors text-sm flex items-start gap-3"
                    style={{ borderLeft: `3px solid ${accent}` }}>
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
                        {(msg.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-gray-500">{msg.platform}</span>
                        {msg.eventType && msg.eventType !== 'chat' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                            {msg.eventType === 'superchat' ? '⭐ Superchat' :
                             msg.eventType === 'gift' ? '🎁 Gift' : '🎉 ' + msg.eventType}
                          </span>
                        )}
                        <span className="font-bold truncate max-w-[140px]" style={{ color: accent }}>{msg.username}</span>
                      </div>
                      <p className="text-gray-300 break-words mt-0.5">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
