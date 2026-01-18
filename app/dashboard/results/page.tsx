import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SidebarShell } from "@/components/sidebar-shell";
import { SiteHeader } from "@/components/site-header";
import { SuccessAlert } from "@/components/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canViewResults } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventReport } from "@/services/reports";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewResults(session.role)) redirect("/dashboard");

  const [events, activePeriod, currentUser] = await Promise.all([
    prisma.evaluationEvent.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.period.findFirst({ where: { isActive: true }, orderBy: { startYear: "desc" } }),
    session.userId ? prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }) : Promise.resolve(null),
  ]);

  const selectedId = params.eventId ?? events[0]?.id;
  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const alert = params?.alert ? (params.alert as "success" | "info" | "error") : success ? "success" : undefined;

  if (!selectedId) {
    return (
      <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined}>
        <SiteHeader title="Hasil & Laporan" activePeriod={activePeriod?.name ?? "-"} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <SuccessAlert message={success} type={alert} />
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Belum ada event</CardTitle>
                <p className="text-muted-foreground text-sm">Buat atau buka event penilaian sebelum melihat laporan.</p>
              </CardHeader>
            </Card>
          </div>
        </div>
      </SidebarShell>
    );
  }

  const report = await getEventReport(selectedId, session);

  const evaluateeCount = report.results.length;
  const submissionCount = report.results.reduce((acc, r) => acc + r.raterCount, 0);
  const overallAvg = evaluateeCount ? report.results.reduce((acc, r) => acc + r.overallAvg, 0) / evaluateeCount : 0;
  const indicatorCount = report.event.indicators.length;
  const hardCount = report.event.indicators.filter((i) => i.category === "hard").length;
  const softCount = report.event.indicators.filter((i) => i.category === "soft").length;
  const otherCount = indicatorCount - hardCount - softCount;

  const indicatorAverages = buildIndicatorAverages(report.results);
  const sidebarStyle = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties;

  const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

  return (
    <SidebarShell user={currentUser ? { name: currentUser.name, email: currentUser.email ?? undefined } : undefined} sidebarStyle={sidebarStyle}>
      <SiteHeader title="Hasil & Laporan" activePeriod={activePeriod?.name ?? "-"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <SuccessAlert message={success} type={alert} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Laporan Penilaian</h1>
              <p className="text-muted-foreground text-sm">Rekap rata-rata per anggota, kategori, dan indikator dengan ekspor cepat.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/api/results/${selectedId}/export?format=xlsx`}>Export Excel</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/api/results/${selectedId}/export?format=csv`}>Export CSV</Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{report.event.name}</CardTitle>
                <p className="text-muted-foreground text-sm">
                  {report.event.type} · {report.event.period}
                  {report.event.proker ? ` · ${report.event.proker}` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  {dateFmt.format(new Date(report.event.startDate))} - {dateFmt.format(new Date(report.event.endDate))}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{evaluateeCount} evaluatee</Badge>
                  <Badge variant="outline">{indicatorCount} indikator</Badge>
                </div>
              </div>
              <form className="flex flex-wrap items-center gap-2" method="get">
                <label className="text-sm font-medium text-foreground">Pilih event</label>
                <select name="eventId" defaultValue={selectedId} className="rounded-lg border border-border px-3 py-2 text-sm">
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Tampilkan
                </Button>
              </form>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Rata-rata keseluruhan", value: overallAvg },
                  { label: "Total submission", value: submissionCount },
                  { label: "Indikator hard", value: hardCount },
                  { label: "Indikator soft", value: softCount },
                ].map((stat) => (
                  <div key={stat.label} className="border-border/60 bg-card/70 rounded-lg border px-3 py-3 shadow-xs">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-semibold tabular-nums">{typeof stat.value === "number" ? stat.value.toFixed(2).replace(/\.00$/, "") : stat.value}</p>
                  </div>
                ))}
                {otherCount > 0 && (
                  <div className="border-border/60 bg-card/70 rounded-lg border px-3 py-3 shadow-xs">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Indikator lainnya</p>
                    <p className="text-2xl font-semibold tabular-nums">{otherCount}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan indikator</CardTitle>
              <p className="text-muted-foreground text-sm">Rata-rata gabungan per indikator untuk event ini.</p>
            </CardHeader>
            <CardContent className="p-0">
              {indicatorAverages.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada skor indikator.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Indikator</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="pr-4 text-right">Rata-rata</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indicatorAverages.map((ind) => (
                        <TableRow key={ind.id}>
                          <TableCell className="pl-4 font-medium">{ind.name}</TableCell>
                          <TableCell className="text-muted-foreground">{ind.category}</TableCell>
                          <TableCell className="pr-4 text-right font-semibold">{ind.avg.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Per anggota</CardTitle>
              <p className="text-muted-foreground text-sm">Detail rata-rata per kategori dan indikator, termasuk feedback anonim.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.results.length === 0 && <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-muted-foreground">Belum ada submission.</div>}

              {report.results.map((res) => (
                <div key={res.evaluateeId} className="border-border/80 rounded-xl border p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{res.name}</div>
                      <p className="text-muted-foreground text-sm">{res.division ?? "-"}</p>
                      <p className="text-muted-foreground text-xs">Rater: {res.raterCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">Overall</p>
                      <p className="text-2xl font-semibold tabular-nums">{res.overallAvg.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(res.categoryAvg).map(([cat, val]) => (
                      <div key={cat} className="border-border/60 bg-card/70 rounded-lg border px-3 py-2">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{cat}</p>
                        <p className="text-lg font-semibold tabular-nums">{val.toFixed(2)}</p>
                      </div>
                    ))}
                    {Object.keys(res.categoryAvg).length === 0 && <div className="text-sm text-muted-foreground">Tidak ada kategori</div>}
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold">Per indikator</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {res.indicators.map((ind) => (
                        <div key={ind.id + res.evaluateeId} className="border-border/60 rounded-lg border px-3 py-2 text-sm">
                          <p className="font-medium">{ind.name}</p>
                          <p className="text-muted-foreground text-xs">{ind.category}</p>
                          <p className="text-sm font-semibold tabular-nums">{ind.avg.toFixed(2)}</p>
                        </div>
                      ))}
                      {res.indicators.length === 0 && <div className="text-sm text-muted-foreground">Belum ada skor.</div>}
                    </div>
                  </div>

                  {res.feedback.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold">Feedback (anonim)</p>
                      <ul className="mt-2 space-y-2 text-sm text-foreground">
                        {res.feedback.map((fb, idx) => (
                          <li key={idx} className="border-border/60 rounded-lg border px-3 py-2">
                            {fb}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarShell>
  );
}

function buildIndicatorAverages(
  results: Array<{
    indicators: Array<{ id: string; name: string; category: string; avg: number }>;
  }>,
) {
  const sums = new Map<string, { name: string; category: string; total: number; count: number }>();
  for (const res of results) {
    for (const ind of res.indicators) {
      const current = sums.get(ind.id) ?? { name: ind.name, category: ind.category, total: 0, count: 0 };
      current.total += ind.avg;
      current.count += 1;
      sums.set(ind.id, current);
    }
  }

  return Array.from(sums.entries()).map(([id, value]) => ({ id, name: value.name, category: value.category, avg: value.count ? value.total / value.count : 0 }));
}
