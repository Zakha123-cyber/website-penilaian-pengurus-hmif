"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUBDIVISI_DIVISION_NAMES = ["MEDIATEK", "HUMAS"];

const ALL_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "BPI", label: "BPI" },
  { value: "KADIV", label: "Kepala Divisi" },
  { value: "KASUBDIV", label: "Kepala Sub Divisi" },
  { value: "ANGGOTA", label: "Anggota" },
];

const ROLES_WITHOUT_KASUBDIV = ALL_ROLES.filter((r) => r.value !== "KASUBDIV");

type Division = { id: string; name: string };
type Subdivision = { id: string; name: string; divisionId: string };
type Period = { id: string; name: string };

type UserFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  divisions: Division[];
  subdivisions: Subdivision[];
  periods: Period[];
  defaultValues?: {
    id?: string;
    name?: string;
    nim?: string;
    email?: string;
    role?: string;
    periodId?: string;
    divisionId?: string;
    subdivisionId?: string;
    isActive?: boolean;
  };
  submitLabel?: string;
  showPassword?: boolean;
};

export function UserForm({
  action,
  divisions,
  subdivisions,
  periods,
  defaultValues,
  submitLabel = "Simpan",
  showPassword = false,
}: UserFormProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState(defaultValues?.divisionId ?? "");
  const [selectedRole, setSelectedRole] = useState(defaultValues?.role ?? "ANGGOTA");

  const selectedDivision = divisions.find((d) => d.id === selectedDivisionId);
  const isSubdivisiDivision = selectedDivision
    ? SUBDIVISI_DIVISION_NAMES.some((name) => selectedDivision.name.toUpperCase().includes(name))
    : false;

  const availableRoles = isSubdivisiDivision ? ALL_ROLES : ROLES_WITHOUT_KASUBDIV;
  const filteredSubdivisions = subdivisions.filter((s) => s.divisionId === selectedDivisionId);

  const showSubdivisionField = isSubdivisiDivision && filteredSubdivisions.length > 0;

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDivisionId(e.target.value);
    // Reset role ke ANGGOTA jika divisi baru tidak support KASUBDIV dan role saat ini KASUBDIV
    const newDivision = divisions.find((d) => d.id === e.target.value);
    const newIsSubdivisi = newDivision
      ? SUBDIVISI_DIVISION_NAMES.some((name) => newDivision.name.toUpperCase().includes(name))
      : false;
    if (!newIsSubdivisi && selectedRole === "KASUBDIV") {
      setSelectedRole("ANGGOTA");
    }
  };

  return (
    <form action={action} className="grid gap-3 p-4 pt-0">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <label className="text-sm font-medium text-foreground">
        Nama
        <Input name="name" defaultValue={defaultValues?.name} placeholder="Nama lengkap" required className="mt-1" />
      </label>

      <label className="text-sm font-medium text-foreground">
        NIM
        <Input name="nim" defaultValue={defaultValues?.nim} placeholder="0001" required className="mt-1" />
      </label>

      <label className="text-sm font-medium text-foreground">
        Email
        <Input name="email" type="email" defaultValue={defaultValues?.email ?? ""} placeholder="opsional" className="mt-1" />
      </label>

      <label className="text-sm font-medium text-foreground">
        Periode
        <select name="periodId" defaultValue={defaultValues?.periodId} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-foreground">
        Divisi
        <select
          name="divisionId"
          value={selectedDivisionId}
          onChange={handleDivisionChange}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">(Tanpa divisi)</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      {showSubdivisionField && (
        <label className="text-sm font-medium text-foreground">
          Subdivisi
          <select
            name="subdivisionId"
            defaultValue={defaultValues?.subdivisionId ?? ""}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">(Tanpa subdivisi)</option>
            {filteredSubdivisions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="text-sm font-medium text-foreground">
        Role
        <select
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          {availableRoles.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </label>

      {showPassword && (
        <label className="text-sm font-medium text-foreground">
          Password
          <Input name="password" type="password" placeholder="Kosongkan jika tidak diubah" className="mt-1" />
        </label>
      )}

      <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
        <input name="isActive" type="checkbox" defaultChecked={defaultValues?.isActive ?? true} className="h-4 w-4 rounded border-border" />
        Aktif
      </label>

      <Button type="submit" className="mt-2">{submitLabel}</Button>
    </form>
  );
}
