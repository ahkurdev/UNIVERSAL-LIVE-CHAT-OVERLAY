import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { BarChart3, Settings, Download, ArrowLeft } from 'lucide-react'
import '../index.css'

export function Statistics() {
  const navigate = useNavigate();
  const { messages } = useChatStore();
  const [timeRange, setTimeRange] = useState(5); // minutes

  // Calculate stats
  const stats = useMemo(() => {
    const now = Date.now();
    const rangeMs = timeRange * 60 * 1000;
    const recent = messages.filter(m => now - m.timestamp < rangeMs);

    // Platform distribution
    const platforms: Record<string, number> = {};
    recent.forEach(m => { platforms[m.platform] = (platforms[m.platform] || 0) + 1; });

    // Top users
    const users: Record<string, { count: number; platform: string }> = {};
    recent.forEach(m => {
      const key = `${m.platform}:${m.username}`;
      if (!users[key]) users[key] = { count: 0, platform: m.platform };
      users[key].count++;
    });
    const topUsers = Object.entries(users)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    // MPM
    const mpm = timeRange > 0 ? Math.round(recent.length / timeRange) : 0;

    // Events breakdown
    const events: Record<string, number> = {};
    recent.forEach(m => {
      const ev = m.eventType || 'chat';
      events[ev] = (events[ev] || 0) + 1;
    });

    // Unique users
    const uniqueUsers = new Set(recent.map(m => `${m.platform}:${m.username}`)).size;

    return { recent, platforms, topUsers, mpm, events, uniqueUsers };
  }, [messages, timeRange]);

  const exportCSV = () => {
    const header = 'timestamp,platform,username,message,eventType\n';
    const rows = stats.recent.map(m =>
      `${new Date(m.timestamp).toISOString()},${m.platform},"${m.username}","${m.message.replace(/"/g, '""')}",${m.eventType || 'chat'}`
    ).join('\n');
    download(header + rows, 'chat-log.csv', 'text/csv');
  };

  const exportJSON = () => {
    download(JSON.stringify(stats.recent, null, 2), 'chat-log.json', 'application/json');
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const platformColors: Record<string, string> = {
    tiktok: '#FE2C55', youtube: '#FF0033', twitch: '#9146FF', kick: '#53FC18'
  };

  const maxPlatform = Math.max(...Object.values(stats.platforms), 1);

  return (
    <div className="flex h-screen bg-[#0f0f13] text-gray-200 select-none">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1a21] border-r border-gray-800/60 flex flex-col z-10 shadow-2xl">
        <div className="px-5 pt-6 pb-4 border-b border-gray-800/60">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white">Statistics</h1>
            <button onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-gray-800/50" title="Back"><ArrowLeft size={18} /></button>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-2">
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-all">
            <BarChart3 size={16} /> Dashboard
          </button>
          <button onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-all">
            <Settings size={16} /> Settings
          </button>
        </nav>
        <div className="px-3 py-3 border-t border-gray-800/60 space-y-2">
          <button onClick={exportCSV}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={exportJSON}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all">
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Time range selector */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-sm font-semibold text-gray-400">Time Range:</span>
          {[1, 5, 15, 30].map(min => (
            <button key={min} onClick={() => setTimeRange(min)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === min ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {min}m
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Messages" value={stats.recent.length} />
          <StatCard label="Messages/Min" value={stats.mpm} />
          <StatCard label="Unique Users" value={stats.uniqueUsers} />
          <StatCard label="Active Platforms" value={Object.keys(stats.platforms).length} />
        </div>

        {/* Platform Distribution */}
        <div className="bg-[#1a1a22] rounded-xl border border-gray-800/50 p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-300 mb-4">Platform Distribution</h3>
          <div className="space-y-3">
            {Object.entries(stats.platforms).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
              <div key={platform} className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase w-16 text-gray-400">{platform}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / maxPlatform) * 100}%`,
                      background: platformColors[platform] || '#666'
                    }} />
                </div>
                <span className="text-xs font-bold text-gray-300 w-12 text-right">{count}</span>
              </div>
            ))}
            {Object.keys(stats.platforms).length === 0 && (
              <p className="text-gray-600 text-sm italic">No messages in this time range</p>
            )}
          </div>
        </div>

        {/* Events Breakdown */}
        <div className="bg-[#1a1a22] rounded-xl border border-gray-800/50 p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-300 mb-4">Events Breakdown</h3>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(stats.events).map(([event, count]) => (
              <div key={event} className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-[10px] font-bold uppercase text-gray-400">{event}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-[#1a1a22] rounded-xl border border-gray-800/50 p-6">
          <h3 className="text-sm font-bold text-gray-300 mb-4">Top Users</h3>
          <div className="space-y-2">
            {stats.topUsers.map(([key, data], i) => (
              <div key={key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/30">
                <span className="text-xs font-bold text-gray-500 w-6">#{i + 1}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: platformColors[data.platform] || '#666' }} />
                <span className="text-sm font-semibold text-gray-200 flex-1">{key.split(':')[1]}</span>
                <span className="text-xs font-bold text-gray-400">{data.count} msgs</span>
              </div>
            ))}
            {stats.topUsers.length === 0 && (
              <p className="text-gray-600 text-sm italic">No users in this time range</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1a1a22] rounded-xl border border-gray-800/50 p-5">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs font-semibold text-gray-400 mt-1">{label}</div>
    </div>
  );
}
