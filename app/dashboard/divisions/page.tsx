import React from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
import { createDivisionSchema } from "@/lib/validation";

type DivisionsPageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DivisionsPage({ searchParams }: DivisionsPageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageRoles(session.role)) redirect("/dashboard");

  async function createDivision(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const raw = { name: String(formData.get("name") ?? "") };
    const parsed = createDivisionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.division.create({ data: parsed.data });
    revalidatePath("/dashboard/divisions");
    redirect(`/dashboard/divisions?success=${encodeURIComponent("Divisi ditambahkan")}&alert=success`);
  }

  async function updateDivision(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    const raw = { name: String(formData.get("name") ?? "") };
    const parsed = createDivisionSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Input tidak valid");

    await prisma.division.update({ where: { id }, data: parsed.data });
    revalidatePath("/dashboard/divisions");
    redirect(`/dashboard/divisions?success=${encodeURIComponent("Divisi diperbarui")}&alert=success`);
  }

  async function deleteDivision(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");
    if (!canManageRoles(session.role)) redirect("/dashboard");

    const id = String(formData.get("id") ?? "");
    await prisma.division.delete({ where: { id } });
    revalidatePath("/dashboard/divisions");
    redirect(`/dashboard/divisions?success=${encodeURIComponent("Divisi dihapus")}&alert=success`);
  }

  const [activePeriod, divisions, currentUser] = await Promise.all([
    prisma.period.findFirst({ where: { isActive: true }, orderBy: { startYear: "desc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    session.userId ? prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const alert = params?.alert;

  const totalDivisions = divisions.length;
  const totalUsers = divisions.reduce((sum, d) => sum + d._count.users, 0);

  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Divisi" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success} type={alert === "error" ? "error" : "success"} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Divisi</h1>
              <p className="text-muted-foreground text-sm">Atur daftar divisi untuk user dan proker.</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Tambah Divisi</Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Tambah Divisi</SheetTitle>
                  <SheetDescription>Masukkan nama divisi baru.</SheetDescription>
                </SheetHeader>
                <form action={createDivision} className="grid gap-3 p-4 pt-0">
                  <label className="text-sm font-medium text-foreground">
                    Nama
                    <Input name="name" placeholder="BPI" required className="mt-1" />
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
                <CardTitle className="text-xl font-semibold">Ringkasan Divisi</CardTitle>
                <p className="text-muted-foreground text-sm">Status periode aktif dan distribusi anggota.</p>
              </div>
              {activePeriod ? <Badge variant="outline">Aktif: {activePeriod.name}</Badge> : <Badge variant="outline">Belum ada yang aktif</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Total Divisi", value: totalDivisions },
                  { label: "Total Anggota", value: totalUsers },
                  { label: "Rata-rata/Divisi", value: totalDivisions ? Math.round(totalUsers / totalDivisions) : 0 },
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
                <CardTitle className="text-lg">Daftar Divisi</CardTitle>
                <p className="text-muted-foreground text-sm">Kelola nama divisi dan anggota terkait.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Nama</TableHead>
                      <TableHead>Anggota</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="w-[180px] pr-4 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {divisions.map((division) => (
                      <TableRow key={division.id}>
                        <TableCell className="pl-4 font-medium">{division.name}</TableCell>
                        <TableCell className="text-muted-foreground">{division._count.users} anggota</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(division.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="sm:max-w-md">
                                <SheetHeader>
                                  <SheetTitle>Edit Divisi</SheetTitle>
                                  <SheetDescription>Perbarui nama divisi.</SheetDescription>
                                </SheetHeader>
                                <form action={updateDivision} className="grid gap-3 p-4 pt-0">
                                  <input type="hidden" name="id" value={division.id} />
                                  <label className="text-sm font-medium text-foreground">
                                    Nama
                                    <Input name="name" defaultValue={division.name} required className="mt-1" />
                                  </label>
                                  <Button type="submit" className="mt-2">
                                    Simpan
                                  </Button>
                                </form>
                              </SheetContent>
                            </Sheet>

                            <ConfirmForm action={deleteDivision}>
                              <input type="hidden" name="id" value={division.id} />
                              <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                Hapus
                              </Button>
                            </ConfirmForm>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {divisions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          Belum ada divisi.
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
