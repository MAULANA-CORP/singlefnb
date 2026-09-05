# Gampangin FNB

Aplikasi manajemen operasional untuk bisnis Food & Beverage: POS (retail), B2B, Utang & Piutang,
Database master data, Proses Produksi, Inventory, Finance Room (Modal/Arus Kas/Laba Rugi/Neraca),
Pengeluaran, Report, Panduan, dan Owner Room.

Lihat spesifikasi lengkap di [`PRD-gampangin-fnb.md`](./PRD-gampangin-fnb.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 + `@prisma/adapter-pg` ·
PostgreSQL · iron-session (username + password) · Radix UI · cmdk · lucide-react · sonner.

## Jalan lokal

1. Install dependencies:
   ```bash
   npm install
   ```
2. Salin `.env.example` ke `.env`, isi `DATABASE_URL` (PostgreSQL lokal atau remote) dan
   `SESSION_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. Push schema ke database & seed data awal:
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. Jalankan dev server:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:3000`, login dengan `admin` / `admin123` (ganti setelah masuk).

## Struktur folder

```
src/
├── app/
│   ├── api/             route handlers per modul
│   ├── (app)/            halaman yang butuh login (sidebar+topbar otomatis)
│   │   ├── dashboard/
│   │   ├── pos/
│   │   ├── b2b/
│   │   ├── keuangan/utang-piutang/
│   │   ├── database/
│   │   ├── produksi/
│   │   ├── inventory/
│   │   ├── finance/
│   │   ├── pengeluaran/
│   │   ├── report/
│   │   ├── panduan/
│   │   └── owner-room/
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── layout/          Sidebar, AppLayout, nav-items
│   └── ui/               komponen bersama (SearchableSelect wajib untuk semua dropdown)
├── lib/
│   ├── prisma.ts, session.ts, api-helpers.ts (withAuth/withRole), utils.ts
│   └── <domain>.ts      logika bisnis per modul, terpisah dari route handler
├── generated/prisma/    hasil `prisma generate` (di .gitignore)
└── middleware.ts
```

## Role

`OWNER`, `FINANCE`, `SALES`, `PRODUKSI` — akses per modul ada di §7 PRD ("Role & Akses").
Role selalu dibaca fresh dari database di setiap request (bukan dari cookie), supaya perubahan
role/nonaktif-kan user langsung berlaku.

## Belum selesai / perlu ditindaklanjuti

- **Ikon PWA** (`public/icons/icon-192.png`, `icon-512.png`) belum ada file gambarnya — tambahkan
  sebelum deploy supaya "Add to Home Screen" di HP punya ikon yang benar.
- **Service worker PWA** belum dipasang (`@serwist/next`) — app sudah punya `manifest.json` dan
  mobile-first layout, tapi belum bisa dipasang offline. Tambahkan kalau instalasi home-screen
  penuh (bukan sekadar mobile-responsive) dibutuhkan.
- Ganti password `admin` setelah deploy pertama kali.
- Lihat catatan asumsi di setiap modul (COGS/HPP costing method, alokasi Arus Kas) — ditulis
  sebagai komentar kode di `src/lib/finance.ts` dan `src/lib/produksi.ts`, tinjau sebelum
  dipakai untuk keputusan bisnis besar.

## Deploy

Lihat [`DEPLOY_EASYPANEL.md`](./DEPLOY_EASYPANEL.md).
# Auto-deploy trigger
