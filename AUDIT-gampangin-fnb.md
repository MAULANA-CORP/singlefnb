# Audit Kode — Gampangin FNB

Tanggal audit: 4 September 2026
Cakupan: seluruh `src/` (174 file TS/TSX, 70 route API, 25 halaman) + `prisma/schema.prisma`
Metode: pembacaan manual logika bisnis (`src/lib/*`), pemetaan penjagaan role di semua route API,
pelacakan alur uang (POS → Piutang → Pembayaran → Arus Kas → Neraca), dan pengecekan konsistensi
komponen dropdown.

**Status build:** ✅ lulus (`npm run build`, 0 error TypeScript).
**Status logika uang:** ❌ ada 4 kesalahan hitung kritis yang membuat Arus Kas & Neraca salah.

> ⚠️ Belum ada satu pun perbaikan yang diterapkan. Dokumen ini murni temuan.

---

## Ringkasan Temuan

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| 1 | 🔴 Kritis | Order B2B dihitung sebagai kas masuk walau belum dibayar | `src/lib/finance.ts:443` |
| 2 | 🔴 Kritis | Pembayaran B2B dobel dihitung di Arus Kas | `src/lib/finance.ts:443,452` |
| 3 | 🔴 Kritis | POS "Kredit → Langsung Lunas": uangnya hilang dari Arus Kas | `src/lib/pos.ts:67`, `finance.ts:435` |
| 4 | 🔴 Kritis | Pelunasan penuh B2B sekali bayar tidak tercatat sebagai Pembayaran | `src/lib/b2b.ts:351-375` |
| 5 | 🔴 Kritis | Timezone: "hari ini" & filter periode pakai waktu server (UTC), bukan WIB | `src/lib/period.ts:5`, `dashboard.ts:8` |
| 6 | 🟠 Tinggi | Neraca campur basis waktu (kas per tanggal, piutang/stok kondisi sekarang) | `src/lib/finance.ts:581` |
| 7 | 🟠 Tinggi | Waste produksi tidak dibebankan ke HPP tapi stok dikurangi | `src/lib/produksi.ts:86,262` |
| 8 | 🟠 Tinggi | Race condition stok — bisa minus kalau 2 kasir bersamaan | `pos.ts:104`, `b2b.ts:123`, `produksi.ts:205` |
| 9 | 🟠 Tinggi | DP kredit POS tidak tercatat sebagai baris Pembayaran | `src/lib/pos.ts:172-183` |
| 10 | 🟠 Tinggi | Owner bisa menurunkan role dirinya sendiri → terkunci selamanya | `src/app/api/owner/users/[id]/route.ts:41` |
| 11 | 🟠 Tinggi | Rumus HPP diduplikasi di client, bisa beda dengan server | `produksi-form-client.tsx:82-109` |
| 12 | 🟠 Tinggi | Grafik Arus Kas harian: sampai ~920 query untuk 3 bulan | `src/lib/finance.ts:527` |
| 13 | 🟡 Sedang | Filter outlet hanya diterapkan sebagian di Arus Kas/Neraca | `src/lib/finance.ts:452,467` |
| 14 | 🟡 Sedang | Beban global (outlet kosong) dihitung penuh di tiap outlet | `src/lib/finance.ts:312,474` |
| 15 | 🟡 Sedang | HPP "batch terakhir" mengubah laporan periode lampau secara retroaktif | `src/lib/finance.ts:74` |
| 16 | 🟡 Sedang | `stok <= stokMinimum` dengan minimum 0 → semua item stok 0 dianggap menipis | `dashboard.ts:150`, `inventory/*/route.ts:28` |
| 17 | 🟡 Sedang | Banyak endpoint list tanpa batas jumlah data | 24 route |
| 18 | 🟡 Sedang | Dashboard tidak punya filter outlet (diminta PRD §3.1) | `dashboard-client.tsx` |
| 19 | 🟡 Sedang | Status B2B "LUNAS" menutupi status "DIKIRIM" | `src/lib/b2b.ts:36-48` |
| 20 | 🟡 Sedang | Deteksi duplikat import CSV pakai data yang sedang ter-filter | `import-dialog.tsx:62` |
| 21 | 🟡 Sedang | POS tidak punya pembatalan/void | `src/app/api/pos/` |
| 22 | 🟡 Sedang | Hak tulis Supplier: UI kunci OWNER, API izinkan FINANCE | `entity-config.ts:78` vs `supplier/route.ts` |
| 23 | 🔵 Dropdown | Filter status B2B pakai pill button, bukan SearchableSelect | `order-list-client.tsx:78-94` |
| 24 | 🔵 Dropdown | Inventory: toggle & checkbox, beda pola dengan modul lain | `inventory-client.tsx:284,314` |
| 25 | 🔵 Dropdown | Report piutang: filter overdue pakai checkbox | `laporan-piutang-client.tsx:106` |
| 26 | 🔵 Dropdown | Produksi list tidak punya filter sama sekali | `produksi-list-client.tsx` |
| 27 | 🔵 Dropdown | POS list tidak punya filter rentang tanggal | `pos-list-client.tsx` |
| 28 | ⚪ Rendah | PWA belum bisa di-install (tidak ada service worker & ikon) | `public/manifest.json` |
| 29 | ⚪ Rendah | Rate limit login in-memory (hilang saat redeploy) | `api/auth/login/route.ts:10` |
| 30 | ⚪ Rendah | `.env` berisi DATABASE_URL palsu bekas uji build | `.env` |
| 31 | ⚪ Rendah | `middleware.ts` sudah deprecated di Next.js 16 | `src/middleware.ts` |
| 32 | ⚪ Rendah | Entri Modal tidak bisa diedit, hanya dihapus | `api/finance/modal/[id]/route.ts` |

---

## 🔴 KRITIS — Kesalahan Hitung Uang

### 1. Order B2B dihitung sebagai kas masuk walau belum dibayar

**Lokasi:** `src/lib/finance.ts:443-451` (query `orderB2BTunai`), akar masalah di `src/lib/b2b.ts:147`

`buatOrderB2B()` membuat order **tanpa mengisi `metodeBayar` dan `statusBayar`**, jadi Prisma memakai
default dari schema: `metodeBayar = TRANSFER_QRIS` dan `statusBayar = BELUM_BAYAR`.

Sementara itu Arus Kas menghitung kas masuk seperti ini:

```ts
prisma.orderB2B.findMany({
  where: {
    metodeBayar: { in: ["CASH", "TRANSFER_QRIS"] },   // ← tidak ada cek statusBayar
    status: { not: "BATAL" },
    createdAt: { gte: start, lte: end },
  },
  select: { total: true },
})
```

**Akibatnya:** begitu Sales membuat order B2B senilai Rp 50 juta, Arus Kas langsung menganggap
Rp 50 juta itu sudah masuk kas — padahal invoice belum terbit, barang belum dikirim, dan agen
belum bayar sepeser pun.

**Dampak:** Saldo kas di Dashboard dan Neraca kelebihan sebesar seluruh order B2B yang belum
dibayar. Ini bikin keputusan bisnis (misal ambil barang, bayar utang) berdasarkan uang yang
sebetulnya belum ada.

**Saran:** `buatOrderB2B` harus mengisi `metodeBayar` eksplisit dari input user, dan query Arus Kas
harus menambahkan syarat `statusBayar: "LUNAS"` — atau lebih bersih lagi: **semua kas masuk hanya
dihitung dari baris `Pembayaran`**, bukan dari order (lihat temuan #4).

---

### 2. Pembayaran B2B dobel dihitung

**Lokasi:** `src/lib/finance.ts:443` (penjualanTunai) + `finance.ts:452` (cicilanPiutang)

Lanjutan dari #1. Alurnya:

1. Order B2B dibuat → dihitung penuh di `penjualanTunai` (karena default `TRANSFER_QRIS`).
2. Agen bayar sebagian lewat `bayarOrder()` → dibuat `Piutang` + baris `Pembayaran`.
3. Baris `Pembayaran` itu dihitung **lagi** di `cicilanPiutang`.

**Dampak:** satu rupiah yang sama dihitung dua kali sebagai kas masuk. Semakin banyak transaksi
B2B kredit, semakin jauh melesetnya.

**Saran:** pilih satu sumber kebenaran untuk kas masuk. Rekomendasi: **hanya baris `Pembayaran`**
yang dianggap kas masuk, dan setiap transaksi lunas (termasuk POS tunai) juga menulis baris
`Pembayaran`. Dengan begitu tidak ada jalur ganda.

---

### 3. POS "Kredit → Langsung Lunas": uangnya tidak pernah masuk Arus Kas

**Lokasi:** `src/lib/pos.ts:67-69` dan `pos.ts:172`, dibaca oleh `finance.ts:435-442`

Kalau kasir memilih Kredit lalu "Langsung Lunas":

```ts
if (input.kreditTipe === "LANGSUNG_LUNAS") {
  return { statusBayar: "LUNAS", totalTerbayar: total };
}
```

Order tersimpan dengan `metodeBayar = KREDIT` dan `statusBayar = LUNAS`. Karena statusnya sudah
LUNAS, **tidak ada baris Piutang yang dibuat** (`pos.ts:172`), dan juga tidak ada baris `Pembayaran`.

Padahal Arus Kas hanya mengenali tiga jalur: order non-kredit (`CASH`/`TRANSFER_QRIS`),
DP kredit (butuh baris Piutang), dan cicilan (butuh baris Pembayaran). Transaksi ini **tidak masuk
ke satu pun dari ketiganya**.

**Dampak:** uang benar-benar diterima kasir tapi hilang total dari Arus Kas, Saldo Kas, dan Neraca.
Laba Rugi tetap benar (karena pakai basis akrual dari `total` order), jadi gejalanya:
laba kelihatan bagus tapi kas tidak nambah — persis pola yang bikin owner bingung.

**Saran:** setiap transaksi yang menerima uang harus menulis baris `Pembayaran`, apa pun metode
bayarnya.

---

### 4. Pelunasan penuh B2B sekali bayar tidak menulis baris Pembayaran

**Lokasi:** `src/lib/b2b.ts:339-375`

```ts
let piutangId = order.piutang?.id ?? null;
if (order.piutang) { /* update */ }
else if (!lunas) { /* buat Piutang baru */ piutangId = piutangBaru.id; }

if (piutangId) {          // ← kalau lunas sekali bayar & belum ada piutang, piutangId tetap null
  await tx.pembayaran.create({ ... });
}
```

Kalau agen membayar **lunas sekaligus** dan sebelumnya belum pernah ada Piutang, maka `piutangId`
tetap `null` → **tidak ada baris `Pembayaran` yang dibuat sama sekali**.

**Dampak:** (a) riwayat pembayaran di halaman Utang & Piutang kosong padahal uang sudah diterima;
(b) kas dari transaksi itu tidak terlacak lewat jalur Pembayaran; (c) hanya `statusBayar` order
yang berubah, tanpa jejak kapan dan berapa dibayar selain audit log.

**Saran:** buat baris `Pembayaran` untuk **setiap** penerimaan uang, termasuk pelunasan penuh
pertama kali, walaupun tidak ada Piutang (butuh kolom opsional yang menghubungkan Pembayaran ke
order langsung, atau selalu membuat Piutang lalu langsung menandainya LUNAS).

---

### 5. Timezone: semua "hari ini" dan filter periode pakai waktu server, bukan WIB

**Lokasi:** `src/lib/period.ts:5-33`, `src/lib/dashboard.ts:8-26`, `src/lib/finance.ts:527-553`

```ts
// period.ts
export function parseTanggalAwal(nilai: string | null): Date | null {
  const d = new Date(nilai + "T00:00:00.000");   // ← tanpa offset = waktu lokal SERVER
  ...
}
// dashboard.ts
function awalHariIni(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);  // ← lokal server
}
```

Container di EasyPanel hampir selalu berjalan pada **UTC**, sedangkan PRD menetapkan tampilan
**WIB (UTC+7)**.

**Dampak konkret:**
- "Omzet Hari Ini" di Dashboard baru berganti hari jam **07:00 WIB**, bukan tengah malam. Penjualan
  jam 00:00–07:00 WIB masuk ke omzet hari sebelumnya.
- Filter laporan "1 September – 30 September" sebenarnya mengambil 1 Sep 07:00 WIB sampai
  1 Okt 06:59 WIB → transaksi awal bulan hilang, transaksi awal bulan berikutnya ikut terhitung.
- Grafik harian (`dashboard.ts:85-100` dan `finance.ts:527`) mengelompokkan per hari **UTC**
  (`toISOString().slice(0,10)` dan `Date.UTC(...)`), lalu labelnya dirender sebagai WIB → batang
  grafik tidak sesuai dengan tanggal yang tertulis.

**Saran:** pusatkan konversi WIB di satu helper (sudah ada `tanggalWIB()` di `utils.ts`, tinggal
diperluas), dan pakai offset eksplisit `+07:00` saat membentuk batas hari/bulan, bukan
`new Date(y, m, d)` lokal server. Set juga `TZ=Asia/Jakarta` di environment container sebagai
lapis pengaman.

---

## 🟠 TINGGI

### 6. Neraca mencampur basis waktu

**Lokasi:** `src/lib/finance.ts:581-606`

`hitungNeraca(asOf)` mengambil kas kumulatif **sampai tanggal `asOf`**, tetapi:

```ts
prisma.piutang.findMany({ where: { status: { not: "LUNAS" } } }),   // ← tanpa filter asOf
prisma.utang.findMany({ where: { status: { not: "LUNAS" } } }),     // ← tanpa filter asOf
hitungNilaiStok(),                                                   // ← stok SAAT INI
```

**Dampak:** Neraca "per 31 Agustus" menampilkan kas per 31 Agustus tapi piutang, utang, dan nilai
stok per hari ini. Angkanya tidak pernah sinkron, dan inilah salah satu penyebab baris **Selisih**
tidak pernah nol (di UI sudah saya tampilkan apa adanya, tapi penyebabnya memang cacat hitung ini,
bukan sekadar pembulatan).

**Saran:** hitung piutang/utang "belum lunas per tanggal X" dari `totalTagihan − Σ Pembayaran yang
tanggalnya ≤ X`, dan nilai stok per tanggal dari saldo `StokMovement*` sampai tanggal itu — bukan
dari kolom `stok` yang selalu mencerminkan kondisi terkini.

---

### 7. Waste produksi mengurangi stok tapi tidak masuk HPP

**Lokasi:** `src/lib/produksi.ts:86` vs `produksi.ts:262`

```ts
// biaya batch — HANYA qtyPakai
const totalBiayaBahanBaku = bahanBaku.reduce((s, b) => s + b.qtyPakai * b.hargaSatuanSaatItu, 0);
...
// stok — qtyPakai DITAMBAH waste
const totalKurang = line.qtyPakai + waste;
await tx.bahanBaku.update({ data: { stok: { decrement: totalKurang } } });
```

**Dampak:** bahan yang terbuang nilainya lenyap dari pembukuan — tidak masuk HPP, tidak masuk beban,
tapi aset (stok) berkurang. Aset turun tanpa ada biaya yang mengimbangi → Neraca timpang, dan
HPP per botol terlihat lebih murah dari kenyataan. Kalau waste besar (umum di FNB), margin yang
dilaporkan jadi terlalu optimis.

**Saran:** putuskan dulu kebijakannya — (a) waste dibebankan ke HPP produk (paling umum di FNB,
tinggal ubah `qtyPakai` jadi `qtyPakai + qtyWaste` di perhitungan biaya), atau (b) waste jadi
beban operasional terpisah supaya kelihatan besarnya di Laba Rugi. Yang sekarang (hilang begitu
saja) bukan salah satu dari keduanya.

---

### 8. Race condition stok — stok bisa jadi minus

**Lokasi:** `src/lib/pos.ts:104-113`, `src/lib/b2b.ts:123-135`, `src/lib/produksi.ts:205-227`

Polanya sama di ketiga modul: baca stok → validasi → `decrement`. Semuanya di dalam
`$transaction`, tapi PostgreSQL default (Read Committed) **tidak mengunci baris yang hanya dibaca**.

**Dampak:** dua kasir yang menjual produk yang sama bersamaan (stok 5, masing-masing jual 4) bisa
lolos validasi berdua → stok jadi −3. Ini melanggar aturan PRD "stok tidak boleh minus, tanpa
override". Makin mungkin terjadi karena app ini memang dipakai banyak orang di HP sekaligus.

**Saran:** ganti pola jadi decrement bersyarat lalu cek hasilnya:

```ts
const res = await tx.produkJadi.updateMany({
  where: { id, stok: { gte: qty } },
  data: { stok: { decrement: qty } },
});
if (res.count === 0) throw new PosError(`Stok "${nama}" tidak cukup`);
```

---

### 9. DP kredit POS tidak tercatat sebagai Pembayaran

**Lokasi:** `src/lib/pos.ts:172-183`

Saat Kredit Parsial dengan DP, Piutang dibuat dengan `totalTerbayar = dp`, tapi **tidak ada baris
`Pembayaran`** untuk DP itu.

**Dampak:**
- Riwayat cicilan di halaman Utang & Piutang tidak menampilkan DP → pelanggan protes "saya sudah
  bayar DP" tapi tidak ada jejaknya selain angka agregat.
- Arus Kas terpaksa menebak DP lewat rumus rapuh di `finance.ts:379-426`
  (`totalTerbayar − Σ Pembayaran`). Rumus ini benar hari ini, tapi akan langsung salah begitu ada
  koreksi manual pada `totalTerbayar`, atau begitu modul B2B dan POS diseragamkan.
- Perlakuannya beda dengan B2B (yang selalu bikin baris Pembayaran) → dua modul, dua aturan.

**Saran:** POS ikut menulis baris `Pembayaran` untuk DP, lalu hapus fungsi `hitungDpKreditAwal()`
sepenuhnya.

---

### 10. Owner bisa mengunci dirinya sendiri dari Owner Room

**Lokasi:** `src/app/api/owner/users/[id]/route.ts:41-55`

Menonaktifkan akun sendiri sudah dicegah:

```ts
if (id === user.id && body.isActive === false) { return 400 }
```

Tapi **mengubah role sendiri tidak dicegah**, dan tidak ada pengaman "OWNER terakhir".

**Dampak:** Owner yang salah klik mengubah rolenya jadi SALES akan langsung kehilangan akses
Owner Room, User Management, dan Reset Data — dan tidak ada jalan balik lewat UI. Satu-satunya
pemulihan adalah edit manual di database.

**Saran:** tolak perubahan role atas diri sendiri, dan tolak perubahan yang membuat jumlah OWNER
aktif jadi nol.

---

### 11. Rumus HPP diduplikasi di client

**Lokasi:** `src/app/(app)/produksi/baru/produksi-form-client.tsx:82-109` vs `src/lib/produksi.ts:81-124`

Preview HPP di form produksi **menulis ulang** seluruh rumus alokasi, bukan memanggil
`hitungAlokasiHPP()` dari `@/lib/produksi`. Hari ini hasilnya identik (saya bandingkan baris per
baris), tapi ini melanggar aturan "logika bisnis hanya di `src/lib`".

**Dampak:** begitu rumus di server diubah (misal waste ikut dibebankan — temuan #7), preview di
layar akan menampilkan angka berbeda dari yang tersimpan, tanpa error apa pun.

**Saran:** ekspor fungsi murni `hitungAlokasiHPP` (sudah bebas I/O) dan impor langsung di client.

---

### 12. Grafik Arus Kas harian menembak ratusan query

**Lokasi:** `src/lib/finance.ts:527-553`

```ts
const hasil = await Promise.all(
  dibatasi.map(async (h) => { ... await hitungArusKas({ start: mulaiHari, end: akhirHari }) })
);
```

Setiap hari memanggil `hitungArusKas()` yang menjalankan ~8 query + `hitungDpKreditAwal()`
(2 query lagi). Untuk rentang 92 hari → **± 920 query paralel** dalam satu request.

**Dampak:** halaman Arus Kas berpotensi memakan connection pool dan timeout begitu data mulai
banyak. `hitungSaldoKasKumulatif()` (dipakai Neraca & Dashboard) juga memindai seluruh tabel sejak
epoch setiap kali dibuka.

**Saran:** ganti dengan satu query agregasi per sumber, di-`GROUP BY` tanggal di sisi database
(`$queryRaw` dengan `date_trunc`), lalu gabungkan di memori.

---

## 🟡 SEDANG

### 13. Filter outlet hanya diterapkan sebagian

**Lokasi:** `src/lib/finance.ts:452-479`

`Pembayaran` (cicilan piutang & utang) dan `Modal` tidak punya kolom outlet, jadi saat user memilih
outlet tertentu, angka masuk/keluar tetap mencampur seluruh outlet, sementara penjualan dan
pembelian sudah ter-filter. Hasilnya angka campuran yang tidak berarti apa-apa.

**Saran:** entah tambahkan `outletId` ke `Pembayaran`, atau nonaktifkan filter outlet di Arus Kas
& Neraca dengan keterangan jelas bahwa laporan ini selalu company-wide.

### 14. Beban global dihitung penuh di setiap outlet

**Lokasi:** `src/lib/finance.ts:312` dan `:474`

```ts
...(outletId ? { OR: [{ outletId }, { outletId: null }] } : {})
```

Pengeluaran tanpa outlet (gaji owner, sewa kantor) ikut dihitung penuh di P&L **setiap** outlet.
Kalau ada 3 outlet, beban Rp 10 juta muncul sebagai Rp 10 juta di ketiga laporan (total terbaca
seolah Rp 30 juta saat dibandingkan).

**Saran:** sediakan opsi alokasi (rata, proporsional omzet, atau tidak dialokasikan sama sekali)
dan beri label eksplisit di laporan.

### 15. HPP "batch terakhir" mengubah laporan lampau

**Lokasi:** `src/lib/finance.ts:74-115`

HPP per unit selalu diambil dari batch produksi **paling baru**, lalu dipakai untuk semua penjualan
di periode mana pun. Artinya Laba Rugi bulan Januari bisa berubah hari ini hanya karena ada
produksi baru dengan harga bahan berbeda.

**Dampak:** laporan periode tertutup tidak stabil — tidak bisa dijadikan pegangan.

**Saran:** simpan snapshot HPP per unit di `OrderPOSItem`/`OrderB2BItem` saat penjualan terjadi
(kolom `hppSatuanSaatItu`), sehingga laporan lampau tidak pernah berubah.

### 16. Alert "stok menipis" banjir karena minimum 0

**Lokasi:** `src/lib/dashboard.ts:150-157`, `src/app/api/inventory/*/route.ts:28`

Syaratnya `stok <= stokMinimum`. Karena `stokMinimum` default 0 (di schema dan di import CSV),
setiap item yang stoknya 0 dan belum diatur minimumnya (0 ≤ 0) langsung muncul sebagai "menipis".

**Dampak:** hari pertama pakai app, daftar stok menipis penuh oleh semua produk baru → alert-nya
jadi tidak dipercaya lagi.

**Saran:** hanya anggap menipis kalau `stokMinimum > 0 && stok <= stokMinimum`, dan tampilkan item
`stok = 0` di kelompok terpisah ("habis") supaya tetap kelihatan tanpa mengubur yang lain.

### 17. Endpoint list tanpa batas jumlah

24 route memakai `findMany` tanpa `take`, termasuk `report/penjualan` (semua order sepanjang
periode), `piutang`, `utang`, `pembelian`, semua list Database dan Inventory.

**Dampak:** setelah setahun operasi, halaman laporan bisa menarik puluhan ribu baris ke browser
sekaligus.

**Saran:** batasi default (mis. 200) + pagination, atau minimal `take: 1000` dengan peringatan
"data dipotong".

### 18. Dashboard tidak punya filter outlet

PRD §3.1 menyebut "Filter per outlet (untuk Owner/Finance yang lihat semua outlet)". Dashboard
sekarang selalu menampilkan agregat seluruh outlet.

### 19. Status B2B "LUNAS" menutupi "DIKIRIM"

**Lokasi:** `src/lib/b2b.ts:36-48`

```ts
if (params.statusBayar === "LUNAS") return "LUNAS";      // dicek sebelum adaSuratJalan
if (params.adaSuratJalan) return "DIKIRIM";
```

Order yang **sudah dibayar lunas tapi belum dikirim** berstatus "LUNAS", dan hilang dari filter
"DIKIRIM".

**Dampak:** risiko operasional nyata — barang belum keluar gudang tapi di daftar tampak selesai.

**Saran:** pisahkan dua dimensi (status pengiriman vs status bayar) dan tampilkan dua badge,
jangan dipaksa jadi satu enum.

### 20. Deteksi duplikat import CSV memakai data yang sedang ter-filter

**Lokasi:** `src/app/(app)/database/_components/import-dialog.tsx:62`

```ts
const existingMap = new Map(existingItems.map((e) => [normalizeNama(e.nama), e.id]));
```

`existingItems` adalah `rows` dari tabel yang **sudah difilter oleh kotak pencarian**.

**Dampak:** kalau user mengetik sesuatu di kotak cari lalu import, preview akan menandai baris
sebagai "Baru" padahal sebenarnya "Update". (Server tetap memutuskan dengan benar saat commit,
jadi datanya aman — tapi preview-nya menyesatkan.)

**Saran:** ambil daftar nama lengkap dari server khusus untuk preview, atau pindahkan seluruh
klasifikasi ke endpoint preview di server.

### 21. POS tidak punya pembatalan/void

B2B punya `batalOrder` (dengan pengembalian stok), POS tidak punya sama sekali. Salah input di
kasir tidak bisa dikoreksi selain lewat penyesuaian stok manual + entri keuangan tandingan.

### 22. Hak tulis Supplier tidak konsisten UI vs API

`entity-config.ts:78` memberi `writeRoles: ["OWNER"]` (tombol Tambah/Edit disembunyikan dari
FINANCE), tetapi `api/database/supplier/route.ts` memakai `withOwnerFinance` (FINANCE boleh
menulis). Bukan lubang keamanan, tapi aturannya harus dipilih satu — PRD §7 bilang Supplier itu
OWNER-only, sementara alur Pembelian memang butuh FINANCE bisa menambah supplier baru.

---

## 🔵 KONSISTENSI DROPDOWN (permintaan khusus)

**Kabar baik:** tidak ada satu pun `<select>` HTML polos atau Radix Select telanjang di seluruh
codebase. 59 pemakaian `SearchableSelect` tersebar di 20 file, semuanya sudah sepaket dengan
searchbox. Yang berikut ini adalah kontrol pilihan yang **belum** memakai pola itu:

### 23. Filter status B2B pakai pill button
`src/app/(app)/b2b/_components/order-list-client.tsx:78-94` — 7 status dirender sebagai deretan
tombol bulat. Di layar HP 375px deretan ini membungkus jadi 2–3 baris dan memakan ruang, serta
tidak bisa dicari. Modul POS untuk kebutuhan yang sama sudah memakai `SearchableSelect`
(`pos-list-client.tsx`) → tidak konsisten antar modul.

### 24. Inventory memakai toggle + checkbox
`inventory-client.tsx:284,292` — toggle "Stok / Riwayat" berupa pill button, sementara modul lain
(Owner Room, Database, Finance Room, Utang & Piutang) memakai komponen `Tabs`.
`inventory-client.tsx:314` — filter "hanya stok menipis" berupa checkbox.

### 25. Report Piutang memakai checkbox
`laporan-piutang-client.tsx:106` — filter "hanya overdue > 30 hari" berupa checkbox, sedangkan
filter serupa di halaman Utang & Piutang memakai `SearchableSelect`.

### 26. Halaman Produksi tidak punya filter apa pun
`produksi-list-client.tsx` — tidak ada filter outlet maupun rentang tanggal, padahal batch akan
menumpuk cepat dan modul lain semuanya punya filter.

### 27. POS list tidak punya filter rentang tanggal
`pos-list-client.tsx` punya filter pencarian, status, outlet, dan metode bayar, tapi tidak ada
rentang tanggal — padahal daftar transaksi kasir adalah yang paling cepat menumpuk.

**Saran menyeluruh:** seragamkan jadi satu pola — setiap pilihan (termasuk yang cuma 2 opsi)
memakai `SearchableSelect`, setiap perpindahan panel memakai `Tabs`, dan setiap halaman daftar
transaksi punya minimal filter periode + outlet.

---

## ⚪ RENDAH / CATATAN

| # | Temuan | Catatan |
|---|--------|---------|
| 28 | PWA belum bisa di-install | `manifest.json` menunjuk ke `/icons/icon-192.png` & `icon-512.png` yang **belum ada file-nya**, dan tidak ada service worker. Permintaan awal "wajib PWA" baru terpenuhi sebagian (layout sudah mobile-first, tapi belum bisa di-Add to Home Screen dengan benar). |
| 29 | Rate limit login in-memory | `api/auth/login/route.ts:10` menyimpan hitungan di `Map` proses. Hilang setiap redeploy dan tidak berlaku lintas replica. Cukup untuk 1 container, perlu Redis/DB kalau nanti di-scale. |
| 30 | `.env` berisi kredensial palsu | Saya membuat `.env` berisi `DATABASE_URL` dummy untuk menguji build. **Harus diganti** sebelum dipakai. (Sudah masuk `.gitignore`, jadi tidak akan ter-commit.) |
| 31 | `middleware.ts` deprecated | Next.js 16 memberi peringatan agar diganti jadi konvensi `proxy`. Masih jalan normal sekarang, tapi akan jadi masalah saat upgrade mayor berikutnya. |
| 32 | Entri Modal tidak bisa diedit | `api/finance/modal/[id]/route.ts` hanya punya DELETE, tidak ada PATCH. Salah ketik nominal modal harus dihapus lalu dibuat ulang (jejak audit jadi dua baris). |
| 33 | Qty selalu 3 desimal | `inventory-client.tsx:347` menampilkan `formatAngka(x, 3)` sehingga "10 pcs" tampil sebagai "10,000" — membingungkan untuk satuan yang tidak pecahan. |

---

## Urutan Perbaikan yang Disarankan

**Tahap 1 — sebelum dipakai untuk transaksi asli (wajib):**
1. Rombak jalur kas: satu sumber kebenaran lewat tabel `Pembayaran` (menyelesaikan #1, #2, #3, #4, #9 sekaligus)
2. Perbaiki timezone jadi WIB di semua batas hari/periode (#5)
3. Ganti pola pengurangan stok jadi decrement bersyarat (#8)
4. Putuskan kebijakan waste dan terapkan (#7)

**Tahap 2 — sebelum data menumpuk:**
5. Snapshot HPP saat penjualan (#15), perbaiki basis waktu Neraca (#6)
6. Ganti grafik harian dengan agregasi SQL (#12), tambah batas jumlah data (#17)
7. Pengaman lockout Owner (#10), pisahkan status kirim vs bayar B2B (#19)

**Tahap 3 — kerapian & UX:**
8. Seragamkan dropdown & filter (#23–#27), impor rumus HPP dari lib (#11)
9. Perbaiki alert stok menipis (#16), filter outlet Dashboard (#18)
10. Void POS (#21), ikon + service worker PWA (#28)

---

## Yang Sudah Benar (tidak perlu diubah)

Supaya seimbang, ini bagian yang saya periksa dan **tidak** menemukan masalah:

- **Rumus alokasi HPP produksi** (`produksi.ts:81-124`) — sudah saya trace ulang dengan angka
  contoh: batch Rp 100.000 → Chili Oil 50gr×10 = Rp 667/botol, 100gr×20 = Rp 1.333/botol,
  500gr×10 = Rp 6.667/botol, total teralokasi Rp 100.000. Cocok persis, termasuk penanganan
  produk tanpa `beratBersih`.
- **Agregasi kebutuhan bahan per item sebelum validasi stok** (`produksi.ts:200-227`) — sudah benar
  menangani kasus bahan yang sama diinput di beberapa baris.
- **Validasi pembayaran** (`utang-piutang.ts:52-137`) — cek melebihi sisa tagihan, toleransi
  pembulatan, update status dan `totalTerbayar` dalam satu transaksi: semuanya rapi.
- **Reset Data** (`reset-data.ts`) — urutan hapus sudah aman terhadap foreign key, frasa konfirmasi
  divalidasi ulang di server (bukan hanya di UI), role dicek dua kali, dan audit log ditulis setelah
  transaksi commit sehingga jejak resetnya tetap ada.
- **Penjagaan role di 70 route API** — sudah konsisten dengan PRD §7, kecuali satu ketidakcocokan
  UI-vs-API pada Supplier (#22). Role selalu dibaca fresh dari database, tidak pernah dari cookie.
- **User Management** — password di-hash bcrypt cost 10, `passwordHash` tidak pernah ikut di
  response mana pun, audit log hanya menandai "(direset)" tanpa menyimpan nilainya.
- **Konversi Decimal → Number** sebelum JSON di seluruh serializer: konsisten, tidak ada kebocoran
  objek Decimal ke client.
