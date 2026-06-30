# Universal Live Chat Overlay — Roadmap Prompt untuk Claude Code

Cara pakai: jalankan satu fase dulu sampai selesai dan ditest, baru paste fase berikutnya
di sesi Claude Code yang sama (biar context project-nya nyambung). Jangan gabungkan
semua fase jadi satu prompt besar.

---

## FASE 0 — Project Setup & Arsitektur

```
Buatkan project Electron + React + TypeScript (strict mode) + Vite + Tailwind CSS
bernama "Universal Live Chat Overlay".

Tech stack:
- Electron
- React + TypeScript (strict mode, no `any`)
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- React Router
- Electron IPC (typed, bukan string event bebas)

Struktur folder:
src/
  main/                 -> Electron main process
    windows/             -> definisi BrowserWindow (dashboard window, overlay window)
    ipc/                 -> IPC handlers
  renderer/
    pages/               -> Dashboard, Settings, Overlay
    components/          -> reusable UI components
    hooks/
    store/               -> Zustand stores
    types/               -> shared TypeScript interfaces
    services/
    connectors/
      base/              -> ChatConnector interface + abstract class
      youtube/
      tiktok/
      twitch/
      kick/
    themes/
    plugins/
    filters/
    utils/

Definisikan dulu interface inti di src/renderer/types (atau src/shared/types kalau perlu
dipakai main & renderer):

interface ChatMessage {
  id: string;
  platform: "youtube" | "tiktok" | "twitch" | "kick";
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
  badges: string[];
  color: string;
  isModerator: boolean;
  isSubscriber: boolean;
  isVerified: boolean;
  eventType?: "chat" | "gift" | "donation" | "superchat" | "cheers";
}

interface ChatConnector {
  connect(target: string): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  onConnected(cb: () => void): void;
  onDisconnected(cb: () => void): void;
  onMessage(cb: (msg: ChatMessage) => void): void;
  onError(cb: (err: Error) => void): void;
}

Untuk fase ini, JANGAN implementasi connector real dulu. Buat 1 connector dummy
("mock" connector) di src/renderer/connectors/base yang mengeluarkan pesan chat
acak setiap 2-3 detik, supaya seluruh sistem (store, UI) bisa langsung ditest end-to-end
tanpa bergantung API eksternal.

Buat Zustand store untuk:
- daftar koneksi platform (status: idle/connecting/connected/error)
- unified chat feed (array ChatMessage, urut waktu, dengan batas maksimum jumlah pesan)

Hasil akhir fase ini: aplikasi Electron bisa dijalankan (`npm run dev`), muncul window
dashboard kosong, dengan tombol "Connect Mock" yang saat diklik mulai menambahkan
pesan dummy ke store dan tampil di console/log. Tidak perlu UI bagus dulu di fase ini,
fokus ke arsitektur jalan dengan benar.
```

---

## FASE 1 — Overlay Window (Transparent, Draggable, Resizable)

Ini fase yang paling penting buat kamu karena ini fitur yang sudah kamu suka dari
versi HTML sebelumnya — sekarang dipindah jadi window Electron asli.

```
Lanjutkan dari project sebelumnya. Sekarang buat Overlay Window terpisah dari
Dashboard Window.

Overlay window harus:
- transparent: true, frame: false, alwaysOnTop: true
- resizable: true
- bisa digeser posisinya (drag) dan di-resize besar/kecil oleh user secara manual,
  bukan cuma lewat angka di settings -- harus bisa drag langsung di overlay-nya
- defaultnya non-interactive terhadap mouse (setIgnoreMouseEvents(true, { forward: true }))
  supaya klik tembus ke game di belakangnya, KECUALI saat user mengaktifkan
  "Edit Mode" / "Unlock Position" dari dashboard, di mana saat itu overlay jadi
  bisa di-drag dan di-resize seperti window biasa (tampilkan handle resize di pojok
  dan area drag di overlay saat edit mode aktif)
- posisi (x, y) dan ukuran (width, height) disimpan ke Zustand store + persist ke disk
  (electron-store atau JSON file), supaya saat aplikasi dibuka lagi posisi overlay
  tetap sama seperti terakhir kali diatur
- support multi monitor: posisi overlay harus tetap benar walau ada lebih dari 1 layar

Tambahkan toggle di Dashboard:
- "Lock Position" / "Unlock Position" (mengaktifkan/menonaktifkan edit mode di atas)
- Slider Opacity (0-100%)
- Slider Scale (mempengaruhi ukuran keseluruhan elemen overlay, bukan cuma window)

Overlay menampilkan ulang unified chat feed dari Fase 0 (pakai mock connector),
ditampilkan sebagai card chat dengan style minimal dulu (boleh polos), yang penting
behavior drag/resize/lock/opacity-nya berfungsi dengan baik dan terasa responsif (60fps,
gunakan CSS transform bukan reposition lewat JS tiap frame).

Test yang harus lolos manual:
1. Overlay transparan, muncul di atas aplikasi lain termasuk game borderless window
2. Saat locked, klik di overlay tembus ke aplikasi di belakangnya
3. Saat unlocked, overlay bisa digeser ke posisi manapun di layar (termasuk pindah monitor)
4. Resize handle berfungsi untuk membesar/mengecilkan area chat
5. Posisi & ukuran tetap setelah restart aplikasi
```

---

## FASE 2 — UI Overlay Premium (pakai desain yang sudah disetujui)

```
Lanjutkan dari project sebelumnya. Sekarang perbaiki tampilan visual overlay chat
mengikuti desain referensi berikut (saya lampirkan referensi visual/HTML):

[TEMPEL DI SINI: screenshot atau kode HTML overlay yang sudah kamu suka dari
percakapan sebelumnya, supaya Claude Code mencontoh persis]

Setiap chat card menampilkan:
- Icon/logo platform (TikTok, YouTube, Twitch, Kick) dengan warna khas masing-masing
  platform sebagai accent (border-left atau badge)
- Badge nama platform
- Username
- Isi pesan
- Avatar (gunakan placeholder dulu kalau connector belum mengirim avatar asli)

Gunakan Framer Motion untuk animasi masuk (slide + fade) dan keluar pesan lama,
smooth dan tidak nge-jank meskipun banyak pesan masuk cepat (gunakan AnimatePresence
+ virtualized list kalau jumlah pesan besar).

Style: glassmorphism, blur background, rounded corner, shadow halus. Pastikan tetap
terbaca jelas di atas berbagai background game yang terang maupun gelap.
```

---

## FASE 3 — Connector Real: Twitch (paling stabil & gampang duluan)

```
Implementasikan TwitchConnector yang sesuai interface ChatConnector dari Fase 0,
menggunakan tmi.js untuk konek ke Twitch IRC chat secara read-only (anonymous,
tidak perlu login OAuth untuk baca chat publik).

Connector menerima channel name dari user lewat input di Dashboard, lalu:
- mendeteksi apakah channel sedang live (pakai Twitch API publik kalau memungkinkan,
  atau minimal asumsikan connect langsung ke chat-nya)
- konek ke chat, ubah setiap pesan masuk menjadi format ChatMessage standar
- handle badge (moderator, subscriber, VIP, verified, broadcaster)
- auto-reconnect dengan exponential backoff kalau koneksi putus
- emit onConnected/onDisconnected/onError sesuai interface

Ganti tombol "Connect Mock" di Dashboard untuk section Twitch menjadi connect ke
TwitchConnector asli. Platform lain (YouTube/TikTok/Kick) tetap pakai mock dulu,
JANGAN diimplementasi di fase ini.

Test: masukkan nama channel Twitch yang sedang live, klik connect, pastikan chat asli
dari channel tersebut muncul di overlay dengan benar dan badge ter-render.
```

---

## FASE 4 — Connector Real: YouTube, TikTok, Kick

```
Implementasikan 3 connector berikutnya satu per satu, masing-masing sebagai modul
terpisah sesuai interface ChatConnector yang sama, tanpa mengubah kode UI/overlay
sama sekali (cukup daftarkan connector baru di connector registry):

1. YouTubeConnector — ambil live chat dari URL/video ID YouTube Live menggunakan
   YouTube Live Chat API atau scraping live chat polling endpoint (jelaskan ke saya
   trade-off-nya: pakai API resmi butuh API key & quota, vs scraping lebih rentan
   berubah tapi tanpa key)
2. TikTokConnector — gunakan tiktok-live-connector, terima @username
3. KickConnector — gunakan WebSocket Pusher Kick, terima URL/channel slug

Untuk masing-masing, tangani:
- deteksi live/tidak live (tampilkan status jelas di dashboard kalau channel sedang
  offline)
- reconnect otomatis
- error message yang jelas ditampilkan ke user kalau koneksi gagal (bukan cuma di console)

Setelah ini, unified chat feed harus bisa menampilkan chat gabungan dari 4 platform
sekaligus secara bersamaan dengan benar.
```

---

## FASE 5 — Settings System Lengkap + Persistence

```
Bangun halaman Settings dengan sidebar kategori (General, Connections, Overlay,
Appearance, Chat, Filters, Sounds, dst — daftar lengkap di bawah), search bar untuk
mencari setting, dan live preview yang langsung update overlay tanpa perlu tombol save.

[paste daftar kategori settings lengkap dari prompt awal kamu di sini]

Semua nilai setting disimpan otomatis (debounced) ke local storage (electron-store
atau SQLite, pilih salah satu dan jelaskan alasannya), dimuat ulang otomatis saat
aplikasi dibuka, serta bisa di-export/import sebagai file JSON.
```

---

## FASE 6 — Events, Highlight, Sound, TTS

```
Tambahkan dukungan event khusus per platform (gift TikTok, superchat YouTube,
cheers/bits Twitch, donation/subscriber Kick) yang tampil berbeda dari chat biasa
(animasi & warna khusus, prioritas render lebih tinggi, opsional suara).

Tambahkan Text-to-Speech (queue based, supaya tidak tumpang tindih) dan sound effects
per jenis event, semua bisa diatur lewat Settings dari Fase 5.
```

---

## FASE 7 — Filters, Rule Builder, Statistics, OBS Browser Source

```
Tambahkan:
1. Filter system (duplicate filter, flood protection, blacklist/whitelist kata, hide link/caps/bot)
2. Visual Rule Builder sederhana (IF platform/event/kondisi THEN aksi: highlight/pin/play sound)
3. Halaman Statistics (total chat, messages per minute, distribusi platform, top user, export CSV/JSON)
4. Local web server (Express, port bisa diatur) yang menyajikan endpoint
   http://localhost:PORT/overlay sebagai alternatif OBS Browser Source, menampilkan
   overlay yang sama persis dengan Desktop Overlay (reuse komponen React yang sama).
```

---

## Catatan Penting

- TikTok & Kick connector sifatnya unofficial/reverse-engineered — beri tahu Claude
  Code secara eksplisit di Fase 4 supaya connector dibungkus try-catch yang baik dan
  error-nya tidak mematikan seluruh aplikasi kalau API platform berubah.
- Jangan minta semua fase sekaligus dalam satu prompt raksasa — itu yang bikin hasil
  Claude Code jadi setengah jadi/banyak placeholder kosong.
- Setiap selesai 1 fase, jalankan dan test manual sebelum lanjut, supaya kalau ada
  bug ketahuan dari fase mana asalnya.