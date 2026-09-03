"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { formatTanggalJam } from "@/lib/utils";

interface LogRow {
  id: string;
  aksi: string;
  entitas: string;
  entitasId: string | null;
  detail: unknown;
  createdAt: string;
  user: { id: string; nama: string; username: string } | null;
}

interface UserOpt {
  id: string;
  nama: string;
  username: string;
}

const AKSI_TONE: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
  CREATE: "green",
  UPDATE: "amber",
  DELETE: "red",
  LOGIN: "blue",
  EXPORT: "blue",
  RESET_DATA: "red",
};

export function AuditLogTab() {
  const [logs, setLogs] = React.useState<LogRow[] | null>(null);
  const [users, setUsers] = React.useState<UserOpt[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);

  const [entitas, setEntitas] = React.useState("");
  const [userId, setUserId] = React.useState<string | null>(null);
  const [dari, setDari] = React.useState("");
  const [sampai, setSampai] = React.useState("");

  React.useEffect(() => {
    fetch("/api/owner/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  const load = React.useCallback(async (targetPage: number) => {
    setLogs(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), pageSize: "25" });
      if (entitas.trim()) params.set("entitas", entitas.trim());
      if (userId) params.set("userId", userId);
      if (dari) params.set("dari", dari);
      if (sampai) params.set("sampai", sampai);

      const res = await fetch(`/api/owner/audit-log?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memuat audit log");
        return;
      }
      setLogs(data.logs ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setPage(data.pagination?.page ?? targetPage);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    }
  }, [entitas, userId, dari, sampai]);

  React.useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(1);
  }

  const userOptions: SelectOption[] = users.map((u) => ({ value: u.id, label: u.nama, hint: u.username }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Entitas"
            placeholder="mis. OrderPOS, User"
            value={entitas}
            onChange={(e) => setEntitas(e.target.value)}
          />
          <SearchableSelect label="User" placeholder="Semua user" options={userOptions} value={userId} onChange={setUserId} />
          <Input label="Dari Tanggal" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
          <Input label="Sampai Tanggal" type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm">
              Terapkan Filter
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Aktivitas</CardTitle>
          <span className="text-sm text-gray-600 dark:text-gray-400">{total} entri</span>
        </CardHeader>

        {logs === null ? (
          <LoadingSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState title="Tidak ada log yang cocok" description="Coba ubah filter di atas." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                    <th className="py-2 pr-3 font-medium">Tanggal</th>
                    <th className="py-2 pr-3 font-medium">Aksi</th>
                    <th className="py-2 pr-3 font-medium">Entitas</th>
                    <th className="py-2 pr-3 font-medium">ID Entitas</th>
                    <th className="py-2 pr-3 font-medium">Oleh</th>
                    <th className="py-2 pr-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-100 align-top last:border-0 dark:border-zinc-800">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                        {formatTanggalJam(l.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={AKSI_TONE[l.aksi] ?? "gray"}>{l.aksi}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-900 dark:text-gray-50">{l.entitas}</td>
                      <td className="max-w-[140px] truncate py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                        {l.entitasId ?? "-"}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-900 dark:text-gray-50">{l.user?.nama ?? "-"}</td>
                      <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                        {l.detail ? (
                          <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap break-words text-xs">
                            {JSON.stringify(l.detail)}
                          </pre>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => load(page + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
