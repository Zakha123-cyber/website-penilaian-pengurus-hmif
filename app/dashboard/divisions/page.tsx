import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createDivisionSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";
type DivisionsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DivisionsPage({ searchParams }: DivisionsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) {
    redirect("/");
  }
  if (!canManageRoles(session.role)) {
    redirect("/dashboard");
  }

  async function createDivision(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) {
      redirect("/");
    }
    if (!canManageRoles(session.role)) {
      redirect("/dashboard");
    }

    const raw = {
      name: String(formData.get("name") ?? ""),
    };

    const parsed = createDivisionSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Input tidak valid");
    }

    await prisma.division.create({ data: parsed.data });

    revalidatePath("/dashboard/divisions");
    redirect("/dashboard/divisions?success=Divisi%20ditambahkan");
  }

  async function updateDivision(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = { name: String(formData.get("name") ?? "") };
    const parsed = createDivisionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.division.update({ where: { id }, data: parsed.data });
    revalidatePath("/dashboard/divisions");
    redirect("/dashboard/divisions?success=Divisi%20diperbarui");
  }

  async function deleteDivision(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.division.delete({ where: { id } });
    revalidatePath("/dashboard/divisions");
    redirect("/dashboard/divisions?success=Divisi%20dihapus");
  }

  const divisions = await prisma.division.findMany({ orderBy: { name: "asc" } });
  const success = params?.success;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Konfigurasi dasar</p>
            <h1 className="text-2xl font-semibold text-slate-900">Divisi</h1>
            <p className="text-sm text-slate-600 mt-1">Atur daftar divisi untuk dikaitkan dengan user dan proker.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{decodeURIComponent(success)}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tambah Divisi</h2>
          <form action={createDivision} className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nama</label>
              <Input name="name" placeholder="BPI" required className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Divisi</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Dibuat</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {divisions.map((division) => (
                  <tr key={division.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{division.name}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(division.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 space-y-2">
                      <form action={updateDivision} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <input type="hidden" name="id" value={division.id} />
                        <Input name="name" defaultValue={division.name} required />
                        <Button type="submit" variant="outline" className="w-full sm:w-auto">
                          Simpan
                        </Button>
                      </form>
                      <ConfirmForm action={deleteDivision}>
                        <input type="hidden" name="id" value={division.id} />
                        <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                          Hapus
                        </Button>
                      </ConfirmForm>
                    </td>
                  </tr>
                ))}
                {divisions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      Belum ada divisi.
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
