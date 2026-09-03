"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, LoadingSkeleton } from "@/components/ui/empty-state";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { formatTanggalJam } from "@/lib/utils";

type RoleValue = "OWNER" | "FINANCE" | "SALES" | "PRODUKSI";

interface OutletOpt {
  id: string;
  nama: string;
  isActive: boolean;
}

interface UserRow {
  id: string;
  nama: string;
  username: string;
  role: RoleValue;
  outletId: string | null;
  outlet: { id: string; nama: string } | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_OPTIONS: SelectOption[] = [
  { value: "OWNER", label: "Owner" },
  { value: "FINANCE", label: "Finance" },
  { value: "SALES", label: "Sales" },
  { value: "PRODUKSI", label: "Produksi" },
];

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  FINANCE: "Finance",
  SALES: "Sales",
  PRODUKSI: "Produksi",
};

export function UserManagementTab() {
  const [users, setUsers] = React.useState<UserRow[] | null>(null);
  const [outlets, setOutlets] = React.useState<OutletOpt[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [nama, setNama] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<string | null>("SALES");
  const [outletId, setOutletId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [toggleTarget, setToggleTarget] = React.useState<UserRow | null>(null);
  const [toggling, setToggling] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [uRes, oRes] = await Promise.all([fetch("/api/owner/users"), fetch("/api/owner/outlets")]);
      const uData = await uRes.json();
      const oData = await oRes.json();
      if (uRes.ok) setUsers(uData.users ?? []);
      else toast.error(uData.error ?? "Gagal memuat daftar user");
      if (oRes.ok) setOutlets(oData.outlets ?? []);
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const outletOptions: SelectOption[] = outlets
    .filter((o) => o.isActive)
    .map((o) => ({ value: o.id, label: o.nama }));

  function openAdd() {
    setEditing(null);
    setNama("");
    setUsername("");
    setPassword("");
    setRole("SALES");
    setOutletId(null);
    setDialogOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setNama(u.nama);
    setUsername(u.username);
    setPassword("");
    setRole(u.role);
    setOutletId(u.outletId);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!role) {
      toast.error("Role wajib dipilih");
      return;
    }
    if (!editing) {
      if (!username.trim()) {
        toast.error("Username wajib diisi");
        return;
      }
      if (password.length < 6) {
        toast.error("Password minimal 6 karakter");
        return;
      }
    } else if (password && password.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }

    setSaving(true);
    try {
      const url = editing ? `/api/owner/users/${editing.id}` : "/api/owner/users";
      const method = editing ? "PATCH" : "POST";
      const payload: Record<string, unknown> = { nama, role, outletId };
      if (!editing) {
        payload.username = username;
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menyimpan user");
        return;
      }
      toast.success(editing ? "User diperbarui" : "User dibuat");
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Tidak bisa terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/owner/users/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleTarget.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal mengubah status user");
        return;
      }
      toast.success(toggleTarget.isActive ? "User dinonaktifkan" : "User diaktifkan kembali");
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
          <CardTitle>Daftar User</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Tambah User
          </Button>
        </CardHeader>

        {users === null ? (
          <LoadingSkeleton />
        ) : users.length === 0 ? (
          <EmptyState title="Belum ada user" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 dark:border-zinc-700 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">Nama</th>
                  <th className="py-2 pr-3 font-medium">Username</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Outlet</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Login Terakhir</th>
                  <th className="py-2 pr-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-gray-50">{u.nama}</td>
                    <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{u.username}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone="blue">{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{u.outlet?.nama ?? "-"}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={u.isActive ? "green" : "gray"}>{u.isActive ? "Aktif" : "Nonaktif"}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                      {formatTanggalJam(u.lastLoginAt)}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isActive ? "danger" : "secondary"}
                          onClick={() => setToggleTarget(u)}
                        >
                          {u.isActive ? "Nonaktifkan" : "Aktifkan"}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit User" : "Tambah User"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama" required value={nama} onChange={(e) => setNama(e.target.value)} />
          <Input
            label="Username"
            required
            disabled={!!editing}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label={editing ? "Password Baru (opsional)" : "Password"}
            type="password"
            required={!editing}
            placeholder={editing ? "Kosongkan jika tidak diubah" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <SearchableSelect
            label="Role"
            required
            placeholder="Pilih role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
          />
          <SearchableSelect
            label="Outlet"
            placeholder="Tanpa outlet"
            options={outletOptions}
            value={outletId}
            onChange={setOutletId}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.isActive ? "Nonaktifkan user?" : "Aktifkan user?"}
        description={
          toggleTarget?.isActive
            ? `User "${toggleTarget?.nama}" tidak akan bisa login lagi.`
            : `User "${toggleTarget?.nama}" akan bisa login kembali.`
        }
        confirmLabel={toggleTarget?.isActive ? "Ya, nonaktifkan" : "Ya, aktifkan"}
        danger={toggleTarget?.isActive}
        loading={toggling}
        onConfirm={handleToggleActive}
      />
    </div>
  );
}
