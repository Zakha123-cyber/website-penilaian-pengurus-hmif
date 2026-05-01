# Website Penilaian Pengurus HMIF UNEJ

Sistem evaluasi kinerja pengurus **HMIF (Himpunan Mahasiswa Informatika) Universitas Jember**. Anggota saling menilai berdasarkan indikator yang disesuaikan dengan hierarki organisasi.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Drizzle ORM |
| Auth | JWT (jose) + bcryptjs |
| UI | Tailwind CSS v4, Shadcn/UI, Radix UI |
| Email | Nodemailer |

---

## Prasyarat

- Node.js **v18+**
- Akun [Neon](https://neon.tech) (PostgreSQL cloud) — atau PostgreSQL lokal
- npm / yarn / pnpm

---

## Instalasi & Setup

### 1. Clone dan install dependencies

```bash
git clone <repo-url>
cd website-penilaian-pengurus
npm install
```

### 2. Buat file `.env`

Salin `.env.example` (atau buat baru) dengan isi berikut:

```env
# PostgreSQL — gunakan connection string dari Neon atau lokal
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Secret untuk JWT session (minimal 32 karakter acak)
AUTH_SECRET="isi_dengan_string_acak_panjang"

# Password default untuk user yang di-seed
SEED_DEFAULT_PASSWORD="password_default_anda"

# Konfigurasi SMTP untuk pengiriman email kredensial (opsional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email@gmail.com
SMTP_PASS=app_password
SMTP_FROM="Nama Sistem <email@gmail.com>"
```

### 3. Push schema ke database

```bash
npm run db:push
```

### 4. Jalankan seeder

```bash
npm run db:seed
```

Seeder akan membuat:
- **1 periode** aktif (2025/2026)
- **6 divisi**: BPI, PSDM, Kewirausahaan, Mediatek, Humas, Litbang
- **4 subdivisi**: HUBLU & KONTEN (Humas), MEDIA & TEKNO (Mediatek)
- **22 user** dengan berbagai role dan divisi
- **33 indikator** periodik (per pasangan hierarki) + 5 indikator proker
- **1 event periodik** — *Evaluasi Tengah Periode 2025/2026*
- **1 event proker** — *Evaluasi Proker Pengembangan SDM* (divisi PSDM)
- Assignment evaluasi di-generate otomatis untuk kedua event

### 5. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Cara Test / Mencoba Sistem

### Akun yang tersedia setelah seed

Semua akun menggunakan password dari `SEED_DEFAULT_PASSWORD` di `.env` (default: `jayalahhimpunanku`).

| NIM | Nama | Role | Divisi | Subdivisi |
|---|---|---|---|---|
| `18082018` | Super Admin | ADMIN | — | — |
| `20010001` | Andi Pratama | BPI | BPI | — |
| `20020001` | Budi Santoso | KADIV | PSDM | — |
| `20020002` | Citra Dewi | ANGGOTA | PSDM | — |
| `20020003` | Dian Rahmat | ANGGOTA | PSDM | — |
| `20030001` | Eka Putri | KADIV | Kewirausahaan | — |
| `20030002` | Fajar Nugroho | ANGGOTA | Kewirausahaan | — |
| `20030003` | Gita Lestari | ANGGOTA | Kewirausahaan | — |
| `20040001` | Hendra Wijaya | KADIV | Mediatek | — |
| `20040002` | Irma Sari | KASUBDIV | Mediatek | MEDIA |
| `20040003` | Joko Susilo | ANGGOTA | Mediatek | MEDIA |
| `20040004` | Kartika Sari | KASUBDIV | Mediatek | TEKNO |
| `20040005` | Lutfi Hakim | ANGGOTA | Mediatek | TEKNO |
| `20050001` | Maya Indah | KADIV | Humas | — |
| `20050002` | Nanda Rizki | KASUBDIV | Humas | HUBLU |
| `20050003` | Ovi Rahmawati | ANGGOTA | Humas | HUBLU |
| `20050004` | Putra Armanda | KASUBDIV | Humas | KONTEN |
| `20050005` | Qori Fathonah | ANGGOTA | Humas | KONTEN |
| `20060001` | Rendi Saputra | KADIV | Litbang | — |
| `20060002` | Sinta Mawarni | ANGGOTA | Litbang | — |
| `20060003` | Taufik Hidayat | ANGGOTA | Litbang | — |

### Alur test sebagai Admin

1. Login dengan NIM `18082018`
2. Masuk ke `/dashboard`
3. Cek menu: **Period**, **Divisi**, **User**, **Indikator**, **Event**, **Proker**, **Hasil**
4. Coba buat indikator baru, event baru, atau kelola user

### Alur test sebagai Evaluator

1. Login dengan NIM salah satu user (misal `20020002` — Citra Dewi, ANGGOTA PSDM)
2. Masuk ke `/evaluations`
3. Lihat daftar event yang terbuka
4. Klik event → isi penilaian untuk setiap orang yang di-assign
5. Submit semua penilaian

### Hierarki penilaian periodik

| Role Penilai | Menilai Siapa |
|---|---|
| **BPI** | Sesama BPI + semua KADIV + semua KASUBDIV |
| **KADIV** | BPI + KASUBDIV sedivisi + ANGGOTA sedivisi |
| **KASUBDIV** | KADIV sedivisi + ANGGOTA sesubdivisi |
| **ANGGOTA** | BPI + KADIV sedivisi + KASUBDIV sedivisi + sesama ANGGOTA sedivisi |

### Penilaian proker

Semua panitia proker saling menilai satu sama lain dengan indikator general (tidak ada hierarki).

---

## Reset Database

Untuk menghapus semua data dan mulai dari awal:

### Jika menggunakan Neon (cloud)

1. Buka [console.neon.tech](https://console.neon.tech)
2. Pilih project → **SQL Editor**
3. Jalankan:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
4. Lalu:
```bash
npm run db:push
npm run db:seed
```

### Jika menggunakan PostgreSQL lokal

```bash
# Drop dan recreate database
psql -U postgres -c "DROP DATABASE nama_db; CREATE DATABASE nama_db;"

# Atau truncate semua tabel
psql -U postgres -d nama_db -c "TRUNCATE TABLE evaluationscore, evaluation, indicatorsnapshot, panitia, evaluationevent, proker, indicator, \"user\", subdivision, division, period, auditlog CASCADE;"

# Push schema ulang
npm run db:push

# Seed data
npm run db:seed
```

---

## Scripts

| Perintah | Keterangan |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan production server |
| `npm run db:push` | Push schema Drizzle ke database |
| `npm run db:generate` | Generate file migration SQL |
| `npm run db:migrate` | Jalankan migration |
| `npm run db:seed` | Isi database dengan data awal |

---

## Struktur Role

| Role | Deskripsi |
|---|---|
| `ADMIN` | Akses penuh ke semua fitur dashboard |
| `BPI` | Board Pengawas Internal — menilai KADIV & KASUBDIV |
| `KADIV` | Kepala Divisi — menilai BPI, KASUBDIV, dan anggota divisinya |
| `KASUBDIV` | Kepala Sub Divisi — khusus divisi Mediatek & Humas |
| `ANGGOTA` | Anggota biasa |

---

## Catatan

- Role `KASUBDIV` hanya tersedia untuk divisi **Mediatek** dan **Humas**
- Indikator penilaian dibedakan antara **Periodik** (per pasangan hierarki) dan **Proker** (general)
- Password default dapat diubah di `.env` sebelum menjalankan seed
