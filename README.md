# Universal Live Chat Overlay

Overlay chat multi-platform buat streamer. Gabungin chat **Twitch, YouTube, TikTok, Kick** dalam satu overlay transparan di atas game.

## Cara Install (Windows)

> **Persyaratan:** Koneksi internet (download ~200MB untuk dependencies)

### 1. Download Node.js
Download dan install **Node.js LTS** dari: https://nodejs.org

Cek berhasil:
```
node --version   # harus muncul angka kaya v20.x.x
```

### 2. Download Aplikasi
Download repository ini sebagai ZIP atau clone:
```
git clone https://github.com/Allan4u/UNIVERSAL-LIVE-CHAT-OVERLAY-.git
```
Atau klik **Code → Download ZIP**, extract.

### 3. Setup (sekali doang)
Klik 2x file **`setup.bat`** — nanti otomatis install semua yang dibutuhkan.

Atau manual:
```
cd UNIVERSAL-LIVE-CHAT-OVERLAY-
npm install
```

### 4. Jalankan
Klik 2x file **`start.bat`**

Atau:
```
npm start
```

## Cara Pakai

1. **Dashboard** muncul setelah aplikasi jalan
2. Klik **Connect** di platform yang mau dipake:
   - **Mock** — test data (tanpa login)
   - **Twitch** — masukin nama channel
   - **YouTube** — masukin URL/video ID + butuh [API Key](https://console.cloud.google.com)
   - **TikTok** — masukin @username
   - **Kick** — masukin channel slug
3. Chat muncul di **overlay transparan** di atas game
4. Atur posisi overlay lewat **Lock Position** di dashboard

## Fitur

- ✅ Overlay transparan (always on top)
- ✅ Drag & resize overlay
- ✅ Glassmorphism UI
- ✅ Sound notifikasi + TTS
- ✅ Settings lengkap (export/import JSON)

## Tech Stack

Electron + React + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand
