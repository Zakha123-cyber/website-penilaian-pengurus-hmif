import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createEventSchema, updateEventSchema } from "@/lib/validation";
import { generateAssignmentsForEvent } from "@/lib/assignment-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";

const eventTypes = [
  { value: "PERIODIC", label: "Periodik" },
  { value: "PROKER", label: "Proker" },
];

type EventsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createEvent(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    try {
      const raw = {
        name: String(formData.get("name") ?? ""),
        type: String(formData.get("type") ?? "PERIODIC"),
        periodId: String(formData.get("periodId") ?? ""),
        prokerId: formData.get("prokerId") ? String(formData.get("prokerId")) : null,
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        isOpen: formData.get("isOpen") === "on",
        indicatorIds: Array.isArray(formData.getAll("indicatorIds")) ? formData.getAll("indicatorIds").map(String) : [],
      };

      const parsed = createEventSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Input tidak valid");

      const { name, type, periodId, prokerId, startDate, endDate, isOpen, indicatorIds } = parsed.data;

      await prisma.$transaction(async (tx) => {
        const created = await tx.evaluationEvent.create({
          data: {
            name,
            type,
            periodId,
            prokerId: type === "PROKER" ? prokerId : null,
            startDate,
            endDate,
            isOpen,
          },
        });

        await tx.indicatorSnapshot.createMany({ data: indicatorIds.map((indicatorId) => ({ indicatorId, eventId: created.id })) });

        await generateAssignmentsForEvent(tx, created);
      });

      revalidatePath("/dashboard/events");
      redirect("/dashboard/events?success=Event%20dibuat");
    } catch (error) {
      const digest = (error as any)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      redirect(`/dashboard/events?error=${encodeURIComponent(message)}`);
    }
  }

  async function toggleEvent(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const isOpen = formData.get("isOpen") === "true";
    await prisma.evaluationEvent.update({ where: { id }, data: { isOpen } });
    revalidatePath("/dashboard/events");
    redirect("/dashboard/events?success=Status%20event%20diubah");
  }

  async function updateEventDates(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");

    try {
      const raw = {
        name: String(formData.get("name") ?? ""),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        isOpen: formData.get("isOpen") === "on",
      };
      const parsed = updateEventSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Input tidak valid");

      const hasSubmissions = await prisma.evaluationScore.count({ where: { evaluation: { eventId: id } } });
      if (hasSubmissions > 0) {
        // Saat sudah ada penilaian, hanya boleh ubah buka/tutup
        await prisma.evaluationEvent.update({ where: { id }, data: { isOpen: parsed.data.isOpen } });
      } else {
        await prisma.evaluationEvent.update({ where: { id }, data: parsed.data });
      }
      revalidatePath("/dashboard/events");
      redirect("/dashboard/events?success=Event%20diperbarui");
    } catch (error) {
      const digest = (error as any)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      redirect(`/dashboard/events?error=${encodeURIComponent(message)}`);
    }
  }

  async function deleteEvent(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");

    try {
      await prisma.$transaction(async (tx) => {
        await tx.evaluationScore.deleteMany({ where: { evaluation: { eventId: id } } });
        await tx.evaluation.deleteMany({ where: { eventId: id } });
        await tx.indicatorSnapshot.deleteMany({ where: { eventId: id } });
        await tx.evaluationEvent.delete({ where: { id } });
      });
      revalidatePath("/dashboard/events");
      redirect("/dashboard/events?success=Event%20dihapus");
    } catch (error) {
      const digest = (error as any)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      redirect(`/dashboard/events?error=${encodeURIComponent(message)}`);
    }
  }

  const [periods, prokers, indicators, events] = await Promise.all([
    prisma.period.findMany({ orderBy: { startYear: "desc" } }),
    prisma.proker.findMany({ orderBy: { name: "asc" }, include: { period: true } }),
    prisma.indicator.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.evaluationEvent.findMany({
      orderBy: { startDate: "desc" },
      include: {
        period: true,
        proker: true,
        indicators: { include: { indicator: true } },
        _count: { select: { evaluations: { where: { scores: { some: {} } } } } },
      },
    }),
  ]);

  const success = params?.success;
  const error = params?.error;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Event penilaian</p>
            <h1 className="text-2xl font-semibold text-slate-900">Events</h1>
            <p className="text-sm text-slate-600 mt-1">Buat event, pilih indikator (snapshot), dan buka/tutup.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{decodeURIComponent(success)}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{decodeURIComponent(error)}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Buat Event</h2>
          <form action={createEvent} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nama</label>
              <Input name="name" placeholder="Evaluasi Tengah Periode" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tipe</label>
              <select name="type" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {eventTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
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
              <label className="text-sm font-medium text-slate-700">Proker (jika tipe Proker)</label>
              <select name="prokerId" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">(Kosongkan jika periodik)</option>
                {prokers.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} · {pr.period.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mulai</label>
              <Input name="startDate" type="date" required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Selesai</label>
              <Input name="endDate" type="date" required className="mt-1" />
            </div>
            <div className="lg:col-span-3">
              <p className="text-sm font-medium text-slate-700">Pilih indikator</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {indicators.map((ind) => (
                  <label key={ind.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800">
                    <input name="indicatorIds" value={ind.id} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                    <span>
                      {ind.name} ({ind.category})
                    </span>
                  </label>
                ))}
                {indicators.length === 0 && <div className="text-sm text-slate-500">Belum ada indikator aktif.</div>}
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input name="isOpen" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-slate-900" />
              Buka segera
            </label>
            <div className="lg:col-span-3">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Daftar Event</h2>
          <div className="mt-4 space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">{ev.type}</span>
                  {ev._count.evaluations > 0 && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Terkunci: sudah ada penilaian</span>}
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{ev.name}</div>
                    <div className="text-sm text-slate-700">
                      {ev.type} · {ev.period.name}
                      {ev.proker ? ` · ${ev.proker.name}` : ""}
                    </div>
                    <div className="text-xs text-slate-600">
                      {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-600">{ev.isOpen ? "Status: Dibuka" : "Status: Ditutup"}</div>
                    <div className="text-xs text-slate-600">Indikator: {ev.indicators.length}</div>
                  </div>
                  <ConfirmForm action={deleteEvent}>
                    <input type="hidden" name="id" value={ev.id} />
                    <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
                      Hapus
                    </Button>
                  </ConfirmForm>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <form action={updateEventDates} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <input type="hidden" name="id" value={ev.id} />
                    <Input name="name" defaultValue={ev.name} required disabled={ev._count.evaluations > 0} />
                    <Input name="startDate" type="date" defaultValue={new Date(ev.startDate).toISOString().slice(0, 10)} disabled={ev._count.evaluations > 0} />
                    <Input name="endDate" type="date" defaultValue={new Date(ev.endDate).toISOString().slice(0, 10)} disabled={ev._count.evaluations > 0} />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input name="isOpen" type="checkbox" defaultChecked={ev.isOpen} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                      Buka
                    </label>
                    <Button type="submit" variant="outline" className="w-full sm:w-auto">
                      Simpan
                    </Button>
                    {ev._count.evaluations > 0 && <p className="text-xs text-amber-700">Nama/tanggal terkunci karena sudah ada penilaian. Status buka/tutup masih bisa diubah.</p>}
                  </form>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-sm font-semibold text-slate-900">Indikator (snapshot)</div>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {ev.indicators.map((snap) => (
                        <li key={snap.id}>
                          {snap.indicator.name} ({snap.indicator.category})
                        </li>
                      ))}
                      {ev.indicators.length === 0 && <li className="text-slate-500">Tidak ada indikator.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            ))}

            {events.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Belum ada event.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
