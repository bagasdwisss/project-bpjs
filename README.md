# Sistem Informasi Absensi dan Penilaian BPJS Ketenagakerjaan

Aplikasi web modern untuk manajemen absensi, penilaian peserta magang/pelatihan, monitoring performa, forum diskusi, dan sertifikat di BPJS Ketenagakerjaan.

Dibangun dengan **React 19 + Vite** (Frontend), **Express Serverless API** (Backend), dan **Neon Serverless PostgreSQL** (Database). Siap dideploy 100% gratis di **Vercel**.

---

## 🌟 Fitur Utama

- **Multi-Role Authentication**: Administrator, Koordinator, dan Peserta dengan JWT Authentication.
- **Admin Panel**:
  - Manajemen User & Role (CRUD).
  - Manajemen Batch & Program Pelatihan.
  - Monitoring Serverless & Log Aktivitas Real-time.
  - Broadcast Pengumuman ke seluruh pengguna.
  - Backup & Snapshot Neon PostgreSQL Database.
  - Import / Export data peserta via Excel (.xlsx).
  - Generate Laporan Rekapitulasi Otomatis.
- **Koordinator Panel**:
  - Penilaian Peserta (Hard Skill & Soft Skill).
  - Monitoring Absensi Peserta.
  - Penerbitan Sertifikat Kelulusan Peserta.
  - Forum Diskusi Interaktif dengan Peserta.
- **Peserta Panel**:
  - Presensi Mandiri (Geolocation & Waktu).
  - Melihat Nilai & Riwayat Hasil Evaluasi.
  - Jadwal & Kalender Kegiatan.
  - Forum Tanya Jawab & Konsultasi.
  - Unduh Dokumen & Materi Pelatihan.

---

## 🚀 Arsitektur & Teknologi

- **Frontend**: React 19, Vite, Tailwind CSS, Bootstrap & Lucide React, Chart.js.
- **Backend API**: Node.js, Express Serverless Functions (`/api`), CORS, JWT, Bcrypt.
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech) dengan Connection Pooling (`@neondatabase/serverless` / `pg`).
- **Hosting**: [Vercel](https://vercel.com) (Frontend CDN + Serverless Functions).

---

## 🛠️ Panduan Menjalankan di Lokal (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Environment Variable
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi database Neon Anda di `.env`:
```env
VITE_API_URL=/api
DATABASE_URL=postgresql://[user]:[password]@[neon-host]/[dbname]?sslmode=require
JWT_SECRET=rahasia-bpjs-super-secret-key
```

### 3. Inisialisasi Database Neon
Jalankan skrip migrasi otomatis untuk membuat seluruh tabel dan data awal di Neon PostgreSQL:
```bash
npm run db:init
```

### 4. Menjalankan Aplikasi
Buka dua terminal:
- **Terminal 1 (Backend Express)**:
  ```bash
  npm run server
  ```
- **Terminal 2 (Frontend Vite)**:
  ```bash
  npm run dev
  ```
Akses di browser: `http://localhost:3000`

---

## ☁️ Panduan Deploy Gratis ke Vercel

1. Buka [Vercel Dashboard](https://vercel.com/dashboard) -> Klik **"Add New..."** -> **"Project"**.
2. Pilih repository: `project-bpjs`.
3. Vercel akan otomatis mendeteksi konfigurasi:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Di bagian **Environment Variables**, tambahkan:
   - `DATABASE_URL`: Connection string PostgreSQL dari [Neon](https://console.neon.tech).
   - `JWT_SECRET`: Token secret bebas (contoh: `bpjs-secret-token-2026`).
5. Klik **Deploy**!
   Aplikasi Anda langsung aktif di domain `https://project-bpjs-xxxx.vercel.app`.

---

## 👥 Akun Default untuk Login

| Role | Username / NIK | Password |
|---|---|---|
| **Administrator** | `ADM001` | `password123` |
| **Koordinator** | `KO001` (Fedro) | `password123` |
| **Peserta** | `PES001` (Arthur) | `password123` |
