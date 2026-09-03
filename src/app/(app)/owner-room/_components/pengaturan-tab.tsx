"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";

interface Outlet {
  id: string;
  nama: string;
  alamat: string | null;
  isActive: boolean;
}

interface Pengaturan {
  id: string;
  namaToko: string;
  logoUrl: string | null;
}

export function PengaturanTab() {
  const [namaToko, setNamaToko] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [savingToko, setSavingToko] = React.useState(false);
  const [loadedToko, setLoadedToko] = React.useState(false);

  const [outlets, setOutlets] = React.useState<Outlet[] | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Outlet | null>(null);
  const [formNama, setFormNama] = React.useState("");
  const [formAlamat, setFormAlamat] = React.useState("");
  const [savingOutlet, setSavingOutlet] = React.useState(false);
  const [toggleTarget, setToggleTarget] = React.useState<Outlet | null>(null);
  const [toggling, setToggling] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [pRes, oRes] = await Promise.all([fetch("/api/owner/pengaturan"), fetch("/api/owner/outlets")]);
      const pData = await pRes.json();
      const oData = await oRes.json();
      if (pRes.ok) {
        const p: Pengaturan = pData.pengaturan;
        setNamaToko(p?.namaToko ?? "");
        setLogoUrl(p?.logoUrl ?? "");
      } else {
        toast.error(pData.error ?? "Gagal memuat pengaturan toko");
      }
      if (oRes.ok) setOutlets(oData.outlets ?? []);
      else toast.error(oData.error ?? "Gagal memuat daftar outlet");
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setLoadedToko(true);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSaveToko(e: React.FormEvent) {
    e.preventDefault();
    if (!namaToko.trim()) {
      toast.error("Nama toko wajib diisi");
      return;
    }
    setSavingToko(true);
    try {
      const res = await fetch("/api/owner/pengaturan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaToko, logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan pengaturan toko");
        return;
      }
      toast.success("Pengaturan toko tersimpan");
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSavingToko(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setFormNama("");
    setFormAlamat("");
    setDialogOpen(true);
  }

  function openEdit(o: Outlet) {
    setEditing(o);
    setFormNama(o.nama);
    setFormAlamat(o.alamat ?? "");
    setDialogOpen(true);
  }

  async function handleSaveOutlet(e: React.FormEvent) {
    e.preventDefault();
    if (!formNama.trim()) {
      toast.error("Nama outlet wajib diisi");
      return;
    }
    setSavingOutlet(true);
    try {
      const url = editing ? `/api/owner/outlets/${editing.id}` : "/api/owner/outlets";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: formNama, alamat: formAlamat }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan outlet");
        return;
      }
      toast.success(editing ? "Outlet diperbarui" : "Outlet ditambahkan");
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSavingOutlet(false);
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/owner/outlets/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleTarget.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mengubah status outlet");
        return;
      }
      toast.success(toggleTarget.isActive ? "Outlet dinonaktifkan" : "Outlet diaktifkan kembali");
      setToggleTarget(null);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Info Toko</CardTitle>
        </CardHeader>

        {!loadedToko ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <form onSubmit={handleSaveToko} className="max-w-md space-y-4">
            <Input label="Nama Toko / Brand" required value={namaToko} onChange={(e) => setNamaToko(e.target.value)} />
            <div>
              <Input
                label="URL Logo"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">
                Belum ada infrastruktur upload file — tempel URL gambar logo (mis. dari layanan hosting gambar).
                Upload file bisa ditambahkan belakangan.
              </p>
            </div>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Preview logo"
                className="h-14 w-14 rounded-lg border border-gray-200 object-contain dark:border-zinc-700"
              />
            )}
            <Button type="submit" loading={savingToko}>
              Simpan
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Outlet</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Tambah Outlet
          </Button>
        </CardHeader>

        {outlets === null ? (
          <LoadingSkeleton />
        ) : outlets.length === 0 ? (
          <EmptyState title="Belum ada outlet" description="Tambahkan outlet/cabang pertama Anda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">Nama</th>
                  <th className="py-2 pr-3 font-medium">Alamat</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-gray-50">{o.nama}</td>
                    <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{o.alamat || "-"}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={o.isActive ? "green" : "gray"}>{o.isActive ? "Aktif" : "Nonaktif"}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(o)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={o.isActive ? "danger" : "secondary"}
                          onClick={() => setToggleTarget(o)}
                        >
                          {o.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Outlet" : "Tambah Outlet"}>
        <form onSubmit={handleSaveOutlet} className="space-y-4">
          <Input label="Nama Outlet" required value={formNama} onChange={(e) => setFormNama(e.target.value)} />
          <Textarea label="Alamat" value={formAlamat} onChange={(e) => setFormAlamat(e.target.value)} rows={2} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={savingOutlet}>
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.isActive ? "Nonaktifkan outlet?" : "Aktifkan outlet?"}
        description={
          toggleTarget?.isActive
            ? `Outlet "${toggleTarget?.nama}" tidak akan bisa dipilih untuk transaksi baru.`
            : `Outlet "${toggleTarget?.nama}" akan aktif kembali dan bisa dipilih untuk transaksi.`
        }
        confirmLabel={toggleTarget?.isActive ? "Ya, nonaktifkan" : "Ya, aktifkan"}
        danger={toggleTarget?.isActive}
        loading={toggling}
        onConfirm={handleToggleActive}
      />
    </div>
  );
}
