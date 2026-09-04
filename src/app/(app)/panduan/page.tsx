import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Store, Users, Database, Factory, ShoppingCart, Briefcase, Wallet, LayoutDashboard, Shield, Calculator } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ===========================================================================
// TAB 1: QUICK START
// ===========================================================================

interface Step {
  no: number;
  title: string;
  icon: LucideIcon;
  body: ReactNode;
  contoh?: string;
}

const steps: Step[] = [
  {
    no: 1,
    title: "Atur Pengaturan Toko & Tambah Outlet",
    icon: Store,
    body: (
      <>
        <p>
          Mulai dari menu <strong>Owner Room → Pengaturan Toko</strong>. Isi nama brand/toko Anda dan upload
          logo — nama ini langsung muncul di header sidebar.
        </p>
        <p>
          Lanjut ke bagian <strong>Daftar Outlet</strong> di tab yang sama, tambahkan cabang/outlet yang Anda punya.
          Minimal harus ada 1 outlet aktif supaya transaksi bisa dicatat.
        </p>
      </>
    ),
    contoh: 'misal: Nama Toko "Chili Oil Nusantara", Outlet "Dapur Pusat - Bandung"',
  },
  {
    no: 2,
    title: "Tambah User Staff",
    icon: Users,
    body: (
      <>
        <p>
          Masih di <strong>Owner Room → User Management</strong>, buatkan akun untuk tim Anda: Sales untuk yang
          jualan, Produksi untuk yang di dapur, Finance untuk yang pegang keuangan.
        </p>
        <p>Setiap akun butuh username &amp; password sendiri, dan boleh dikaitkan ke outlet tertentu.</p>
      </>
    ),
    contoh: 'misal: User "Budi Santoso", username "budi", role "Sales", outlet "Dapur Pusat - Bandung"',
  },
  {
    no: 3,
    title: "Isi Database (Master Data)",
    icon: Database,
    body: (
      <>
        <p>
          Buka menu <strong>Database</strong>, isi 6 data master: Bahan Baku, Kemasan, Produk Jadi, Customer, Agen,
          dan Supplier.
        </p>
        <p>
          Bisa <strong>import CSV</strong> kalau datanya banyak (lebih cepat), atau <strong>entry manual</strong>{" "}
          satu-satu kalau baru mulai. Customer &amp; Agen baru juga otomatis kebentuk sendiri saat transaksi pertama —
          jadi tidak wajib diisi semua di awal.
        </p>
      </>
    ),
    contoh: 'misal: Bahan Baku "Gula Pasir", satuan "kg", stok awal "50"',
  },
  {
    no: 4,
    title: "Contoh Input Produksi Batch Pertama",
    icon: Factory,
    body: (
      <>
        <p>
          Buka menu <strong>Proses Produksi</strong>, buat batch baru. Pilih Bahan Baku yang dipakai (boleh lebih
          dari satu), catat kalau ada waste/susut, lalu isi Kemasan yang dipakai.
        </p>
        <p>
          Terakhir isi Produk Jadi hasil produksinya (boleh beberapa jenis sekaligus) beserta jumlahnya. Setelah
          disimpan, stok Bahan Baku &amp; Kemasan otomatis berkurang, stok Produk Jadi otomatis bertambah.
        </p>
      </>
    ),
    contoh: 'misal: pakai "Cabai" 5kg + "Minyak Goreng" 3L → hasil "Chili Oil 100gr" x 20 botol',
  },
  {
    no: 5,
    title: "Contoh Input Transaksi POS",
    icon: ShoppingCart,
    body: (
      <>
        <p>
          Buka menu <strong>POS</strong> untuk mencatat penjualan langsung ke konsumen. Pilih/buat Customer, tambahkan
          produk yang dibeli, lalu pilih cara bayar: Cash, Transfer/QRIS, atau Kredit (Langsung Lunas atau
          Parsial/cicilan).
        </p>
        <p>Kalau Kredit belum lunas, transaksi ini otomatis muncul di halaman Utang &amp; Piutang.</p>
      </>
    ),
    contoh: 'misal: Customer "Ibu Rina" beli "Chili Oil 100gr" x 3, bayar Cash → stok langsung berkurang',
  },
  {
    no: 6,
    title: "Contoh Input Transaksi B2B",
    icon: Briefcase,
    body: (
      <>
        <p>
          Buka menu <strong>B2B</strong> untuk order ke Agen/Distributor. Alurnya: buat Order → Invoice otomatis
          terbit (bisa dicetak PDF) → saat barang dikirim, isi Surat Jalan + No. Resi → terakhir catat Payment (bisa
          di muka atau belakangan).
        </p>
      </>
    ),
    contoh: 'misal: Agen "Toko Rempah Jaya" order 100 botol → invoice terbit → dikirim pakai resi "JX12345" → bayar belakangan',
  },
  {
    no: 7,
    title: "Cara Catat Utang/Piutang & Pembayaran Cicilan",
    icon: Wallet,
    body: (
      <>
        <p>
          Buka menu <strong>Utang &amp; Piutang</strong> — ada 2 tab terpisah. Piutang muncul otomatis dari transaksi
          POS/B2B yang Kredit. Utang dicatat dari pembelian ke Supplier, pinjaman, atau investor.
        </p>
        <p>
          Untuk mencicil, pilih item yang mau dibayar, masukkan jumlah pembayaran (boleh sebagian/parsial). Riwayat
          cicilannya tersimpan otomatis dan statusnya update sendiri: Belum Bayar → Parsial → Lunas.
        </p>
      </>
    ),
    contoh: 'misal: Piutang "Toko Rempah Jaya" Rp5.000.000, dicicil Rp2.000.000 → status jadi "Parsial"',
  },
  {
    no: 8,
    title: "Cara Baca Dashboard & Report",
    icon: LayoutDashboard,
    body: (
      <>
        <p>
          <strong>Dashboard</strong> memberi ringkasan cepat: omzet hari ini/bulan ini, saldo kas, Piutang &amp; Utang
          yang jatuh tempo (yang lewat 30 hari ditandai merah), produk terlaris, dan stok yang mulai menipis.
        </p>
        <p>
          <strong>Report</strong> memberi laporan lebih lengkap: Laba Rugi, Arus Kas, Neraca, laporan penjualan, dan
          lainnya — bisa difilter per periode &amp; outlet, dan diekspor ke Excel/PDF.
        </p>
      </>
    ),
  },
];

function QuickStartTab() {
  return (
    <div className="space-y-4">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <Card key={step.no} className="flex gap-4">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500">
                {step.no}
              </div>
              <Icon className="h-5 w-5 text-gray-400 dark:text-gray-600" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <CardTitle>{step.title}</CardTitle>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">{step.body}</div>
              {step.contoh && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-zinc-900 dark:text-gray-400">
                  {step.contoh}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ===========================================================================
// TAB 2: JABATAN & HAK AKSES
// ===========================================================================

interface RoleInfo {
  role: string;
  color: string;
  deskripsi: string;
  bisa: string[];
  tidakBisa: string[];
  catatan?: string;
}

const roles: RoleInfo[] = [
  {
    role: "OWNER",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    deskripsi: "Pemilik usaha. Akses penuh ke seluruh modul + pengaturan sistem.",
    bisa: [
      "Semua halaman dan fitur (tanpa kecuali)",
      "Kelola User (tambah/edit/hapus akun staff)",
      "Kelola Outlet (tambah/edit/nonaktifkan)",
      "Reset Data & Isi Data Dummy (Owner Room)",
      "Lihat Audit Log semua user",
      "Ekspor semua laporan ke Excel/PDF",
      "Atur Pengaturan Toko (nama, logo)",
    ],
    tidakBisa: [
      "Tidak ada batasan — bisa semua",
    ],
    catatan: "Hanya Owner yang bisa reset data. Hanya 1 akun Owner yang boleh ada.",
  },
  {
    role: "FINANCE",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    deskripsi: "Pegang keuangan: transaksi, utang/piutang, laporan, pengeluaran.",
    bisa: [
      "Lihat & isi Transaksi POS (input penjualan)",
      "Lihat & isi Transaksi B2B (input order agen)",
      "Lihat & isi Belanja Bahan Baku (pembelian supplier)",
      "Lihat & bayar Utang & Piutang (cicilan/pelunasan)",
      "Lihat & isi Pengeluaran operasional",
      "Lihat Finance Room (arus kas, laba rugi, neraca)",
      "Lihat & ekspor semua Report",
      "Lihat Database (master data)",
      "Lihat Inventory (stok bahan, kemasan, produk jadi)",
      "Lihat Dashboard",
    ],
    tidakBisa: [
      "TIDAK bisa reset data atau isi data dummy",
      "TIDAK bisa kelola User (tambah/edit/hapus akun)",
      "TIDAK bisa kelola Outlet",
      "TIDAK bisa akses Owner Room",
    ],
  },
  {
    role: "SALES",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    deskripsi: "Fokus ke penjualan: POS, B2B, database customer/agen.",
    bisa: [
      "Input Transaksi POS (penjualan ke konsumen)",
      "Input Transaksi B2B (order ke agen)",
      "Lihat Riwayat POS & B2B",
      "Lihat Database (tambah/edit customer, agen, supplier, produk)",
      "Lihat Inventory (cek stok)",
      "Lihat Dashboard",
    ],
    tidakBisa: [
      "TIDAK bisa lihat keuangan (Finance Room, Report, Utang/Piutang)",
      "TIDAK bisa isi Pengeluaran",
      "TIDAK bisa isi Belanja/Pembelian",
      "TIDAK bisa lihat Produksi",
      "TIDAK bisa reset data atau akses Owner Room",
    ],
    catatan: "Sales bisa lihat stok tapi tidak bisa lihat harga beli atau laporan keuangan.",
  },
  {
    role: "PRODUKSI",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    deskripsi: "Fokus ke dapur/produksi: buat proses, catat output, cek inventory.",
    bisa: [
      "Buat Proses Produksi baru (input bahan baku dipakai)",
      "Buat Output Produksi (catat produk jadi hasil masak)",
      "Lihat Riwayat Proses & Output",
      "Lihat Database (master data bahan baku, kemasan, produk jadi)",
      "Lihat Inventory (cek stok bahan baku, kemasan, produk jadi)",
      "Lihat Dashboard",
    ],
    tidakBisa: [
      "TIDAK bisa akses POS atau B2B (penjualan)",
      "TIDAK bisa lihat keuangan (Finance Room, Report, Utang/Piutang)",
      "TIDAK bisa isi Pengeluaran atau Belanja",
      "TIDAK bisa reset data atau akses Owner Room",
    ],
    catatan: "Produksi tidak perlu tahu harga beli bahan baku — harga sudah otomatis dari average cost.",
  },
];

function JabatanTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300">
        <p className="font-medium">Prinsip:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Setiap user hanya bisa lihat &amp; kerja di modul sesuai role-nya.</li>
          <li>Data yang tidak boleh diakses tidak akan muncul di sidebar.</li>
          <li>Semua aksi tercatat di <strong>Audit Log</strong> (siapa, kapan, apa yang dilakukan).</li>
          <li>1 user = 1 role. Tidak bisa punya 2 role sekaligus.</li>
        </ul>
      </div>

      {roles.map((r) => (
        <Card key={r.role}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${r.color}`}>
                {r.role}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">{r.deskripsi}</p>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-green-700 dark:text-green-400">✓ Bisa</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {r.bisa.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-red-700 dark:text-red-400">✗ Tidak Bisa</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {r.tidakBisa.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              {r.catatan && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  💡 {r.catatan}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===========================================================================
// TAB 3: PERHITUNGAN & FORMULA
// ===========================================================================

interface Formula {
  judul: string;
  icon: LucideIcon;
  deskripsi: ReactNode;
  formula: string;
  contoh: string;
  catatan?: string;
}

const formulas: Formula[] = [
  {
    judul: "Weighted Average Cost (Bahan Baku)",
    icon: Calculator,
    deskripsi: (
      <p>
        Harga bahan baku menggunakan sistem <strong>Weighted Average Cost (WAC)</strong> — rata-rata berbobot dari
        seluruh pembelian. Harga ini otomatis dihitung oleh sistem, bukan diinput manual.
      </p>
    ),
    formula: "HargaBaru = (HargaLama × StokLama + HargaBeli × QtyBeli) ÷ (StokLama + QtyBeli)",
    contoh:
      'Stok Cabai = 5kg @ Rp85.000. Beli lagi 3kg @ Rp90.000.\n→ HargaBaru = (85.000×5 + 90.000×3) ÷ (5+3) = Rp86.875/kg',
    catatan: "Harga ini dipakai otomatis saat membuat Proses Produksi. Tidak perlu input manual.",
  },
  {
    judul: "HPP Per Unit (Produk Jadi)",
    icon: Calculator,
    deskripsi: (
      <p>
        Harga Pokok Penjualan (HPP) per unit dihitung dari total biaya batch dibagi ke semua output berdasarkan{" "}
        <strong>berat bersih</strong> masing-masing produk.
      </p>
    ),
    formula:
      "TotalBiayaBatch = Σ(Biaya Bahan Baku) + Σ(Kemasan × Harga)\nHPPPerGram = TotalBiayaBatch ÷ TotalBeratSemuaOutput\nHPPPerUnit = HPPPerGram × BeratProduk",
    contoh:
      'Batch Rp500.000. Output: 80 botol 100gr + 30 botol 250gr.\n→ Total berat = 80×100 + 30×250 = 15.500gr\n→ HPP/gram = 500.000 ÷ 15.500 = Rp32.26/gr\n→ HPP 100ml = 32.26 × 100 = Rp3.226/botol',
    catatan: "HPP per unit ini dipakai sebagai dasar valuasi stok produk jadi di Neraca (Balance Sheet).",
  },
  {
    judul: "Stok Tidak Boleh Minus",
    icon: Calculator,
    deskripsi: (
      <p>
        Sistem mencegah stok negatif di semua titik: penjualan (POS/B2B), produksi, dan adjustment. Setiap
        pengurangan stok diawali validasi <strong>stok tersedia ≥ qty yang diminta</strong>.
      </p>
    ),
    formula:
      "Validasi: StokSaatIni ≥ QtyYangDikurangi\nJika tidak cukup → Error ditampilkan, transaksi tidak terjadi",
    contoh:
      'Stok Chili Oil 100ml = 20 pcs. Customer mau beli 25.\n→ Error: "Stok Chili Oil 100ml tidak cukup: tersedia 20, dibutuhkan 25"',
    catatan:
      "Untuk bahan baku, stok bisa desimal (mis. 0.5 kg). Untuk produk jadi, stok harus bulat (pcs).",
  },
  {
    judul: "Status Piutang & Utang",
    icon: Calculator,
    deskripsi: (
      <p>
        Sistem otomatis menghitung status berdasarkan total tagihan vs total sudah dibayar. Tiga status:
        <strong> Belum Bayar</strong>, <strong>Parsial</strong>, <strong>Lunas</strong>.
      </p>
    ),
    formula:
      "Jika TotalTerbayar = 0 → BELUM_BAYAR\nJika 0 < TotalTerbayar < TotalTagihan → PARSIAL\nJika TotalTerbayar ≥ TotalTagihan → LUNAS",
    contoh:
      "Piutang Rp1.000.000, sudah bayar Rp350.000 → PARSIAL (sisa Rp650.000)\nBayar lagi Rp650.000 → LUNAS",
  },
  {
    judul: "Arus Kas (Cash Flow)",
    icon: Calculator,
    deskripsi: (
      <p>
        Arus kas menghitung pergerakan uang masuk dan keluar. Terdiri dari: Modal &amp; Prive (equity), Penjualan
        (kas masuk), Pembelian &amp; Pengeluaran (kas keluar), Piutang diterima, Utang dibayar.
      </p>
    ),
    formula:
      "SaldoAkhir = SaldoAwal + TotalKasMasuk - TotalKasKeluar\nKasMasuk = Modal + PenjualanCash + PiutangDiterima + UtangDiterima\nKasKeluar = PembelianCash + Pengeluaran + UtangDibayar + Prive",
    contoh:
      "Saldo awal Rp150.000.000. Bulan ini: kas masuk Rp25.000.000, kas keluar Rp18.000.000.\n→ Saldo akhir = Rp157.000.000",
  },
  {
    judul: "Laba Rugi",
    icon: Calculator,
    deskripsi: (
      <p>
        Laba Rugi = Total Pendapatan - Total Beban. Pendapatan dari penjualan (POS + B2B). Beban terdiri dari:
        HPP (harga pokok produk terjual) + Pengeluaran operasional.
      </p>
    ),
    formula:
      "Laba Bersih = TotalPenjualan - HPPTerjual - TotalPengeluaran",
    contoh:
      "Penjualan Rp50.000.000. HPP terjual Rp20.000.000. Pengeluaran Rp5.000.000.\n→ Laba Bersih = Rp25.000.000",
  },
  {
    judul: "Neraca (Balance Sheet)",
    icon: Calculator,
    deskripsi: (
      <p>
        Neraca menunjukkan posisi keuangan pada titik waktu tertentu: Aset = Kewajiban + Ekuitas.
      </p>
    ),
    formula:
      "Aset = Kas + Piutang + NilaiStokBahanBaku + NilaiStokKemasan + NilaiStokProdukJadi\nKewajiban = UtangBelumLunas\nEkuitas = ModalAwal + LabaBersih - Prive",
    contoh:
      "Aset Rp200.000.000 (Kas Rp80jt + Piutang Rp30jt + Stok Rp90jt)\nUtang Rp40.000.000, Ekuitas Rp160.000.000\n→ 200 = 40 + 160 ✓",
  },
];

function PerhitunganTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300">
        <p className="font-medium">Tentang tab ini:</p>
        <p className="mt-1">
          Semua angka di aplikasi ini dihitung otomatis oleh sistem. Tab ini menjelaskan{" "}
          <strong>dari mana angka itu berasal</strong> dan <strong>rumus apa yang dipakai</strong>.
          Jika ada pertanyaan "ini data dari mana?", cari jawabannya di sini.
        </p>
      </div>

      {formulas.map((f, i) => {
        const Icon = f.icon;
        return (
          <Card key={i}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <CardTitle className="text-base">{f.judul}</CardTitle>
                <div className="text-sm text-gray-700 dark:text-gray-300">{f.deskripsi}</div>
                <div className="rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs text-green-400 whitespace-pre-wrap dark:bg-zinc-800">
                  {f.formula}
                </div>
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  <span className="font-semibold">Contoh:</span>{" "}
                  <span className="whitespace-pre-wrap">{f.contoh}</span>
                </div>
                {f.catatan && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 {f.catatan}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ===========================================================================
// MAIN PAGE
// ===========================================================================

export default function PanduanPage() {
  return (
    <div>
      <PageHeader
        title="Panduan"
        description="Quick start guide, penjelasan role user, dan rumus perhitungan yang dipakai aplikasi."
      />

      <Tabs defaultValue="quickstart">
        <TabsList>
          <TabsTrigger value="quickstart">
            <Store className="mr-1.5 h-4 w-4" /> Quick Start
          </TabsTrigger>
          <TabsTrigger value="jabatan">
            <Shield className="mr-1.5 h-4 w-4" /> Jabatan & Hak Akses
          </TabsTrigger>
          <TabsTrigger value="perhitungan">
            <Calculator className="mr-1.5 h-4 w-4" /> Perhitungan & Formula
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quickstart">
          <QuickStartTab />
        </TabsContent>

        <TabsContent value="jabatan">
          <JabatanTab />
        </TabsContent>

        <TabsContent value="perhitungan">
          <PerhitunganTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
