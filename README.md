Bahasa Indonesia version: [readme.id.md](readme.id.md)

# Universal Live Chat Overlay

Multi-platform chat overlay for streamers. Combines **Twitch, YouTube, TikTok, and Kick** chat into a single transparent overlay on top of your game.

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/electron-42-purple)

---

## Installation (Windows)

> **Requirements:** Internet connection (downloads ~200MB of dependencies)

### 1. Download Node.js
Download and install **Node.js LTS** from: https://nodejs.org

Check it worked:
```
node --version   # use Node.js LTS 22.12 or newer
```

### 2. Download the App
Download this repository as a ZIP or clone it:
```
git clone https://github.com/ahkurdev/UNIVERSAL-LIVE-CHAT-OVERLAY.git
```
Or click **Code → Download ZIP**, then extract it.

### 3. Setup (one time only)
Double-click **`setup.bat`** — it will automatically install everything needed.

`setup.bat` also checks whether `electron.exe` actually finished downloading. If the Electron installation is incomplete, setup will fix it before showing the success message.

Or manually:
```
cd UNIVERSAL-LIVE-CHAT-OVERLAY
npm install
node -e "require('electron')"
npm run verify:electron
```

### 4. Run (Development Mode)
Double-click **`start.bat`**

Or:
```
npm start
```

### 5. Build a Standalone App (.exe)
Double-click **`build-exe.bat`**

Or:
```
npm run dist
```
The installer file (`Setup 1.0.0.exe`) and the portable file (`Portable-1.0.0.exe`) will be created directly in the **`dist/`** folder.

`start.bat` runs the same check and tries to restore the Electron binary automatically. So an `Electron uninstall` error is never left to appear without an explanation.

### Installation Troubleshooting

If setup fails to download Electron:

1. Make sure your internet connection is active and that GitHub / Electron downloads are not blocked by antivirus, firewall, VPN, or proxy.
2. Run `setup.bat` again. The script is safe to run repeatedly.
3. If it still fails, delete the `node_modules` folder manually, then run `setup.bat`.

Do not use `npm install --ignore-scripts`, because the project needs its install scripts to prepare build dependencies such as esbuild.

---

## How to Use

1. The **Dashboard** appears after the app starts
2. Enter the channel name / URL in the input field
3. Click **Connect** on the platform you want to use:
   - **Mock** — test data (no login)
   - **Twitch** — channel name
   - **YouTube** — full URL / channel name / video ID (scrape mode, no API key!)
   - **TikTok** — @username
   - **Kick** — channel slug
4. Chat appears in the **transparent overlay** on top of your game
5. Adjust the overlay position via **Lock Position** in the dashboard

---

## Features

### Overlay
- Transparent overlay, always on top
- Drag & resize directly on the overlay (Unlock it first)
- Glassmorphism UI with backdrop blur
- Framer Motion animations (slide + fade)
- Platform colors (TikTok pink, YouTube red, Twitch purple, Kick green)
- TikTok badges, level, gift info, diamonds
- Auto-fade chat (default 12 seconds)
- Special events stay 3x longer (superchat/gift/cheers)
- **F9 Stream Mode** — toggle hide/show overlay

### 5 Platform Connectors
- **Twitch** — tmi.js IRC (read-only, no OAuth)
- **YouTube** — dual mode: scrape (no API key) or YouTube Data API v3
- **TikTok** — tiktok-live-connector (main process, 54+ events)
- **Kick** — Pusher WebSocket
- **Mock** — test data for development

### Dashboard
- Chat log with auto-scroll & clear
- Connection status indicators
- Channel name persistence (auto-save)
- Settings, Statistics, OBS Browser Source navigation

### Settings (6 categories)
- **General** — language, stream mode, YouTube mode, OBS server
- **Overlay** — lock, opacity, scale, chat width, alignment, fade duration
- **Appearance** — bg opacity, blur, rounding, font size, show/hide badges
- **Chat** — duplicate filter, flood protection, blacklist words, hide links/caps/bots
- **Sound** — notification sounds per event type
- **TTS** — Text-to-Speech queue (voice, rate, volume)

### Statistics
- Messages per minute (MPM)
- Platform distribution (bar chart)
- Events breakdown (chat/gift/superchat/cheers)
- Top 10 users
- Time range filter (1m/5m/15m/30m)
- Export CSV / JSON

### OBS Browser Source
- Local web server at `http://localhost:3000` (port configurable)
- WebSocket real-time chat updates
- Self-contained HTML (inline CSS + JS)
- Toggle on/off in Settings

### Chat Filters
- Duplicate filter (configurable window)
- Flood protection (max messages per second)
- Blacklist words (comma-separated)
- Hide links
- Hide ALL CAPS messages
- Hide bots (Nightbot, Streamlabs, Moobot, etc.)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 42 |
| Frontend | React 18 + TypeScript |
| Bundler | Vite + electron-vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State | Zustand |
| Routing | React Router 6 |
| Persistence | electron-store |
| Twitch | tmi.js |
| TikTok | tiktok-live-connector |
| Kick | WebSocket (Pusher) |
| YouTube | InnerTube API (scrape) / YouTube Data API v3 |
| OBS Server | Express + ws |

---

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Window creation, IPC handlers
│   ├── store.ts             # Electron store config
│   ├── obs-server.ts        # OBS Browser Source server
│   └── connectors/
│       ├── tiktok.ts        # TikTok Live (main process)
│       └── youtube.ts       # YouTube scraper (main process)
├── preload/
│   └── index.ts             # IPC bridge (main ↔ renderer)
├── renderer/
│   ├── main.tsx             # Dashboard entry point
│   ├── overlay-main.tsx     # Overlay entry point
│   ├── index.css            # Global styles + Tailwind
│   ├── pages/
│   │   ├── Dashboard.tsx    # Main control panel
│   │   ├── Overlay.tsx      # Transparent overlay window
│   │   ├── Settings.tsx     # Settings page (6 categories)
│   │   └── Statistics.tsx   # Chat analytics
│   ├── store/
│   │   ├── chatStore.ts     # Unified chat messages
│   │   └── settingsStore.ts # App settings
│   ├── connectors/
│   │   ├── base/mock.ts     # Mock connector
│   │   ├── twitch/          # Twitch IRC (renderer)
│   │   ├── youtube/         # YouTube IPC proxy
│   │   ├── tiktok/          # TikTok IPC proxy
│   │   └── kick/            # Kick WebSocket (renderer)
│   ├── filters/
│   │   └── chatFilter.ts    # Chat filtering logic
│   └── services/
│       └── soundService.ts  # Sound + TTS
└── shared/
    └── types.ts             # Shared TypeScript interfaces
```

---

## License

MIT
