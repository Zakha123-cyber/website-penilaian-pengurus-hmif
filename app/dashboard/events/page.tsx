import React from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { Info, Trash2 } from "lucide-react";

import { ConfirmForm } from "@/components/confirm-form";
import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { SuccessAlert } from "@/components/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { generateAssignmentsForEvent } from "@/lib/assignment-generator";
import { canManageRoles } from "@/lib/permissions";
import { db } from "@/lib/db";
import { periods, prokers, indicators, evaluationEvents, indicatorSnapshots, evaluations, evaluationScores, users } from "@/lib/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { createEventSchema, updateEventSchema } from "@/lib/validation";

const eventTypes = [
  { value: "PERIODIC", label: "Periodik" },
  { value: "PROKER", label: "Proker" },
] as const;

type EventsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createEvent(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
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

      const newId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(evaluationEvents).values({
          id: newId,
          name,
          type: type as "PERIODIC" | "PROKER",
          periodId,
          prokerId: type === "PROKER" ? prokerId : null,
          startDate,
          endDate,
          isOpen,
        });

        if (indicatorIds.length) {
          const snapshotsToInsert = indicatorIds.map((indicatorId) => ({
            id: crypto.randomUUID(),
            indicatorId,
            eventId: newId
          }));
          await tx.insert(indicatorSnapshots).values(snapshotsToInsert);
        }
      });

      // Generate assignments (uses global db, but run after TX is committed for safety or if TX passed)
      await generateAssignmentsForEvent({ id: newId, type: type as "PERIODIC" | "PROKER", periodId, prokerId });

      revalidatePath("/dashboard/events");
      redirect(`/dashboard/events?success=${encodeURIComponent("Event dibuat")}&alert=success`);
    } catch (error) {
      const digest = (error as any)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      redirect(`/dashboard/events?error=${encodeURIComponent(message)}&alert=error`);
    }
  }

  async function updateEventDates(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
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

      const submissionCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(evaluationScores)
        .innerJoin(evaluations, eq(evaluationScores.evaluationId, evaluations.id))
        .where(eq(evaluations.eventId, id));

      const hasSubmissions = Number(submissionCountResult[0]?.count ?? 0) > 0;

      if (hasSubmissions) {
        await db.update(evaluationEvents).set({ isOpen: parsed.data.isOpen }).where(eq(evaluationEvents.id, id));
      } else {
        await db.update(evaluationEvents).set(parsed.data).where(eq(evaluationEvents.id, id));
      }
      revalidatePath("/dashboard/events");
      redirect(`/dashboard/events?success=${encodeURIComponent("Event diperbarui")}&alert=success`);
    } catch (error) {
      const digest = (error as any)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      redirect(`/dashboard/events?error=${encodeURIComponent(message)}&alert=error`);
    }
  }

  async function deleteEvent(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");

    try {
      await db.transaction(async (tx) => {
        // Find relevant evaluation IDs
        const evals = await tx.select({ id: evaluations.id }).from(evaluations).where(eq(evaluations.eventId, id));
        const evalIds = evals.map(e => e.id);

        if (evalIds.length > 0) {
          await tx.delete(evaluationScores).where(inArray(evaluationScores.evaluationId, evalIds));
          await tx.delete(evaluations).where(inArray(evaluations.id, evalIds));
        }
        await tx.delete(indicatorSnapshots).where(eq(indicatorSnapshots.eventId, id));
        await tx.delete(evaluationEvents).where(eq(evaluationEvents.id, id));
      });
      revalidatePath("/dashboard/events");
      redirect(`/dashboard/events?success=${encodeURIComponent("Event dihapus")}&alert=success`);
    } catch (error) {
      const digest = (error as any)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      redirect(`/dashboard/events?error=${encodeURIComponent(message)}&alert=error`);
    }
  }

  const [activePeriod, periodsData, prokersData, indicatorsData, eventsData, currentUser] = await Promise.all([
    db.query.periods.findFirst({ where: eq(periods.isActive, true), orderBy: [desc(periods.startYear)] }),
    db.query.periods.findMany({ orderBy: [desc(periods.startYear)] }),
    db.query.prokers.findMany({
      orderBy: [asc(prokers.name)],
      with: { period: true }
    }),
    db.query.indicators.findMany({
      where: eq(indicators.isActive, true),
      orderBy: [asc(indicators.category), asc(indicators.name)]
    }),
    db.query.evaluationEvents.findMany({
      orderBy: [desc(evaluationEvents.startDate)],
      with: {
        period: true,
        proker: true,
        indicators: { with: { indicator: true } },
      },
    }),
    session.userId ? db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const eventIds = eventsData.map((ev) => ev.id);
  let submissionSet = new Set<string>();

  if (eventIds.length > 0) {
    const submissionEvents = await db.select({ eventId: evaluations.eventId })
      .from(evaluationScores)
      .innerJoin(evaluations, eq(evaluationScores.evaluationId, evaluations.id))
      .where(inArray(evaluations.eventId, eventIds))
      .groupBy(evaluations.eventId);

    submissionSet = new Set(submissionEvents.map((s) => s.eventId));
  }

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const error = params?.error ? decodeURIComponent(params.error) : undefined;
  const alertType = (params?.alert as "success" | "error" | "info") ?? (error ? "error" : "success");

  const totalEvents = eventsData.length;
  const openEvents = eventsData.filter((e) => e.isOpen).length;
  const prokerEvents = eventsData.filter((e) => e.type === "PROKER").length;
  const periodicEvents = totalEvents - prokerEvents;

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Event" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success ?? error} type={alertType} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Event Penilaian</h1>
              <p className="text-muted-foreground text-sm">Buat event, pilih indikator snapshot, dan atur status buka/tutup.</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Tambah Event</Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-xl flex flex-col">
                <SheetHeader>
                  <SheetTitle>Tambah Event</SheetTitle>
                  <SheetDescription>Buat event baru dengan indikator snapshot dan jadwal penilaian.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <form action={createEvent} className="grid gap-3 p-4 pt-0">
                    <label className="text-sm font-medium text-foreground">
                      Nama
                      <Input name="name" placeholder="Evaluasi Tengah Periode" required className="mt-1" />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Tipe
                      <select name="type" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        {eventTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Periode
                      <select name="periodId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        {periodsData.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Proker (khusus tipe Proker)
                      <select name="prokerId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        <option value="">(Kosongkan jika periodik)</option>
                        {prokersData.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name} · {pr.period.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm font-medium text-foreground">
                        Mulai
                        <Input name="startDate" type="date" required className="mt-1" />
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        Selesai
                        <Input name="endDate" type="date" required className="mt-1" />
                      </label>
                    </div>
                    <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
                      <p className="text-sm font-semibold text-foreground">Pilih indikator</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {indicatorsData.map((ind) => (
                          <label key={ind.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                            <input name="indicatorIds" value={ind.id} type="checkbox" className="h-4 w-4 rounded border-border" />
                            <span>
                              {ind.name} ({ind.category})
                            </span>
                          </label>
                        ))}
                        {indicatorsData.length === 0 && <div className="text-sm text-muted-foreground">Belum ada indikator aktif.</div>}
                      </div>
                    </div>
                    <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
                      <input name="isOpen" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                      Buka segera
                    </label>
                    <Button type="submit" className="mt-1">
                      Simpan
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl font-semibold">Ringkasan Event</CardTitle>
                <p className="text-muted-foreground text-sm">Distribusi event dan status buka/tutup.</p>
              </div>
              {activePeriod ? <Badge variant="outline">Aktif: {activePeriod.name}</Badge> : <Badge variant="outline">Belum ada periode aktif</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Event", value: totalEvents },
                  { label: "Dibuka", value: openEvents },
                  { label: "Periodik", value: periodicEvents },
                  { label: "Proker", value: prokerEvents },
                ].map((stat) => (
                  <div key={stat.label} className="border-border/60 bg-card/60 rounded-lg border px-3 py-3 shadow-xs">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Daftar Event</CardTitle>
                <p className="text-muted-foreground text-sm">Detail event, periode/proker, jadwal, dan indikator snapshot.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Event</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Proker</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Indikator</TableHead>
                      <TableHead className="w-[148px] pr-4 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsData.map((ev) => {
                      const hasSubmissions = submissionSet.has(ev.id);
                      return (
                        <TableRow key={ev.id}>
                          <TableCell className="pl-4 font-medium">{ev.name}</TableCell>
                          <TableCell className="text-muted-foreground">{ev.type === "PROKER" ? "Proker" : "Periodik"}</TableCell>
                          <TableCell className="text-muted-foreground">{ev.period.name}</TableCell>
                          <TableCell className="text-muted-foreground">{ev.proker?.name ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ev.isOpen ? "default" : "outline"}>{ev.isOpen ? "Dibuka" : "Ditutup"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ev.indicators.length} indikator</Badge>
                          </TableCell>
                          <TableCell className="pr-4">
                            <div className="flex items-center justify-end gap-2">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label="Detail event">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="sm:max-w-xl flex flex-col">
                                  <SheetHeader>
                                    <SheetTitle>Detail Event</SheetTitle>
                                    <SheetDescription>Kelola jadwal, status, dan lihat indikator snapshot.</SheetDescription>
                                  </SheetHeader>
                                  <div className="grid flex-1 gap-4 overflow-y-auto p-4 pt-0">
                                    <form action={updateEventDates} className="grid gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
                                      <input type="hidden" name="id" value={ev.id} />
                                      <label className="text-sm font-medium text-foreground">
                                        Nama
                                        <Input name="name" defaultValue={ev.name} required className="mt-1" disabled={hasSubmissions} />
                                      </label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <label className="text-sm font-medium text-foreground">
                                          Mulai
                                          <Input name="startDate" type="date" defaultValue={new Date(ev.startDate).toISOString().slice(0, 10)} disabled={hasSubmissions} className="mt-1" />
                                        </label>
                                        <label className="text-sm font-medium text-foreground">
                                          Selesai
                                          <Input name="endDate" type="date" defaultValue={new Date(ev.endDate).toISOString().slice(0, 10)} disabled={hasSubmissions} className="mt-1" />
                                        </label>
                                      </div>
                                      <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
                                        <input name="isOpen" type="checkbox" defaultChecked={ev.isOpen} className="h-4 w-4 rounded border-border" />
                                        Buka
                                      </label>
                                      <Button type="submit" className="mt-1">
                                        Simpan
                                      </Button>
                                      {hasSubmissions && <p className="text-xs text-amber-700">Nama/tanggal terkunci karena sudah ada penilaian. Status buka/tutup masih bisa diubah.</p>}
                                    </form>

                                    <div className="grid gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
                                      <div className="text-sm font-semibold text-foreground">Indikator snapshot</div>
                                      <div className="text-sm text-muted-foreground">Total: {ev.indicators.length}</div>
                                      <div className="space-y-1 text-sm text-foreground">
                                        {ev.indicators.map((snap) => (
                                          <div key={snap.id} className="rounded border border-border px-3 py-2">
                                            <div className="font-medium">{snap.indicator.name}</div>
                                            <div className="text-xs text-muted-foreground">{snap.indicator.category}</div>
                                          </div>
                                        ))}
                                        {ev.indicators.length === 0 && <div className="text-sm text-muted-foreground">Tidak ada indikator.</div>}
                                      </div>
                                    </div>
                                  </div>
                                </SheetContent>
                              </Sheet>

                              <ConfirmForm action={deleteEvent}>
                                <input type="hidden" name="id" value={ev.id} />
                                <Button type="submit" variant="ghost" size="icon" aria-label="Hapus event" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </ConfirmForm>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {eventsData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                          Belum ada event.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarShell>
  );
}
