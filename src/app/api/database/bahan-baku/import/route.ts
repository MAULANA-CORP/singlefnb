import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { withOwner, apiError, catatAudit } from "@/lib/api-helpers";
import { classifyImportRows, normalizeNama, ENTITY_DEFS, type ImportSummary } from "@/lib/import-csv";

const FIELDS = ENTITY_DEFS["bahan-baku"].fields;

// POST /api/database/bahan-baku/import — hanya OWNER
// Body: { rows: Record<string, unknown>[] } — sudah dipetakan ke field key
// (lihat mapCsvRowToFields di client). Baris invalid dilaporkan, tidak
// menggagalkan seluruh import.
export const POST = withOwner(async (user, req) => {
  try {
    const body = await req.json();
    const rawRows: Array<Record<string, unknown>> = Array.isArray(body?.rows) ? body.rows : [];
    if (!rawRows.length) {
      return NextResponse.json({ error: "Tidak ada baris untuk diimpor" }, { status: 400 });
    }

    const existing = await getPrisma().bahanBaku.findMany({ take: 200, select: { id: true, nama: true } });
    const existingMap = new Map(existing.map((e) => [normalizeNama(e.nama), e.id]));

    const classified = classifyImportRows(rawRows, FIELDS, existingMap);

    const summary: ImportSummary = { created: 0, updated: 0, errors: [] };

    for (const row of classified) {
      if (row.action === "error" || !row.data) {
        summary.errors.push({ rowNumber: row.rowNumber, errors: row.errors });
        continue;
      }
      const data = {
        nama: String(row.data.nama),
        satuan: String(row.data.satuan),
        stok: Number(row.data.stok ?? 0),
        stokMinimum: Number(row.data.stokMinimum ?? 0),
      };
      try {
        if (row.action === "update" && row.matchedId) {
          await getPrisma().bahanBaku.update({ where: { id: row.matchedId }, data });
          summary.updated++;
        } else {
          await getPrisma().bahanBaku.create({ data });
          summary.created++;
        }
      } catch {
        summary.errors.push({ rowNumber: row.rowNumber, errors: ["Gagal menyimpan ke database"] });
      }
    }

    await catatAudit({
      userId: user.id,
      aksi: "IMPORT",
      entitas: "BahanBaku",
      detail: { created: summary.created, updated: summary.updated, errorCount: summary.errors.length },
    });

    return NextResponse.json(summary);
  } catch (error) {
    return apiError(error);
  }
});
