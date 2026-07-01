import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../store/settingsStore'
import { AppSettings } from '@shared/types'
import '../index.css'

const CATEGORIES = [
  { id: 'general', label: 'General', icon: '⚡' },
  { id: 'overlay', label: 'Overlay', icon: '⊞' },
  { id: 'appearance', label: 'Appearance', icon: '✦' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'sound', label: 'Sound', icon: '🔊' },
  { id: 'tts', label: 'TTS', icon: '🎤' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

interface SettingField {
  key: keyof AppSettings;
  label: string;
  type: 'toggle' | 'range' | 'select' | 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  category: CategoryId;
}

const SETTINGS: SettingField[] = [
  { key: 'language', label: 'Language', type: 'select', options: [{ value: 'en', label: 'English' }, { value: 'id', label: 'Bahasa Indonesia' }], category: 'general' },
  { key: 'streamMode', label: 'Stream Mode (F9)', type: 'toggle', description: 'F9 to toggle overlay visibility', category: 'general' },
  { key: 'youtubeMode', label: 'YouTube Mode', type: 'select', options: [
    { value: 'scrape', label: 'Scrape (no API key)' },
    { value: 'apikey', label: 'Use API Key' },
  ], category: 'general' },
  { key: 'youtubeApiKey', label: 'YouTube API Key', type: 'text', placeholder: 'AIzaSy...', description: 'Only needed when YouTube Mode = Use API Key', category: 'general' },
  { key: 'maxMessages', label: 'Max Stored Messages', type: 'number', min: 50, max: 1000, category: 'general' },

  { key: 'isLocked', label: 'Lock Position', type: 'toggle', category: 'overlay' },
  { key: 'opacity', label: 'Opacity', type: 'range', min: 10, max: 100, suffix: '%', category: 'overlay' },
  { key: 'scale', label: 'Scale', type: 'range', min: 0.5, max: 2, step: 0.1, suffix: 'x', category: 'overlay' },
  { key: 'chatWidth', label: 'Chat Width', type: 'number', min: 200, max: 800, suffix: 'px', category: 'overlay' },
  { key: 'chatAlign', label: 'Chat Alignment', type: 'select', options: [
    { value: 'bottom-left', label: 'Bottom Left' }, { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'top-left', label: 'Top Left' }, { value: 'top-right', label: 'Top Right' },
  ], category: 'overlay' },
  { key: 'maxChats', label: 'Max Visible Chats', type: 'range', min: 1, max: 15, category: 'overlay' },
  { key: 'chatFadeDuration', label: 'Fade Duration', type: 'range', min: 3, max: 60, suffix: 's', category: 'overlay' },

  { key: 'messageBgOpacity', label: 'Background Opacity', type: 'range', min: 10, max: 100, suffix: '%', category: 'appearance' },
  { key: 'messageBlur', label: 'Blur Amount', type: 'range', min: 0, max: 20, suffix: 'px', category: 'appearance' },
  { key: 'messageRounding', label: 'Corner Rounding', type: 'range', min: 0, max: 24, suffix: 'px', category: 'appearance' },
  { key: 'fontSize', label: 'Font Size', type: 'range', min: 10, max: 24, suffix: 'px', category: 'appearance' },
  { key: 'showPlatformIcon', label: 'Show Platform Icon', type: 'toggle', category: 'appearance' },
  { key: 'showPlatformTag', label: 'Show Platform Badge', type: 'toggle', category: 'appearance' },
  { key: 'showAvatar', label: 'Show Avatar', type: 'toggle', category: 'appearance' },

  { key: 'duplicateFilter', label: 'Duplicate Filter', type: 'toggle', category: 'chat' },
  { key: 'duplicateFilterWindow', label: 'Dedup Window', type: 'range', min: 1, max: 10, suffix: 's', category: 'chat' },
  { key: 'hideMessagesAfter', label: 'Hide After', type: 'range', min: 3, max: 60, suffix: 's', category: 'chat' },

  { key: 'soundEnabled', label: 'Enable Sounds', type: 'toggle', category: 'sound' },
  { key: 'soundVolume', label: 'Sound Volume', type: 'range', min: 0, max: 100, suffix: '%', category: 'sound' },

  { key: 'ttsEnabled', label: 'Enable TTS', type: 'toggle', category: 'tts' },
  { key: 'ttsVolume', label: 'TTS Volume', type: 'range', min: 0, max: 100, suffix: '%', category: 'tts' },
  { key: 'ttsRate', label: 'TTS Speed', type: 'range', min: 0.5, max: 2, step: 0.1, suffix: 'x', category: 'tts' },
];

export function Settings() {
  const navigate = useNavigate();
  const settings = useSettingsStore(s => s.settings);
  const setSetting = useSettingsStore(s => s.setSetting);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('general');
  const [search, setSearch] = useState('');

  const filtered = SETTINGS.filter(s =>
    s.category === activeCategory &&
    (s.label.toLowerCase().includes(search.toLowerCase()) || search === '')
  );

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'overlay-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      try {
        const text = await input.files?.[0]?.text() || '{}';
        const data = JSON.parse(text) as Partial<AppSettings>;
        Object.entries(data).forEach(([key, value]) => setSetting(key as keyof AppSettings, value));
      } catch { alert('Invalid settings file'); }
    };
    input.click();
  };

  return (
    <div className="flex h-screen bg-[#0f0f13] text-gray-200 select-none">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1a21] border-r border-gray-800/60 flex flex-col z-10 shadow-2xl">
        <div className="px-5 pt-6 pb-4 border-b border-gray-800/60">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white tracking-tight">Settings</h1>
            <button onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1" title="Back to Dashboard">←</button>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}>
              <span className="text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-gray-800/60 space-y-2">
          <button onClick={exportSettings}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all">
            Export JSON
          </button>
          <button onClick={importSettings}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-all">
            Import JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-800/40">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-200 capitalize">{activeCategory}</h2>
            <input type="text" placeholder="Search settings..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-[#1a1a22] border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all" />
          </div>
        </div>

        <div className="flex-1 px-8 py-6 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-gray-600 text-sm italic mt-8 text-center">No settings found</div>
          ) : (
            <div className="max-w-2xl space-y-3">
              {filtered.map(field => {
                const value = settings[field.key] as any;
                return (
                  <div key={field.key}
                    className="bg-[#1a1a22] rounded-xl border border-gray-800/50 px-5 py-4 flex items-center justify-between hover:border-gray-700/50 transition-colors">
                    <label className="text-sm font-semibold text-gray-300">{field.label}</label>
                    <div className="flex items-center gap-3">
                      {field.type === 'toggle' ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer"
                            checked={!!value}
                            onChange={(e) => setSetting(field.key, e.target.checked as any)} />
                          <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all" />
                        </label>
                      ) : field.type === 'range' ? (
                        <div className="flex items-center gap-3">
                          <input type="range" min={field.min} max={field.max} step={field.step || 1}
                            value={value}
                            onChange={(e) => setSetting(field.key, parseFloat(e.target.value) as any)}
                            className="w-28 accent-indigo-500 h-1.5" />
                          <span className="text-xs font-bold text-gray-400 w-10 text-right">{value}{field.suffix || ''}</span>
                        </div>
                      ) : field.type === 'select' ? (
                        <select value={value as string}
                          onChange={(e) => setSetting(field.key, e.target.value as any)}
                          className="bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'text' ? (
                        <input type="text" value={value as string} placeholder={field.placeholder}
                          onChange={(e) => setSetting(field.key, e.target.value as any)}
                          className="w-64 bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-indigo-500/50" />
                      ) : (
                        <input type="number" min={field.min} max={field.max}
                          value={value}
                          onChange={(e) => setSetting(field.key, parseInt(e.target.value) as any)}
                          className="w-20 bg-[#15151c] border border-gray-700/60 rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-indigo-500/50" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}