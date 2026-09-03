import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Store, Users, Database, Factory, ShoppingCart, Briefcase, Wallet, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitle } from "@/components/ui/card";

// Halaman statis (quick start guide) — konten latihan/contoh, tidak terhubung ke data
// asli. Bisa diakses semua role (lihat PRD §3.11 & nav-items.ts).

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
          Mulai dari menu <strong>Owner Room → Pengaturan Toko</strong>. Isi nama brand/toko Anda dan (opsional)
          tempel URL logo — nama ini langsung muncul di header sidebar.
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

export default function PanduanPage() {
  return (
    <div>
      <PageHeader
        title="Panduan"
        description="Quick start guide — ikuti urutan langkah di bawah supaya Gampangin FNB siap dipakai. Boleh dipraktikkan dulu pakai data latihan; kalau sudah siap pakai data asli, Owner bisa membersihkan data latihan lewat Owner Room → Reset Data."
      />

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
    </div>
  );
}
