"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton, EmptyState } from "@/components/ui/empty-state";
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/utils";

interface DetailBahanBaku {
  id: string;
  bahanBaku: { id: string; nama: string; satuan: string };
  qtyPakai: number;
  qtyWaste: number;
  hargaSatuanSaatItu: number;
  subtotal: number;
}

interface DetailProses {
  id: string;
  nomor: string;
  nama: string | null;
  tanggal: string;
  status: string;
  catatan: string | null;
  totalBiaya: number;
  outlet: { id: string; nama: string };
  user: { id: string; nama: string };
  bahanBaku: DetailBahanBaku[];
  outputs: { id: string; nomor: string }[];
}

function statusBadge(status: string) {
  const map: Record<string, { tone: "gray" | "green" | "red"; label: string }> = {
    DRAFT: { tone: "gray", label: "Draft" },
    SELESAI: { tone: "green", label: "Selesai" },
    DIBATALKAN: { tone: "red", label: "Dibatalan" },
  };
  const s = map[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ProsesDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<DetailProses | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  const muat = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/produksi/proses/${id}`);
      const json = await res.json();
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        toast.error(json.error ?? "Gagal memuat detail proses");
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    muat();
  }, [muat]);

  async function updateStatus(status: "SELESAI" | "DIBATALKAN") {
    if (!data) return;
    const label = status === "SELESAI" ? "menyelesaikan" : "membatalkan";
    if (!confirm(`Yakin ingin ${label} proses ini?`)) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/produksi/proses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Gagal mengubah status");
        return;
      }
      toast.success(`Proses berhasil diubah ke ${status}`);
      muat();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detail Proses" />
        <Card>
          <LoadingSkeleton rows={8} />
        </Card>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div>
        <PageHeader title="Detail Proses" />
        <Card>
          <EmptyState
            title="Proses tidak ditemukan"
            action={
              <Button onClick={() => router.push("/produksi")}>
                <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Proses ${data.nomor}`}
        description={`${formatTanggal(data.tanggal)} · ${data.outlet.nama} · dicatat oleh ${data.user.nama}`}
        action={
          <div className="flex gap-2">
            <Link href="/produksi">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>
            </Link>
            {data.status === "DRAFT" && (
              <>
                <Button
                  variant="primary"
                  loading={updating}
                  onClick={() => updateStatus("SELESAI")}
                >
                  <CheckCircle className="h-4 w-4" /> Tandai Selesai
                </Button>
                <Button
                  variant="danger"
                  loading={updating}
                  onClick={() => updateStatus("DIBATALKAN")}
                >
                  <XCircle className="h-4 w-4" /> Batalkan
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        {statusBadge(data.status)}
        {data.nama && (
          <span className="text-sm text-gray-700 dark:text-gray-300">{data.nama}</span>
        )}
      </div>

      {data.catatan && (
        <Card className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-gray-50">Catatan: </span>
            {data.catatan}
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bahan Baku Dipakai</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                <th className="py-2 pr-3 font-medium">Bahan</th>
                <th className="py-2 pr-3 text-right font-medium">Qty Pakai</th>
                <th className="py-2 pr-3 text-right font-medium">Waste</th>
                <th className="py-2 pr-3 text-right font-medium">Harga Satuan</th>
                <th className="py-2 pr-3 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.bahanBaku.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                  <td className="py-2 pr-3 text-gray-900 dark:text-gray-50">{b.bahanBaku.nama}</td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {formatAngka(b.qtyPakai, 3)} {b.bahanBaku.satuan}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {b.qtyWaste > 0 ? `${formatAngka(b.qtyWaste, 3)} ${b.bahanBaku.satuan}` : "-"}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {formatRupiah(b.hargaSatuanSaatItu)}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-gray-900 dark:text-gray-50">
                    {formatRupiah(b.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-medium text-gray-900 dark:border-zinc-700 dark:text-gray-50">
                <td className="py-2 pr-3" colSpan={4}>Total Biaya Proses</td>
                <td className="py-2 pr-3 text-right">{formatRupiah(data.totalBiaya)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {data.outputs.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Output Terkait</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.outputs.map((o) => (
              <Link
                key={o.id}
                href={`/produksi/output/${o.id}`}
                className="block text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {o.nomor}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
