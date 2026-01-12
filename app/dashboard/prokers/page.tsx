import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createProkerSchema, updateProkerSchema, addPanitiaSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";

const pageTitle = "Proker";

type ProkersPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ProkersPage({ searchParams }: ProkersPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createProker(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      name: String(formData.get("name") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
    };

    const parsed = createProkerSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.proker.create({ data: parsed.data });
    revalidatePath("/dashboard/prokers");
    redirect("/dashboard/prokers?success=Proker%20ditambahkan");
  }

  async function updateProker(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      name: String(formData.get("name") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
    };

    const parsed = updateProkerSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.proker.update({ where: { id }, data: parsed.data });
    revalidatePath("/dashboard/prokers");
    redirect("/dashboard/prokers?success=Proker%20diperbarui");
  }

  async function deleteProker(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.proker.delete({ where: { id } });
    revalidatePath("/dashboard/prokers");
    redirect("/dashboard/prokers?success=Proker%20dihapus");
  }

  async function addPanitia(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const prokerId = String(formData.get("prokerId") ?? "");
    const raw = { userId: String(formData.get("userId") ?? "") };
    const parsed = addPanitiaSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const proker = await prisma.proker.findUnique({ where: { id: prokerId } });
    if (!proker) throw new Error("Proker tidak ditemukan");

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) throw new Error("User tidak ditemukan");
    if (user.periodId !== proker.periodId) throw new Error("User harus pada periode yang sama");

    const already = await prisma.panitia.findFirst({ where: { prokerId, userId: parsed.data.userId } });
    if (already) return; // no-op to keep idempotent

    await prisma.panitia.create({ data: { prokerId, userId: parsed.data.userId } });
    revalidatePath("/dashboard/prokers");
    redirect("/dashboard/prokers?success=Panitia%20ditambahkan");
  }

  async function removePanitia(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const panitiaId = String(formData.get("panitiaId") ?? "");
    await prisma.panitia.delete({ where: { id: panitiaId } });
    revalidatePath("/dashboard/prokers");
    redirect("/dashboard/prokers?success=Panitia%20dihapus");
  }

  const [periods, divisions, users, prokers] = await Promise.all([
    prisma.period.findMany({ orderBy: { startYear: "desc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.proker.findMany({
      orderBy: { name: "asc" },
      include: {
        division: true,
        period: true,
        panitia: { include: { user: true } },
      },
    }),
  ]);

  const success = params?.success;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Konfigurasi proker</p>
            <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
            <p className="text-sm text-slate-600 mt-1">Kelola proker per periode/divisi dan susunan panitia.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{decodeURIComponent(success)}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tambah Proker</h2>
          <form action={createProker} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nama</label>
              <Input name="name" placeholder="Nama proker" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Divisi</label>
              <select name="divisionId" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
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
            <div className="lg:col-span-3">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Proker</h2>
          <div className="mt-4 space-y-4">
            {prokers.map((proker) => {
              const eligibleUsers = users.filter((u) => u.periodId === proker.periodId && u.isActive);
              return (
                <div key={proker.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{proker.name}</div>
                      <div className="text-sm text-slate-700">
                        Divisi: {proker.division.name} · Periode: {proker.period.name}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr]">
                    <form action={updateProker} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <input type="hidden" name="id" value={proker.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input name="name" defaultValue={proker.name} required />
                        <select name="divisionId" defaultValue={proker.divisionId} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <select name="periodId" defaultValue={proker.periodId} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          {periods.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" variant="outline" className="w-full sm:w-auto">
                        Simpan
                      </Button>
                    </form>

                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <div className="text-sm font-semibold text-slate-900">Panitia</div>
                      {eligibleUsers.length > 0 ? (
                        <form action={addPanitia} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input type="hidden" name="prokerId" value={proker.id} />
                          <select name="userId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            {eligibleUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} · {u.nim}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="outline" className="w-full sm:w-auto">
                            Tambah
                          </Button>
                        </form>
                      ) : (
                        <div className="rounded border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">Tidak ada user aktif di periode ini.</div>
                      )}
                      <div className="space-y-2">
                        {proker.panitia.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm text-slate-800">
                            <span>
                              {p.user.name} · {p.user.nim}
                            </span>
                            <ConfirmForm action={removePanitia}>
                              <input type="hidden" name="panitiaId" value={p.id} />
                              <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                                Hapus
                              </Button>
                            </ConfirmForm>
                          </div>
                        ))}
                        {proker.panitia.length === 0 && <div className="rounded border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">Belum ada panitia.</div>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <ConfirmForm action={deleteProker}>
                      <input type="hidden" name="id" value={proker.id} />
                      <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                        Hapus proker
                      </Button>
                    </ConfirmForm>
                  </div>
                </div>
              );
            })}

            {prokers.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Belum ada proker.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
