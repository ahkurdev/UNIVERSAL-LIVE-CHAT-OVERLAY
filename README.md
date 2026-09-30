# Universal Live Chat Overlay

Overlay chat multi-platform buat streamer. Gabungin chat **Twitch, YouTube, TikTok, Kick** dalam satu overlay transparan di atas game.

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/electron-42-purple)

---

## Cara Install (Windows)

> **Persyaratan:** Koneksi internet (download ~200MB untuk dependencies)

### 1. Download Node.js
Download dan install **Node.js LTS** dari: https://nodejs.org

Cek berhasil:
```
node --version   # gunakan Node.js LTS 22.12 atau lebih baru
```

### 2. Download Aplikasi
Download repository ini sebagai ZIP atau clone:
```
git clone https://github.com/ahkurdev/UNIVERSAL-LIVE-CHAT-OVERLAY.git
```
Atau klik **Code → Download ZIP**, extract.

### 3. Setup (sekali doang)
Klik 2x file **`setup.bat`** — nanti otomatis install semua yang dibutuhkan.

`setup.bat` juga memeriksa apakah `electron.exe` benar-benar selesai didownload. Jika
instalasi Electron tidak lengkap, setup akan memperbaikinya sebelum menampilkan pesan
berhasil.

Atau manual:
```
cd UNIVERSAL-LIVE-CHAT-OVERLAY
npm install
node -e "require('electron')"
npm run verify:electron
```

### 4. Jalankan (Mode Pengembangan)
Klik 2x file **`start.bat`**

Atau:
```
npm start
```

### 5. Build Jadi Aplikasi Mandiri (.exe)
Klik 2x file **`build-exe.bat`**

Atau:
```
npm run dist
```
File installer (`Setup 1.0.0.exe`) dan file portabel (`Portable-1.0.0.exe`) akan langsung tercipta di folder **`dist/`**.

`start.bat` menjalankan pemeriksaan yang sama dan mencoba memulihkan binary Electron
secara otomatis. Jadi error `Electron uninstall` tidak dibiarkan muncul tanpa penjelasan.

### Troubleshooting Instalasi

Jika setup gagal mendownload Electron:

1. Pastikan koneksi internet aktif dan GitHub/download Electron tidak diblokir antivirus,
   firewall, VPN, atau proxy.
2. Jalankan `setup.bat` lagi. Script aman dijalankan ulang.
3. Jika masih gagal, hapus folder `node_modules` secara manual lalu jalankan `setup.bat`.

Jangan gunakan `npm install --ignore-scripts`, karena project membutuhkan install script
untuk menyiapkan dependency build seperti esbuild.

---

## Cara Pakai

1. **Dashboard** muncul setelah aplikasi jalan
2. Masukin nama channel / URL di kolom input
3. Klik **Connect** di platform yang mau dipake:
   - **Mock** — test data (tanpa login)
   - **Twitch** — nama channel
   - **YouTube** — URL full / channel name / video ID (mode scrape tanpa API key!)
   - **TikTok** — @username
   - **Kick** — channel slug
4. Chat muncul di **overlay transparan** di atas game
5. Atur posisi overlay lewat **Lock Position** di dashboard

---

## Fitur

### Overlay
- Overlay transparan, always on top
- Drag & resize langsung di overlay (Unlock dulu)
- Glassmorphism UI dengan backdrop blur
- Framer Motion animations (slide + fade)
- Platform colors (TikTok pink, YouTube red, Twitch purple, Kick green)
- TikTok badges, level, gift info, diamonds
- Auto-fade chat (default 12 detik)
- Special events stay 3x lebih lama (superchat/gift/cheers)
- **F9 Stream Mode** — toggle hide/show overlay

### 5 Platform Connectors
- **Twitch** — tmi.js IRC (read-only, no OAuth)
- **YouTube** — dual mode: scrape (no API key) atau YouTube Data API v3
- **TikTok** — tiktok-live-connector (main process, 54+ events)
- **Kick** — Pusher WebSocket
- **Mock** — test data untuk development

### Dashboard
- Chat log dengan auto-scroll & clear
- Connection status indicators
- Channel name persistence (auto-save)
- Settings, Statistics, OBS Browser Source navigation

### Settings (6 kategori)
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
- Local web server di `http://localhost:3000` (port configurable)
- WebSocket real-time chat updates
- Self-contained HTML (inline CSS + JS)
- Toggle on/off di Settings

### Chat Filters
- Duplicate filter (configurable window)
- Flood protection (max messages per second)
- Blacklist words (comma-separated)
- Hide links
- Hide ALL CAPS messages
- Hide bots (Nightbot, Streamlabs, Moobot, dll)

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

## Struktur Project

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
