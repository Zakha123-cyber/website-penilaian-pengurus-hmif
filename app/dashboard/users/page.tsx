import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createUserSchema, updateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";

const roles = [
  { value: "ADMIN", label: "Admin" },
  { value: "BPI", label: "BPI" },
  { value: "KADIV", label: "Kepala Divisi" },
  { value: "ANGGOTA", label: "Anggota" },
];

type UsersPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createUser(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      nim: String(formData.get("nim") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      password: String(formData.get("password") ?? ""),
      isActive: formData.get("isActive") === "on",
    };

    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const { password, ...data } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({ data: { ...data, passwordHash } });
    revalidatePath("/dashboard/users");
    redirect("/dashboard/users?success=User%20ditambahkan");
  }

  async function updateUser(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      nim: String(formData.get("nim") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      password: String(formData.get("password") ?? ""),
      isActive: formData.get("isActive") === "on",
    };

    const parsed = updateUserSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const { password, ...data } = parsed.data;
    const updateData: any = { ...data };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({ where: { id }, data: updateData });
    revalidatePath("/dashboard/users");
    redirect("/dashboard/users?success=User%20diperbarui");
  }

  async function deleteUser(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/users");
    redirect("/dashboard/users?success=User%20dihapus");
  }

  const [periods, divisions, users] = await Promise.all([
    prisma.period.findMany({ orderBy: { startYear: "desc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { period: true, division: true } }),
  ]);
  const success = params?.success;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Manajemen akun</p>
            <h1 className="text-2xl font-semibold text-slate-900">User</h1>
            <p className="text-sm text-slate-600 mt-1">Buat, ubah, hapus akun dan setel ulang password.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{decodeURIComponent(success)}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tambah User</h2>
          <form action={createUser} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">NIM</label>
              <Input name="nim" placeholder="0001" required className="mt-1" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nama</label>
              <Input name="name" placeholder="Nama lengkap" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input name="email" type="email" placeholder="opsional" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select name="role" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Periode</label>
              <select name="periodId" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Divisi</label>
              <select name="divisionId" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">(Tanpa divisi)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input name="password" type="password" placeholder="min 6 karakter" required className="mt-1" />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
              <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-slate-900" />
              Aktif
            </label>
            <div className="lg:col-span-3">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Daftar User</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Profil</th>
                  <th className="px-4 py-3">Relasi</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-slate-700">NIM: {user.nim}</div>
                      <div className="text-slate-700">Role: {user.role}</div>
                      <div className="text-slate-600 text-xs mt-1">{user.email ?? "(no email)"}</div>
                      <div className="text-xs text-slate-600 mt-1">Status: {user.isActive ? "Aktif" : "Nonaktif"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>Periode: {user.period?.name}</div>
                      <div>Divisi: {user.division?.name ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 space-y-2">
                      <form action={updateUser} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <input type="hidden" name="id" value={user.id} />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input name="nim" defaultValue={user.nim} required />
                          <Input name="name" defaultValue={user.name} required />
                          <Input name="email" type="email" defaultValue={user.email ?? ""} />
                          <select name="role" defaultValue={user.role} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            {roles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <select name="periodId" defaultValue={user.periodId} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            {periods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <select name="divisionId" defaultValue={user.divisionId ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <option value="">(Tanpa divisi)</option>
                            {divisions.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <Input name="password" type="password" placeholder="Kosongkan jika tidak diubah" />
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input name="isActive" type="checkbox" defaultChecked={user.isActive} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                            Aktif
                          </label>
                        </div>
                        <Button type="submit" variant="outline" className="w-full sm:w-auto">
                          Simpan
                        </Button>
                      </form>
                      <ConfirmForm action={deleteUser}>
                        <input type="hidden" name="id" value={user.id} />
                        <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                          Hapus
                        </Button>
                      </ConfirmForm>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      Belum ada user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
