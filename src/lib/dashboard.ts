// Agregasi Dashboard — beda konten per role (lihat PRD §3.1).
// Dipisah dari route handler; menggunakan ulang helper dari finance.ts / period.ts
// supaya angka "saldo kas" dan "nilai stok" konsisten dengan Finance Room.

import { getPrisma } from "@/lib/prisma";
import { hitungSaldoKasKumulatif } from "@/lib/finance";
import { awalHariIni, akhirHariIni, awalBulanIni } from "@/lib/period";
import type { AuthUser } from "@/lib/api-helpers";

function tujuhHariLalu(): Date {
  const d = awalHariIni();
  d.setDate(d.getDate() - 6);
  return d;
}

export interface OmzetRingkas {
  hariIniPOS: number;
  hariIniB2B: number;
  hariIni: number;
  bulanIniPOS: number;
  bulanIniB2B: number;
  bulanIni: number;
}

async function hitungOmzet(outletId?: string): Promise<OmzetRingkas> {
  const prisma = getPrisma();
  const oFilter = outletId ? { outletId } : {};
  const [posHariIni, b2bHariIni, posBulanIni, b2bBulanIni] = await Promise.all([
    prisma.orderPOS.aggregate({ _sum: { total: true }, where: { createdAt: { gte: awalHariIni(), lte: akhirHariIni() }, ...oFilter } }),
    prisma.orderB2B.aggregate({ _sum: { total: true }, where: { createdAt: { gte: awalHariIni(), lte: akhirHariIni() }, status: { not: "BATAL" }, ...oFilter } }),
    prisma.orderPOS.aggregate({ _sum: { total: true }, where: { createdAt: { gte: awalBulanIni(), lte: akhirHariIni() }, ...oFilter } }),
    prisma.orderB2B.aggregate({ _sum: { total: true }, where: { createdAt: { gte: awalBulanIni(), lte: akhirHariIni() }, status: { not: "BATAL" }, ...oFilter } }),
  ]);
  const hariIniPOS = Number(posHariIni._sum.total ?? 0);
  const hariIniB2B = Number(b2bHariIni._sum.total ?? 0);
  const bulanIniPOS = Number(posBulanIni._sum.total ?? 0);
  const bulanIniB2B = Number(b2bBulanIni._sum.total ?? 0);
  return {
    hariIniPOS,
    hariIniB2B,
    hariIni: hariIniPOS + hariIniB2B,
    bulanIniPOS,
    bulanIniB2B,
    bulanIni: bulanIniPOS + bulanIniB2B,
  };
}

export interface GrafikHarian {
  tanggal: string;
  omzet: number;
}

/** Omzet 7 hari terakhir (POS+B2B gabung), untuk grafik ringan di Dashboard. */
async function grafikOmzet7Hari(outletId?: string): Promise<GrafikHarian[]> {
  const prisma = getPrisma();
  const start = tujuhHariLalu();
  const oFilter = outletId ? { outletId } : {};
  const [pos, b2b] = await Promise.all([
    prisma.orderPOS.findMany({ where: { createdAt: { gte: start }, ...oFilter }, select: { createdAt: true, total: true } }),
    prisma.orderB2B.findMany({ where: { createdAt: { gte: start }, status: { not: "BATAL" }, ...oFilter }, select: { createdAt: true, total: true } }),
  ]);
  const perHari = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    perHari.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of [...pos, ...b2b]) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (perHari.has(key)) perHari.set(key, (perHari.get(key) ?? 0) + Number(o.total));
  }
  return [...perHari.entries()].map(([tanggal, omzet]) => ({ tanggal, omzet }));
}

export interface TopAgen {
  agenId: string;
  nama: string;
  omzet: number;
}

async function topAgenBulanIni(outletId?: string): Promise<TopAgen[]> {
  const prisma = getPrisma();
  const oFilter = outletId ? { outletId } : {};
  const orders = await prisma.orderB2B.findMany({
    where: { createdAt: { gte: awalBulanIni() }, status: { not: "BATAL" }, ...oFilter },
    select: { agenId: true, total: true, agen: { select: { nama: true } } },
  });
  const map = new Map<string, TopAgen>();
  for (const o of orders) {
    const cur = map.get(o.agenId) ?? { agenId: o.agenId, nama: o.agen.nama, omzet: 0 };
    cur.omzet += Number(o.total);
    map.set(o.agenId, cur);
  }
  return [...map.values()].sort((a, b) => b.omzet - a.omzet).slice(0, 5);
}

export interface TopProduk {
  produkJadiId: string;
  nama: string;
  qty: number;
}

async function topProdukBulanIni(outletId?: string): Promise<TopProduk[]> {
  const prisma = getPrisma();
  const oFilter = outletId ? { outletId } : {};
  const [posItems, b2bItems] = await Promise.all([
    prisma.orderPOSItem.findMany({
      where: { orderPOS: { createdAt: { gte: awalBulanIni() }, ...oFilter } },
      select: { produkJadiId: true, qty: true, produkJadi: { select: { nama: true } } },
    }),
    prisma.orderB2BItem.findMany({
      where: { orderB2B: { createdAt: { gte: awalBulanIni() }, status: { not: "BATAL" }, ...oFilter } },
      select: { produkJadiId: true, qty: true, produkJadi: { select: { nama: true } } },
    }),
  ]);
  const map = new Map<string, TopProduk>();
  for (const it of [...posItems, ...b2bItems]) {
    const cur = map.get(it.produkJadiId) ?? { produkJadiId: it.produkJadiId, nama: it.produkJadi.nama, qty: 0 };
    cur.qty += Number(it.qty);
    map.set(it.produkJadiId, cur);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
}

export interface StokMenipisItem {
  id: string;
  nama: string;
  kategori: "Bahan Baku" | "Kemasan" | "Produk Jadi";
  stok: number;
  stokMinimum: number;
  satuan: string;
}

async function stokMenipis(): Promise<StokMenipisItem[]> {
  const prisma = getPrisma();
  const [bb, km, pj] = await Promise.all([
    prisma.bahanBaku.findMany({ select: { id: true, nama: true, stok: true, stokMinimum: true, satuan: true } }),
    prisma.kemasan.findMany({ select: { id: true, nama: true, stok: true, stokMinimum: true, satuan: true } }),
    prisma.produkJadi.findMany({ select: { id: true, nama: true, stok: true, stokMinimum: true, satuan: true } }),
  ]);
  const hasil: StokMenipisItem[] = [
    ...bb.filter((x) => Number(x.stokMinimum) > 0 && Number(x.stok) <= Number(x.stokMinimum)).map((x) => ({ ...x, stok: Number(x.stok), stokMinimum: Number(x.stokMinimum), kategori: "Bahan Baku" as const })),
    ...km.filter((x) => Number(x.stokMinimum) > 0 && Number(x.stok) <= Number(x.stokMinimum)).map((x) => ({ ...x, stok: Number(x.stok), stokMinimum: Number(x.stokMinimum), kategori: "Kemasan" as const })),
    ...pj.filter((x) => Number(x.stokMinimum) > 0 && Number(x.stok) <= Number(x.stokMinimum)).map((x) => ({ ...x, stok: Number(x.stok), stokMinimum: Number(x.stokMinimum), kategori: "Produk Jadi" as const })),
  ];
  return hasil.sort((a, b) => a.stok / (a.stokMinimum || 1) - b.stok / (b.stokMinimum || 1));
}

export interface JatuhTempoRingkas {
  jumlahJatuhTempo: number; // sudah lewat jatuh tempo (belum lunas)
  jumlahOverdue30: number; // >30 hari
  totalSisa: number;
}

async function ringkasJatuhTempo(kind: "piutang" | "utang"): Promise<JatuhTempoRingkas> {
  const prisma = getPrisma();
  const now = new Date();
  const list =
    kind === "piutang"
      ? await prisma.piutang.findMany({ where: { status: { not: "LUNAS" } }, select: { totalTagihan: true, totalTerbayar: true, jatuhTempo: true } })
      : await prisma.utang.findMany({ where: { status: { not: "LUNAS" } }, select: { totalUtang: true, totalTerbayar: true, jatuhTempo: true } });

  let jumlahJatuhTempo = 0;
  let jumlahOverdue30 = 0;
  let totalSisa = 0;
  for (const item of list as Array<{ totalTagihan?: unknown; totalUtang?: unknown; totalTerbayar: unknown; jatuhTempo: Date }>) {
    const totalPokok = Number(item.totalTagihan ?? item.totalUtang ?? 0);
    const sisa = totalPokok - Number(item.totalTerbayar);
    totalSisa += sisa;
    const hariLewat = Math.floor((now.getTime() - item.jatuhTempo.getTime()) / (1000 * 60 * 60 * 24));
    if (hariLewat > 0) jumlahJatuhTempo += 1;
    if (hariLewat > 30) jumlahOverdue30 += 1;
  }
  return { jumlahJatuhTempo, jumlahOverdue30, totalSisa };
}

export interface ProduksiTerakhir {
  id: string;
  nomor: string;
  tanggal: string;
  wastePersen: number;
  outletNama: string;
}

async function produksiTerakhir(): Promise<ProduksiTerakhir | null> {
  const prisma = getPrisma();
  const batch = await prisma.produksiBatch.findFirst({
    orderBy: { createdAt: "desc" },
    include: { outlet: { select: { nama: true } }, bahanBaku: { select: { qtyPakai: true, qtyWaste: true } } },
  });
  if (!batch) return null;
  const totalPakai = batch.bahanBaku.reduce((s, b) => s + Number(b.qtyPakai), 0);
  const totalWaste = batch.bahanBaku.reduce((s, b) => s + Number(b.qtyWaste), 0);
  const denom = totalPakai + totalWaste;
  return {
    id: batch.id,
    nomor: batch.nomor,
    tanggal: batch.tanggal.toISOString(),
    wastePersen: denom > 0 ? (totalWaste / denom) * 100 : 0,
    outletNama: batch.outlet.nama,
  };
}

// ---------------------------------------------------------------------------
// Payload per role
// ---------------------------------------------------------------------------

export interface DashboardOwnerFinance {
  role: "OWNER" | "FINANCE";
  omzet: OmzetRingkas;
  grafik: GrafikHarian[];
  saldoKas: number;
  piutang: JatuhTempoRingkas;
  utang: JatuhTempoRingkas;
  topAgen: TopAgen[];
  topProduk: TopProduk[];
  stokMenipis: StokMenipisItem[];
}

export interface DashboardSales {
  role: "SALES";
  omzetSaya: { hariIni: number; bulanIni: number };
  piutangSaya: { jumlah: number; totalSisa: number };
}

export interface DashboardProduksi {
  role: "PRODUKSI";
  produksiTerakhir: ProduksiTerakhir | null;
  stokMenipis: StokMenipisItem[];
}

export type DashboardPayload = DashboardOwnerFinance | DashboardSales | DashboardProduksi;

async function omzetSaya(userId: string) {
  const prisma = getPrisma();
  const [posHariIni, b2bHariIni, posBulanIni, b2bBulanIni] = await Promise.all([
    prisma.orderPOS.aggregate({ _sum: { total: true }, where: { userId, createdAt: { gte: awalHariIni(), lte: akhirHariIni() } } }),
    prisma.orderB2B.aggregate({ _sum: { total: true }, where: { userId, createdAt: { gte: awalHariIni(), lte: akhirHariIni() }, status: { not: "BATAL" } } }),
    prisma.orderPOS.aggregate({ _sum: { total: true }, where: { userId, createdAt: { gte: awalBulanIni() } } }),
    prisma.orderB2B.aggregate({ _sum: { total: true }, where: { userId, createdAt: { gte: awalBulanIni() }, status: { not: "BATAL" } } }),
  ]);
  return {
    hariIni: Number(posHariIni._sum.total ?? 0) + Number(b2bHariIni._sum.total ?? 0),
    bulanIni: Number(posBulanIni._sum.total ?? 0) + Number(b2bBulanIni._sum.total ?? 0),
  };
}

async function piutangSaya(userId: string) {
  const prisma = getPrisma();
  const list = await prisma.piutang.findMany({
    where: {
      status: { not: "LUNAS" },
      OR: [{ orderPOS: { userId } }, { orderB2B: { userId } }],
    },
    select: { totalTagihan: true, totalTerbayar: true },
  });
  return {
    jumlah: list.length,
    totalSisa: list.reduce((s, p) => s + (Number(p.totalTagihan) - Number(p.totalTerbayar)), 0),
  };
}

/** Payload Dashboard sesuai role user yang login. Lihat PRD §3.1. */
export async function getDashboardData(user: AuthUser, outletId?: string): Promise<DashboardPayload> {
  if (user.role === "OWNER" || user.role === "FINANCE") {
    const [omzet, grafik, saldoKas, piutang, utang, topAgen, topProduk, stok] = await Promise.all([
      hitungOmzet(outletId),
      grafikOmzet7Hari(outletId),
      hitungSaldoKasKumulatif(akhirHariIni()),
      ringkasJatuhTempo("piutang"),
      ringkasJatuhTempo("utang"),
      topAgenBulanIni(outletId),
      topProdukBulanIni(outletId),
      stokMenipis(),
    ]);
    return { role: user.role, omzet, grafik, saldoKas, piutang, utang, topAgen, topProduk, stokMenipis: stok };
  }

  if (user.role === "SALES") {
    const [omzetS, piutangS] = await Promise.all([omzetSaya(user.id), piutangSaya(user.id)]);
    return { role: "SALES", omzetSaya: omzetS, piutangSaya: piutangS };
  }

  // PRODUKSI
  const [batch, stok] = await Promise.all([produksiTerakhir(), stokMenipis()]);
  return { role: "PRODUKSI", produksiTerakhir: batch, stokMenipis: stok.filter((s) => s.kategori !== "Produk Jadi") };
}
