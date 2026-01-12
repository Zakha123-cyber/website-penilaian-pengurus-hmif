import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createIndicatorSchema, updateIndicatorSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";

const categories = [
  { value: "hard", label: "Hard skill" },
  { value: "soft", label: "Soft skill" },
  { value: "other", label: "Lainnya" },
];

type IndicatorsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function IndicatorsPage({ searchParams }: IndicatorsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? "hard"),
      isActive: formData.get("isActive") === "on",
    };
    const parsed = createIndicatorSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.indicator.create({ data: parsed.data });
    revalidatePath("/dashboard/indicators");
    redirect("/dashboard/indicators?success=Indikator%20ditambahkan");
  }

  async function updateIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? "hard"),
      isActive: formData.get("isActive") === "on",
    };
    const parsed = updateIndicatorSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.indicator.update({ where: { id }, data: parsed.data });
    revalidatePath("/dashboard/indicators");
    redirect("/dashboard/indicators?success=Indikator%20diperbarui");
  }

  async function deleteIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.indicator.delete({ where: { id } });
    revalidatePath("/dashboard/indicators");
    redirect("/dashboard/indicators?success=Indikator%20dihapus");
  }

  const indicators = await prisma.indicator.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const success = params?.success;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Indikator</p>
            <h1 className="text-2xl font-semibold text-slate-900">Indicators</h1>
            <p className="text-sm text-slate-600 mt-1">Kelola indikator hard/soft skill yang akan disalin ke event.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{decodeURIComponent(success)}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tambah Indikator</h2>
          <form action={createIndicator} className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nama</label>
              <Input name="name" placeholder="Kerja sama tim" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Kategori</label>
              <select name="category" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
              <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-slate-900" />
              Aktif
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Indikator</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {indicators.map((indicator) => (
                  <tr key={indicator.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{indicator.name}</td>
                    <td className="px-4 py-3 text-slate-700">{indicator.category}</td>
                    <td className="px-4 py-3 text-slate-700">{indicator.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="px-4 py-3 space-y-2">
                      <form action={updateIndicator} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <input type="hidden" name="id" value={indicator.id} />
                        <Input name="name" defaultValue={indicator.name} required />
                        <select name="category" defaultValue={indicator.category} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          {categories.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input name="isActive" type="checkbox" defaultChecked={indicator.isActive} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                          Aktif
                        </label>
                        <Button type="submit" variant="outline" className="w-full sm:w-auto">
                          Simpan
                        </Button>
                      </form>
                      <ConfirmForm action={deleteIndicator}>
                        <input type="hidden" name="id" value={indicator.id} />
                        <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                          Hapus
                        </Button>
                      </ConfirmForm>
                    </td>
                  </tr>
                ))}
                {indicators.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Belum ada indikator.
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
