import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createPeriodSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";
type PeriodsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PeriodsPage({ searchParams }: PeriodsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) {
    redirect("/");
  }
  if (!canManageRoles(session.role)) {
    redirect("/dashboard");
  }

  async function createPeriod(formData: FormData) {
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
      startYear: formData.get("startYear"),
      endYear: formData.get("endYear"),
      isActive: formData.get("isActive") === "on",
    };

    const parsed = createPeriodSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Input tidak valid");
    }

    const { name, startYear, endYear, isActive } = parsed.data;

    if (isActive) {
      await prisma.period.updateMany({ data: { isActive: false } });
    }

    await prisma.period.create({ data: { name, startYear, endYear, isActive } });

    revalidatePath("/dashboard/periods");
    redirect("/dashboard/periods?success=Periode%20ditambahkan");
  }

  async function updatePeriod(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      name: String(formData.get("name") ?? ""),
      startYear: formData.get("startYear"),
      endYear: formData.get("endYear"),
      isActive: formData.get("isActive") === "on",
    };

    const parsed = createPeriodSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Input tidak valid");
    }

    const { name, startYear, endYear, isActive } = parsed.data;

    if (isActive) {
      await prisma.period.updateMany({ data: { isActive: false } });
    }

    await prisma.period.update({
      where: { id },
      data: { name, startYear, endYear, isActive },
    });

    revalidatePath("/dashboard/periods");
    redirect("/dashboard/periods?success=Periode%20diperbarui");
  }

  async function deletePeriod(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.period.delete({ where: { id } });

    revalidatePath("/dashboard/periods");
    redirect("/dashboard/periods?success=Periode%20dihapus");
  }

  const periods = await prisma.period.findMany({ orderBy: { startYear: "desc" } });
  const success = params?.success;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Konfigurasi dasar</p>
            <h1 className="text-2xl font-semibold text-slate-900">Periode</h1>
            <p className="text-sm text-slate-600 mt-1">Atur periode kepengurusan dan tandai yang sedang aktif.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{decodeURIComponent(success)}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tambah Periode</h2>
          <form action={createPeriod} className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nama</label>
              <Input name="name" placeholder="2025/2026" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tahun Mulai</label>
              <Input name="startYear" type="number" min={2000} max={3000} required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tahun Akhir</label>
              <Input name="endYear" type="number" min={2000} max={3000} required className="mt-1" />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <input id="isActive" name="isActive" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-900" />
              <label htmlFor="isActive">Jadikan aktif</label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Periode</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Rentang</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {periods.map((period) => (
                  <tr key={period.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{period.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {period.startYear} - {period.endYear}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{period.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="px-4 py-3 space-y-2">
                      <form action={updatePeriod} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <input type="hidden" name="id" value={period.id} />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input name="name" defaultValue={period.name} required />
                          <Input name="startYear" type="number" min={2000} max={3000} defaultValue={period.startYear} required />
                          <Input name="endYear" type="number" min={2000} max={3000} defaultValue={period.endYear} required />
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input name="isActive" type="checkbox" defaultChecked={period.isActive} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                            Jadikan aktif
                          </label>
                        </div>
                        <Button type="submit" variant="outline" className="w-full sm:w-auto">
                          Simpan
                        </Button>
                      </form>
                      <ConfirmForm action={deletePeriod}>
                        <input type="hidden" name="id" value={period.id} />
                        <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                          Hapus
                        </Button>
                      </ConfirmForm>
                    </td>
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Belum ada periode.
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
