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
import { prisma } from "@/lib/prisma";
import { createIndicatorSchema, updateIndicatorSchema } from "@/lib/validation";

const categories = [
  { value: "hard", label: "Hard skill" },
  { value: "soft", label: "Soft skill" },
  { value: "other", label: "Lainnya" },
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
      category: String(formData.get("category") ?? "hard"),
      isActive: formData.get("isActive") === "on",
    };
    const parsed = createIndicatorSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.indicator.create({ data: parsed.data });
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
      category: String(formData.get("category") ?? "hard"),
      isActive: formData.get("isActive") === "on",
    };
    const parsed = updateIndicatorSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.indicator.update({ where: { id }, data: parsed.data });
    revalidatePath("/dashboard/indicators");
    redirect(`/dashboard/indicators?success=${encodeURIComponent("Indikator diperbarui")}&alert=success`);
  }

  async function deleteIndicator(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");

    const snapshots = await prisma.indicatorSnapshot.count({ where: { indicatorId: id } });
    if (snapshots > 0) {
      redirect(`/dashboard/indicators?error=${encodeURIComponent("Tidak dapat menghapus: indikator sudah dipakai event")}&alert=error`);
    }

    await prisma.indicator.delete({ where: { id } });
    revalidatePath("/dashboard/indicators");
    redirect(`/dashboard/indicators?success=${encodeURIComponent("Indikator dihapus")}&alert=success`);
  }

  const [activePeriod, indicators, currentUser] = await Promise.all([
    prisma.period.findFirst({ where: { isActive: true }, orderBy: { startYear: "desc" } }),
    prisma.indicator.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    session.userId ? prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const error = params?.error ? decodeURIComponent(params.error) : undefined;
  const alert = (params?.alert as "success" | "error" | "info") ?? (error ? "error" : "success");

  const totalIndicators = indicators.length;
  const activeIndicators = indicators.filter((i) => i.isActive).length;
  const hardCount = indicators.filter((i) => i.category === "hard").length;
  const softCount = indicators.filter((i) => i.category === "soft").length;

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
              <p className="text-muted-foreground text-sm">Kelola indikator hard/soft skill yang akan disalin ke event.</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Tambah Indikator</Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md flex flex-col">
                <SheetHeader>
                  <SheetTitle>Tambah Indikator</SheetTitle>
                  <SheetDescription>Masukkan nama dan kategori indikator.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <form action={createIndicator} className="grid gap-3 p-4 pt-0">
                    <label className="text-sm font-medium text-foreground">
                      Nama
                      <Input name="name" placeholder="Kerja sama tim" required className="mt-1" />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Kategori
                      <select name="category" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        {categories.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
                      <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                      Aktif
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
                <CardTitle className="text-xl font-semibold">Ringkasan Indikator</CardTitle>
                <p className="text-muted-foreground text-sm">Hitung cepat status aktif dan kategori.</p>
              </div>
              {activePeriod ? <Badge variant="outline">Aktif: {activePeriod.name}</Badge> : <Badge variant="outline">Belum ada periode aktif</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total", value: totalIndicators },
                  { label: "Aktif", value: activeIndicators },
                  { label: "Hard", value: hardCount },
                  { label: "Soft", value: softCount },
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
                <CardTitle className="text-lg">Daftar Indikator</CardTitle>
                <p className="text-muted-foreground text-sm">Edit cepat nama, kategori, dan status.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Nama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[148px] pr-4 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicators.map((indicator) => (
                      <TableRow key={indicator.id}>
                        <TableCell className="pl-4 font-medium">{indicator.name}</TableCell>
                        <TableCell className="text-muted-foreground">{categories.find((c) => c.value === indicator.category)?.label ?? indicator.category}</TableCell>
                        <TableCell>
                          <Badge variant={indicator.isActive ? "default" : "outline"}>{indicator.isActive ? "Aktif" : "Nonaktif"}</Badge>
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
                                  <SheetDescription>Perbarui nama, kategori, atau status indikator.</SheetDescription>
                                </SheetHeader>
                                <div className="flex-1 overflow-y-auto">
                                  <form action={updateIndicator} className="grid gap-3 p-4 pt-0">
                                    <input type="hidden" name="id" value={indicator.id} />
                                    <label className="text-sm font-medium text-foreground">
                                      Nama
                                      <Input name="name" defaultValue={indicator.name} required className="mt-1" />
                                    </label>
                                    <label className="text-sm font-medium text-foreground">
                                      Kategori
                                      <select name="category" defaultValue={indicator.category} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                                        {categories.map((c) => (
                                          <option key={c.value} value={c.value}>
                                            {c.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
                                      <input name="isActive" type="checkbox" defaultChecked={indicator.isActive} className="h-4 w-4 rounded border-border" />
                                      Aktif
                                    </label>
                                    <Button type="submit" className="mt-1">
                                      Simpan
                                    </Button>
                                  </form>
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
                    {indicators.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          Belum ada indikator.
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
