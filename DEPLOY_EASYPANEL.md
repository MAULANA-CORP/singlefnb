# Deploy Gampangin FNB ke EasyPanel

## 1. Buat PostgreSQL
EasyPanel → Services → New Service → **PostgreSQL**.
Catat host, port, user, password, nama database.
Connection string: `postgresql://USER:PASSWORD@HOST:5432/DATABASE`
Pakai **host internal**, bukan alamat publik.

## 2. Push ke GitHub
```bash
git init && git add . && git commit -m "initial commit"
git remote add origin <url-repo>
git push -u origin master
```
Pastikan `.env` **tidak** ikut ter-commit (cek `.gitignore`).

## 3. Buat App
New Service → **App** → Source: GitHub → pilih repo
- Build Method: **Dockerfile**
- Port: **3000**
- Isi semua environment variable dari `.env.example`

## 4. Migrasi + seed (sekali saja)
Setelah container jalan, buka Terminal service app:
```bash
npx prisma migrate deploy
npm run db:seed
```

## 5. Domain
EasyPanel → Domains → `fnb.gampangin.biz.id` → arahkan ke port 3000.

## 6. Login pertama
- Username: `admin`
- Password: `admin123` (atau isi `SEED_ADMIN_PASSWORD`)
- **Ganti password setelah masuk pertama kali** (lewat Owner Room → User Management).

## Update berikutnya
Push ke GitHub → EasyPanel → Deploy.
Kalau schema database berubah, jalankan lagi `npx prisma migrate deploy`.

## Kalau bermasalah
| Gejala | Cek |
|---|---|
| Build gagal di `prisma generate` | Blok `generator` di `prisma/schema.prisma` |
| Runtime error koneksi DB | `DATABASE_URL` pakai host internal? |
| Login gagal terus | Sudah jalan `npm run db:seed`? |
| Halaman blank / 500 | Cek log container, biasanya env kurang (`SESSION_SECRET`) |
| Menu tidak muncul sesuai role | Role dibaca fresh dari DB tiap request — cek kolom `role` user di tabel `users` |
