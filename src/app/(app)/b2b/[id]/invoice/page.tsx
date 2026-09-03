import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { PrintButton } from "./print-button";

export default async function InvoiceB2BPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["OWNER", "SALES", "FINANCE"].includes(user.role)) {
    redirect("/b2b");
  }

  const { id } = await params;
  const order = await getPrisma().orderB2B.findUnique({
    where: { id },
    include: {
      agen: true,
      outlet: true,
      items: { include: { produkJadi: true } },
      invoice: true,
      suratJalan: true,
    },
  });

  if (!order || !order.invoice) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-gray-900 sm:p-10 print:p-0">
      {/* Layout (app) punya sidebar/topbar — halaman ini tidak bisa mengubah file layout
          bersama itu, jadi elemen-elemennya disembunyikan khusus saat print dari sini. */}
      <style>{`
        @media print {
          aside, header.sticky { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>

      <div className="border-b border-gray-300 pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold">INVOICE</h1>
            <p className="mt-1 text-sm text-gray-600">{order.invoice.nomorInvoice}</p>
          </div>
          <div className="text-sm text-gray-600 sm:text-right">
            <p>Tanggal Terbit: {formatTanggal(order.invoice.tanggalTerbit)}</p>
            <p>No. Order: {order.nomor}</p>
            {order.suratJalan && <p>No. Resi: {order.suratJalan.noResi}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 border-b border-gray-300 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ditagihkan kepada</p>
          <p className="mt-1 font-semibold">{order.agen.nama}</p>
          {order.agen.kontak && <p className="text-sm text-gray-600">{order.agen.kontak}</p>}
          {order.agen.alamat && <p className="text-sm text-gray-600">{order.agen.alamat}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Dikirim dari</p>
          <p className="mt-1 font-semibold">{order.outlet.nama}</p>
        </div>
      </div>

      <div className="py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-3 font-medium">Produk</th>
              <th className="py-2 pr-3 font-medium text-right">Qty</th>
              <th className="py-2 pr-3 font-medium text-right">Harga Satuan</th>
              <th className="py-2 pr-0 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="py-2.5 pr-3">{it.produkJadi.nama}</td>
                <td className="py-2.5 pr-3 text-right">
                  {Number(it.qty)} {it.produkJadi.satuan}
                </td>
                <td className="py-2.5 pr-3 text-right">{formatRupiah(Number(it.hargaSatuan))}</td>
                <td className="py-2.5 pr-0 text-right">{formatRupiah(Number(it.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[240px] space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatRupiah(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-bold">
              <span>Total</span>
              <span>{formatRupiah(Number(order.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {order.catatan && (
        <div className="border-t border-gray-300 pt-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800">Catatan:</p>
          <p>{order.catatan}</p>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-gray-400">Dicetak dari Gampangin FNB</p>
    </div>
  );
}
