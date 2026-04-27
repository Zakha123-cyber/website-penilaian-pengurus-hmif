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
import { periods, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { createPeriodSchema } from "@/lib/validation";

type PeriodsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PeriodsPage({ searchParams }: PeriodsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createPeriod(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      name: String(formData.get("name") ?? ""),
      startYear: formData.get("startYear"),
      endYear: formData.get("endYear"),
      isActive: formData.get("isActive") === "on" ? 1 : 0,
    };

    const parsed = createPeriodSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const { name, startYear, endYear, isActive } = parsed.data;

    if (isActive) await db.update(periods).set({ isActive: 0 });

    await db.insert(periods).values({ id: crypto.randomUUID(), name, startYear, endYear, isActive, createdAt: new Date() });
    revalidatePath("/dashboard/periods");
    redirect(`/dashboard/periods?success=${encodeURIComponent("Periode ditambahkan")}&alert=success`);
  }

  async function updatePeriod(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      name: String(formData.get("name") ?? ""),
      startYear: formData.get("startYear"),
      endYear: formData.get("endYear"),
      isActive: formData.get("isActive") === "on" ? 1 : 0,
    };

    const parsed = createPeriodSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    const { name, startYear, endYear, isActive } = parsed.data;

    if (isActive) await db.update(periods).set({ isActive: 0 });

    await db.update(periods).set({ name, startYear, endYear, isActive }).where(eq(periods.id, id));
    revalidatePath("/dashboard/periods");
    redirect(`/dashboard/periods?success=${encodeURIComponent("Periode diperbarui")}&alert=success`);
  }

  async function deletePeriod(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await db.delete(periods).where(eq(periods.id, id));
    revalidatePath("/dashboard/periods");
    redirect(`/dashboard/periods?success=${encodeURIComponent("Periode dihapus")}&alert=success`);
  }

  const [activePeriod, allPeriods, currentUser] = await Promise.all([
    db.query.periods.findFirst({ where: eq(periods.isActive, 1), orderBy: [desc(periods.startYear)] }),
    db.select().from(periods).orderBy(desc(periods.startYear)),
    session.userId ? db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const periodsData = allPeriods;

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const alert = params?.alert;

  const totalPeriods = periodsData.length;
  const activeCount = periodsData.filter((p) => p.isActive === 1).length;
  const inactiveCount = totalPeriods - activeCount;

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Periode" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success} type={alert === "error" ? "error" : "success"} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Periode</h1>
              <p className="text-muted-foreground text-sm">Atur periode kepengurusan dan tandai yang aktif.</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Tambah Periode</Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Tambah Periode</SheetTitle>
                  <SheetDescription>Masukkan rentang tahun dan status aktif.</SheetDescription>
                </SheetHeader>
                <form action={createPeriod} className="grid gap-3 p-4 pt-0">
                  <label className="text-sm font-medium text-foreground">
                    Nama
                    <Input name="name" placeholder="2025/2026" required className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Tahun Mulai
                    <Input name="startYear" type="number" min={2000} max={3000} required className="mt-1" />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Tahun Akhir
                    <Input name="endYear" type="number" min={2000} max={3000} required className="mt-1" />
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <input name="isActive" type="checkbox" className="h-4 w-4 rounded border-border" />
                    Jadikan aktif
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
                <CardTitle className="text-xl font-semibold">Ringkasan Periode</CardTitle>
                <p className="text-muted-foreground text-sm">Status aktif dan total data yang tersimpan.</p>
              </div>
              {activePeriod ? <Badge variant="outline">Aktif: {activePeriod.name}</Badge> : <Badge variant="outline">Belum ada yang aktif</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Total", value: totalPeriods },
                  { label: "Aktif", value: activeCount },
                  { label: "Nonaktif", value: inactiveCount },
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
                <CardTitle className="text-lg">Daftar Periode</CardTitle>
                <p className="text-muted-foreground text-sm">Kelola rentang tahun dan status aktif.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Nama</TableHead>
                      <TableHead>Rentang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[148px] pr-4 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodsData.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="pl-4 font-medium">{period.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {period.startYear} - {period.endYear}
                        </TableCell>
                        <TableCell>
                          <Badge variant={period.isActive === 1 ? "default" : "outline"}>{period.isActive === 1 ? "Aktif" : "Nonaktif"}</Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Edit periode">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="sm:max-w-md">
                                <SheetHeader>
                                  <SheetTitle>Edit Periode</SheetTitle>
                                  <SheetDescription>Perbarui nama, rentang tahun, atau status aktif.</SheetDescription>
                                </SheetHeader>
                                <form action={updatePeriod} className="grid gap-3 p-4 pt-0">
                                  <input type="hidden" name="id" value={period.id} />
                                  <label className="text-sm font-medium text-foreground">
                                    Nama
                                    <Input name="name" defaultValue={period.name} required className="mt-1" />
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    Tahun Mulai
                                    <Input name="startYear" type="number" min={2000} max={3000} defaultValue={period.startYear} required className="mt-1" />
                                  </label>
                                  <label className="text-sm font-medium text-foreground">
                                    Tahun Akhir
                                    <Input name="endYear" type="number" min={2000} max={3000} defaultValue={period.endYear} required className="mt-1" />
                                  </label>
                                  <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                                    <input name="isActive" type="checkbox" defaultChecked={period.isActive === 1} className="h-4 w-4 rounded border-border" />
                                    Jadikan aktif
                                  </label>
                                  <Button type="submit" className="mt-2">
                                    Simpan
                                  </Button>
                                </form>
                              </SheetContent>
                            </Sheet>

                            <ConfirmForm action={deletePeriod}>
                              <input type="hidden" name="id" value={period.id} />
                              <Button type="submit" variant="ghost" size="icon" aria-label="Hapus periode" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ConfirmForm>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {periodsData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          Belum ada periode.
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
