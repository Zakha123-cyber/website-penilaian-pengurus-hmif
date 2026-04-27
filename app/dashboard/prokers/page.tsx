import React from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { Pencil, Trash2 } from "lucide-react";

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
import { canManageRoles } from "@/lib/permissions";
import { db } from "@/lib/db";
import { prokers as prokersTable, periods, divisions, users as usersTable, panitia, evaluationEvents, evaluations, evaluationScores, indicatorSnapshots } from "@/lib/schema";
import { eq, desc, asc, inArray, and } from "drizzle-orm";
import { addPanitiaSchema, createProkerSchema, updateProkerSchema } from "@/lib/validation";

type ProkersPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ProkersPage({ searchParams }: ProkersPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createProker(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      name: String(formData.get("name") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
    };

    const parsed = createProkerSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await db.insert(prokersTable).values({ id: crypto.randomUUID(), ...parsed.data });
    revalidatePath("/dashboard/prokers");
    redirect(`/dashboard/prokers?success=${encodeURIComponent("Proker ditambahkan")}&alert=success`);
  }

  async function updateProker(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      name: String(formData.get("name") ?? ""),
      divisionId: String(formData.get("divisionId") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
    };

    const parsed = updateProkerSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await db.update(prokersTable).set(parsed.data).where(eq(prokersTable.id, id));
    revalidatePath("/dashboard/prokers");
    redirect(`/dashboard/prokers?success=${encodeURIComponent("Proker diperbarui")}&alert=success`);
  }

  async function deleteProker(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");

    await db.transaction(async (tx) => {
      const events = await tx.select({ id: evaluationEvents.id }).from(evaluationEvents).where(eq(evaluationEvents.prokerId, id));
      const eventIds = events.map((e) => e.id);

      if (eventIds.length) {
        const batchEvaluations = await tx.select({ id: evaluations.id }).from(evaluations).where(inArray(evaluations.eventId, eventIds));
        const evaluationIds = batchEvaluations.map((e) => e.id);

        if (evaluationIds.length) {
          await tx.delete(evaluationScores).where(inArray(evaluationScores.evaluationId, evaluationIds));
          await tx.delete(evaluations).where(inArray(evaluations.id, evaluationIds));
        }

        await tx.delete(indicatorSnapshots).where(inArray(indicatorSnapshots.eventId, eventIds));
        await tx.delete(evaluationEvents).where(inArray(evaluationEvents.id, eventIds));
      }

      await tx.delete(panitia).where(eq(panitia.prokerId, id));
      await tx.delete(prokersTable).where(eq(prokersTable.id, id));
    });
    revalidatePath("/dashboard/prokers");
    redirect(`/dashboard/prokers?success=${encodeURIComponent("Proker dihapus")}&alert=success`);
  }

  async function addPanitia(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const prokerId = String(formData.get("prokerId") ?? "");
    const raw = { userId: String(formData.get("userId") ?? "") };
    const parsed = addPanitiaSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const prokerData = await db.query.prokers.findFirst({ where: eq(prokersTable.id, prokerId) });
    if (!prokerData) throw new Error("Proker tidak ditemukan");

    const userData = await db.query.users.findFirst({ where: eq(usersTable.id, parsed.data.userId) });
    if (!userData) throw new Error("User tidak ditemukan");
    if (userData.periodId !== prokerData.periodId) throw new Error("User harus pada periode yang sama");

    const already = await db.query.panitia.findFirst({
      where: and(eq(panitia.prokerId, prokerId), eq(panitia.userId, parsed.data.userId))
    });
    if (already) return redirect(`/dashboard/prokers?success=${encodeURIComponent("Panitia sudah terdaftar")}&alert=info`);

    await db.insert(panitia).values({ id: crypto.randomUUID(), prokerId, userId: parsed.data.userId });
    revalidatePath("/dashboard/prokers");
    redirect(`/dashboard/prokers?success=${encodeURIComponent("Panitia ditambahkan")}&alert=success`);
  }

  async function removePanitia(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const panitiaId = String(formData.get("panitiaId") ?? "");
    await db.delete(panitia).where(eq(panitia.id, panitiaId));
    revalidatePath("/dashboard/prokers");
    redirect(`/dashboard/prokers?success=${encodeURIComponent("Panitia dihapus")}&alert=success`);
  }

  const [activePeriod, periodsData, divisionsData, usersData, prokersData, currentUser] = await Promise.all([
    db.query.periods.findFirst({ where: eq(periods.isActive, 1), orderBy: [desc(periods.startYear)] }),
    db.query.periods.findMany({ orderBy: [desc(periods.startYear)] }),
    db.query.divisions.findMany({ orderBy: [asc(divisions.name)] }),
    db.query.users.findMany({ where: eq(usersTable.isActive, 1), orderBy: [asc(usersTable.name)], with: { division: true } }),
    db.query.prokers.findMany({
      orderBy: [asc(prokersTable.name)],
      with: {
        division: true,
        period: true,
        panitia: { with: { user: true } },
      },
    }),
    session.userId ? db.query.users.findFirst({ where: eq(usersTable.id, session.userId), columns: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const prokers = prokersData;

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const alert = params?.alert;

  const totalProkers = prokers.length;
  const totalPanitiaCount = prokers.reduce((sum: number, p: any) => sum + p.panitia.length, 0);
  const totalDivisionsCount = divisionsData.length;

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Proker" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success} type={(alert as "success" | "error" | "info") ?? "success"} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Proker</h1>
              <p className="text-muted-foreground text-sm">Kelola proker per divisi dan periode, termasuk susunan panitia.</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Tambah Proker</Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Tambah Proker</SheetTitle>
                  <SheetDescription>Masukkan nama, divisi, dan periode proker.</SheetDescription>
                </SheetHeader>
                <form action={createProker} className="grid gap-3 p-4 pt-0">
                  <label className="text-sm font-medium text-foreground">
                    Nama
                    <Input name="name" placeholder="Nama proker" required className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Divisi
                    <select name="divisionId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                      {divisionsData.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Periode
                    <select name="periodId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                      {periodsData.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" className="mt-2">
                    Simpan
                  </Button>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl font-semibold">Ringkasan Proker</CardTitle>
                <p className="text-muted-foreground text-sm">Distribusi proker dan total panitia.</p>
              </div>
              {activePeriod ? <Badge variant="outline">Aktif: {activePeriod.name}</Badge> : <Badge variant="outline">Belum ada yang aktif</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Total Proker", value: totalProkers },
                  { label: "Total Panitia", value: totalPanitiaCount },
                  { label: "Total Divisi", value: totalDivisionsCount },
                ].map((stat: any) => (
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
                <CardTitle className="text-lg">Daftar Proker</CardTitle>
                <p className="text-muted-foreground text-sm">Detail proker, divisi, periode, dan panitia.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Nama</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Panitia</TableHead>
                      <TableHead className="w-[148px] pr-4 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prokers.map((proker: any) => {
                      const panitiaIds = new Set(proker.panitia.map((p: any) => p.userId));
                      const eligibleUsers = usersData.filter((u: any) => u.periodId === proker.periodId && u.isActive === 1 && !panitiaIds.has(u.id));
                      return (
                        <TableRow key={proker.id}>
                          <TableCell className="pl-4 font-medium">{proker.name}</TableCell>
                          <TableCell className="text-muted-foreground">{proker.division.name}</TableCell>
                          <TableCell className="text-muted-foreground">{proker.period.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{proker.panitia.length} panitia</Badge>
                          </TableCell>
                          <TableCell className="pr-4">
                            <div className="flex items-center justify-end gap-2">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label="Edit proker">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="sm:max-w-xl">
                                  <SheetHeader>
                                    <SheetTitle>Edit Proker</SheetTitle>
                                    <SheetDescription>Perbarui detail proker dan susunan panitia.</SheetDescription>
                                  </SheetHeader>
                                  <div className="grid gap-4 p-4 pt-0">
                                    <form action={updateProker} className="grid gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
                                      <input type="hidden" name="id" value={proker.id} />
                                      <label className="text-sm font-medium text-foreground">
                                        Nama
                                        <Input name="name" defaultValue={proker.name} required className="mt-1" />
                                      </label>
                                      <label className="text-sm font-medium text-foreground">
                                        Divisi
                                        <select name="divisionId" defaultValue={proker.divisionId} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                                          {divisionsData.map((d: any) => (
                                            <option key={d.id} value={d.id}>
                                              {d.name}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label className="text-sm font-medium text-foreground">
                                        Periode
                                        <select name="periodId" defaultValue={proker.periodId} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                                          {periodsData.map((p: any) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <Button type="submit" className="mt-2">
                                        Simpan
                                      </Button>
                                    </form>

                                    <div className="grid gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
                                      <div className="text-sm font-semibold text-foreground">Panitia</div>
                                      {eligibleUsers.length > 0 ? (
                                        <form action={addPanitia} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                          <input type="hidden" name="prokerId" value={proker.id} />
                                          <select name="userId" className="w-full rounded-lg border border-border px-3 py-2 text-sm">
                                            {eligibleUsers.map((u: any) => (
                                              <option key={u.id} value={u.id}>
                                                {u.name} - {u.division?.name ?? "Tidak ada divisi"}
                                              </option>
                                            ))}
                                          </select>
                                          <Button type="submit" variant="outline" className="w-full sm:w-auto">
                                            Tambah
                                          </Button>
                                        </form>
                                      ) : (
                                        <div className="rounded border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">Semua user aktif di periode ini sudah menjadi panitia.</div>
                                      )}

                                      <div className="space-y-2">
                                        {proker.panitia.map((p: any) => (
                                          <div key={p.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm text-foreground">
                                            <span>
                                              {p.user.name} · {p.user.nim}
                                            </span>
                                            <form action={removePanitia}>
                                              <input type="hidden" name="panitiaId" value={p.id} />
                                              <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                Hapus
                                              </Button>
                                            </form>
                                          </div>
                                        ))}
                                        {proker.panitia.length === 0 && <div className="rounded border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">Belum ada panitia.</div>}
                                      </div>
                                    </div>
                                  </div>
                                </SheetContent>
                              </Sheet>

                              <ConfirmForm action={deleteProker}>
                                <input type="hidden" name="id" value={proker.id} />
                                <Button type="submit" variant="ghost" size="icon" aria-label="Hapus proker" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </ConfirmForm>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {prokers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          Belum ada proker.
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
