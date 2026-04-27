import React from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { Pencil, Trash2 } from "lucide-react";

import { ConfirmForm } from "@/components/confirm-form";
import { IndicatorForm } from "@/components/indicator-form";
import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { SuccessAlert } from "@/components/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { db } from "@/lib/db";
import { indicators as indicatorsTable, periods, users, indicatorSnapshots } from "@/lib/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { createIndicatorSchema, updateIndicatorSchema } from "@/lib/validation";

const ROLE_LABELS: Record<string, string> = {
  BPI: "BPI",
  KADIV: "Kepala Divisi",
  KASUBDIV: "Kepala Sub Divisi",
  ANGGOTA: "Anggota",
};

// 11 kombinasi valid sesuai hierarki assignment generator
const HIERARCHY_PAIRS = [
  { evaluatorRole: "BPI", evaluateeRole: "KADIV" },
  { evaluatorRole: "BPI", evaluateeRole: "KASUBDIV" },
  { evaluatorRole: "KADIV", evaluateeRole: "BPI" },
  { evaluatorRole: "KADIV", evaluateeRole: "KASUBDIV" },
  { evaluatorRole: "KADIV", evaluateeRole: "ANGGOTA" },
  { evaluatorRole: "KASUBDIV", evaluateeRole: "KADIV" },
  { evaluatorRole: "KASUBDIV", evaluateeRole: "ANGGOTA" },
  { evaluatorRole: "ANGGOTA", evaluateeRole: "BPI" },
  { evaluatorRole: "ANGGOTA", evaluateeRole: "KADIV" },
  { evaluatorRole: "ANGGOTA", evaluateeRole: "KASUBDIV" },
  { evaluatorRole: "ANGGOTA", evaluateeRole: "ANGGOTA" },
];

type IndicatorsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function IndicatorsPage({ searchParams }: IndicatorsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = {
      name: String(formData.get("name") ?? ""),
      evaluatorRole: String(formData.get("evaluatorRole") ?? ""),
      evaluateeRole: String(formData.get("evaluateeRole") ?? ""),
      type: String(formData.get("type") ?? "PERIODIC"),
      isActive: formData.get("isActive") === "on" ? 1 : 0,
    };
    const parsed = createIndicatorSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await db.insert(indicatorsTable).values({ id: crypto.randomUUID(), ...parsed.data });
    revalidatePath("/dashboard/indicators");
    redirect(`/dashboard/indicators?success=${encodeURIComponent("Indikator ditambahkan")}&alert=success`);
  }

  async function updateIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = {
      name: String(formData.get("name") ?? ""),
      evaluatorRole: String(formData.get("evaluatorRole") ?? ""),
      evaluateeRole: String(formData.get("evaluateeRole") ?? ""),
      type: String(formData.get("type") ?? "PERIODIC"),
      isActive: formData.get("isActive") === "on" ? 1 : 0,
    };
    const parsed = updateIndicatorSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await db.update(indicatorsTable).set(parsed.data).where(eq(indicatorsTable.id, id));
    revalidatePath("/dashboard/indicators");
    redirect(`/dashboard/indicators?success=${encodeURIComponent("Indikator diperbarui")}&alert=success`);
  }

  async function deleteIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");

    const [countRow] = await db.select({ cnt: sql<number>`count(*)` }).from(indicatorSnapshots).where(eq(indicatorSnapshots.indicatorId, id));
    const snapshotsCount = Number(countRow?.cnt ?? 0);

    if (snapshotsCount > 0) {
      redirect(`/dashboard/indicators?error=${encodeURIComponent("Tidak dapat menghapus: indikator sudah dipakai event")}&alert=error`);
    }

    await db.delete(indicatorsTable).where(eq(indicatorsTable.id, id));
    revalidatePath("/dashboard/indicators");
    redirect(`/dashboard/indicators?success=${encodeURIComponent("Indikator dihapus")}&alert=success`);
  }

  const [activePeriod, indicatorsData, currentUser] = await Promise.all([
    db.query.periods.findFirst({ where: eq(periods.isActive, 1), orderBy: [desc(periods.startYear)] }),
    db.select().from(indicatorsTable).orderBy(asc(indicatorsTable.evaluatorRole), asc(indicatorsTable.evaluateeRole), asc(indicatorsTable.name)) as any,
    session.userId ? db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const error = params?.error ? decodeURIComponent(params.error) : undefined;
  const alert = (params?.alert as "success" | "error" | "info") ?? (error ? "error" : "success");

  const totalIndicators = (indicatorsData as any[]).length;
  const activeIndicators = (indicatorsData as any[]).filter((i) => i.isActive === 1).length;

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Indikator" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success ?? error} type={alert} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Indikator Penilaian</h1>
              <p className="text-muted-foreground text-sm">Kelola indikator per pasangan hierarki penilai → yang dinilai.</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Tambah Indikator</Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md flex flex-col">
                <SheetHeader>
                  <SheetTitle>Tambah Indikator</SheetTitle>
                  <SheetDescription>Tentukan nama, kategori, dan hierarki penilaian.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <IndicatorForm action={createIndicator} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Ringkasan */}
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl font-semibold">Ringkasan Indikator</CardTitle>
                <p className="text-muted-foreground text-sm">Hitung cepat status aktif indikator.</p>
              </div>
              {activePeriod ? <Badge variant="outline">Aktif: {activePeriod.name}</Badge> : <Badge variant="outline">Belum ada periode aktif</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total", value: totalIndicators },
                  { label: "Aktif", value: activeIndicators },
                ].map((stat) => (
                  <div key={stat.label} className="border-border/60 bg-card/60 rounded-lg border px-3 py-3 shadow-xs">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Render PROKER Indicators First */}
          {(() => {
            const prokerGroup = (indicatorsData as any[]).filter((i) => i.type === "PROKER");
            if (prokerGroup.length === 0) return null;
            return (
              <Card className="overflow-hidden border-sky-100">
                <CardHeader className="pb-2 bg-sky-50/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="default" className="font-semibold bg-sky-600 hover:bg-sky-700">Program Kerja (Proker)</Badge>
                    <span className="text-muted-foreground text-sm">Penilaian Umum Acara</span>
                    <span className="ml-auto text-xs text-muted-foreground font-normal">{prokerGroup.length} indikator</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Nama</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-4 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prokerGroup.map((indicator: any) => (
                          <TableRow key={indicator.id}>
                            <TableCell className="pl-4 font-medium">{indicator.name}</TableCell>
                            <TableCell>
                              <Badge variant={indicator.isActive === 1 ? "default" : "outline"}>{indicator.isActive === 1 ? "Aktif" : "Nonaktif"}</Badge>
                            </TableCell>
                            <TableCell className="pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <Sheet>
                                  <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" aria-label="Edit indikator">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </SheetTrigger>
                                  <SheetContent side="right" className="sm:max-w-md flex flex-col">
                                    <SheetHeader>
                                      <SheetTitle>Edit Indikator</SheetTitle>
                                      <SheetDescription>Perbarui nama, jenis, atau status.</SheetDescription>
                                    </SheetHeader>
                                    <div className="flex-1 overflow-y-auto">
                                      <IndicatorForm
                                        action={updateIndicator}
                                        defaultValues={{
                                          id: indicator.id,
                                          name: indicator.name,
                                          type: indicator.type,
                                          isActive: indicator.isActive === 1,
                                        }}
                                      />
                                    </div>
                                  </SheetContent>
                                </Sheet>

                                <ConfirmForm action={deleteIndicator}>
                                  <input type="hidden" name="id" value={indicator.id} />
                                  <Button type="submit" variant="ghost" size="icon" aria-label="Hapus indikator" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </ConfirmForm>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Tabel dikelompokkan per pasangan hierarki (PERIODIC) */}
          {HIERARCHY_PAIRS.map(({ evaluatorRole, evaluateeRole }) => {
            const group = (indicatorsData as any[]).filter(
              (i) => i.type !== "PROKER" && i.evaluatorRole === evaluatorRole && i.evaluateeRole === evaluateeRole
            );

            return (
              <Card key={`${evaluatorRole}-${evaluateeRole}`} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline" className="font-semibold">{ROLE_LABELS[evaluatorRole]}</Badge>
                    <span className="text-muted-foreground text-sm">menilai</span>
                    <Badge variant="outline" className="font-semibold">{ROLE_LABELS[evaluateeRole]}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground font-normal">{group.length} indikator</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Nama</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-4 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.map((indicator: any) => (
                          <TableRow key={indicator.id}>
                            <TableCell className="pl-4 font-medium">{indicator.name}</TableCell>
                            <TableCell>
                              <Badge variant={indicator.isActive === 1 ? "default" : "outline"}>{indicator.isActive === 1 ? "Aktif" : "Nonaktif"}</Badge>
                            </TableCell>
                            <TableCell className="pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <Sheet>
                                  <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" aria-label="Edit indikator">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </SheetTrigger>
                                  <SheetContent side="right" className="sm:max-w-md flex flex-col">
                                    <SheetHeader>
                                      <SheetTitle>Edit Indikator</SheetTitle>
                                      <SheetDescription>Perbarui nama, hierarki, atau status.</SheetDescription>
                                    </SheetHeader>
                                    <div className="flex-1 overflow-y-auto">
                                      <IndicatorForm
                                        action={updateIndicator}
                                        defaultValues={{
                                          id: indicator.id,
                                          name: indicator.name,
                                          type: indicator.type,
                                          evaluatorRole: indicator.evaluatorRole,
                                          evaluateeRole: indicator.evaluateeRole,
                                          isActive: indicator.isActive === 1,
                                        }}
                                      />
                                    </div>
                                  </SheetContent>
                                </Sheet>

                                <ConfirmForm action={deleteIndicator}>
                                  <input type="hidden" name="id" value={indicator.id} />
                                  <Button type="submit" variant="ghost" size="icon" aria-label="Hapus indikator" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </ConfirmForm>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {group.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="pl-4 text-sm text-muted-foreground py-3">
                              Belum ada indikator untuk kombinasi ini.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SidebarShell>
  );
}
