import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canViewResults } from "@/lib/permissions";
import { getEventReport } from "@/services/reports";
import { Button } from "@/components/ui/button";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");
  if (!canViewResults(session.role)) redirect("/dashboard");

  const events = await prisma.evaluationEvent.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } });
  const selectedId = params.eventId ?? events[0]?.id;

  if (!selectedId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Hasil penilaian</p>
              <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
              <p className="text-sm text-slate-600 mt-1">Belum ada event untuk ditampilkan.</p>
            </div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Kembali
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const report = await getEventReport(selectedId, session);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Hasil penilaian</p>
            <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
            <p className="text-sm text-slate-600 mt-1">Rekap rata-rata per anggota dan indikator.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Kembali
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form className="flex items-center gap-2" method="get">
            <label className="text-sm text-slate-700">Pilih event</label>
            <select name="eventId" defaultValue={selectedId} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Tampilkan
            </Button>
          </form>
          <Button asChild variant="ghost">
            <Link href={`/api/results/${selectedId}/export?format=xlsx`}>Export Excel</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/api/results/${selectedId}/export?format=csv`}>Export CSV</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-lg font-semibold text-slate-900">{report.event.name}</div>
              <div className="text-sm text-slate-600">
                {report.event.type} · {report.event.period}
                {report.event.proker ? ` · ${report.event.proker}` : ""}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(report.event.startDate).toLocaleDateString()} - {new Date(report.event.endDate).toLocaleDateString()}
              </div>
            </div>
            <div className="text-sm text-slate-700">{report.results.length} evaluatee</div>
          </div>

          {report.results.length === 0 && <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Belum ada submission.</div>}

          {report.results.length > 0 && (
            <div className="mt-6 space-y-4">
              {report.results.map((res) => (
                <div key={res.evaluateeId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{res.name}</div>
                      <div className="text-sm text-slate-600">{res.division ?? "-"}</div>
                      <div className="text-xs text-slate-500">Rater: {res.raterCount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Overall</div>
                      <div className="text-xl font-semibold text-slate-900">{res.overallAvg.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(res.categoryAvg).map(([cat, val]) => (
                      <div key={cat} className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-xs text-slate-500">{cat}</div>
                        <div className="text-base font-semibold text-slate-900">{val.toFixed(2)}</div>
                      </div>
                    ))}
                    {Object.keys(res.categoryAvg).length === 0 && <div className="text-sm text-slate-500">Tidak ada kategori</div>}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-slate-900">Per indikator</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {res.indicators.map((ind) => (
                        <div key={ind.id + res.evaluateeId} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <div className="font-medium text-slate-800">{ind.name}</div>
                          <div className="text-xs text-slate-500">{ind.category}</div>
                          <div className="text-sm font-semibold text-slate-900">{ind.avg.toFixed(2)}</div>
                        </div>
                      ))}
                      {res.indicators.length === 0 && <div className="text-sm text-slate-500">Belum ada skor.</div>}
                    </div>
                  </div>

                  {res.feedback.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-slate-900">Feedback (anonim)</div>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {res.feedback.map((fb, idx) => (
                          <li key={idx} className="rounded-lg border border-slate-200 px-3 py-2">
                            {fb}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
