import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function EvaluationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");

  async function submitEvaluation(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/");

    const evaluationId = String(formData.get("evaluationId") ?? "");
    const feedback = String(formData.get("feedback") ?? "");

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        event: { include: { indicators: true } },
        scores: true,
      },
    });

    if (!evaluation || evaluation.evaluatorId !== session.userId) {
      redirect("/dashboard/evaluations?error=Evaluasi%20tidak%20ditemukan");
    }

    const scores = evaluation.event.indicators.map((snap) => ({
      indicatorSnapshotId: snap.id,
      score: Number(formData.get(`score-${snap.id}`)),
    }));

    const parsed = submitEvaluationSchema.safeParse({ evaluationId, feedback, scores });
    if (!parsed.success) {
      redirect("/dashboard/evaluations?error=Input%20tidak%20valid");
    }

    const now = new Date();
    if (!evaluation.event.isOpen || now < evaluation.event.startDate || now > evaluation.event.endDate) {
      redirect("/dashboard/evaluations?error=Event%20tidak%20sedang%20dibuka");
    }

    if (evaluation.scores.length > 0) {
      redirect("/dashboard/evaluations?error=Sudah%20pernah%20submit");
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluationScore.createMany({
        data: scores.map((s) => ({
          evaluationId: evaluation.id,
          indicatorSnapshotId: s.indicatorSnapshotId,
          score: s.score,
        })),
      });
      await tx.evaluation.update({ where: { id: evaluation.id }, data: { feedback } });
    });

    revalidatePath("/dashboard/evaluations");
    redirect("/dashboard/evaluations?success=Penilaian%20tersimpan");
  }

  const now = new Date();

  const [pending, completed, openEvents] = await Promise.all([
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, scores: { none: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: { include: { indicators: { include: { indicator: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, scores: { some: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: true,
        scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluationEvent.findMany({
      where: { isOpen: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      include: {
        period: true,
        proker: true,
        indicators: true,
        _count: { select: { evaluations: true } },
      },
    }),
  ]);

  const success = params?.success ? decodeURIComponent(params.success) : undefined;
  const error = params?.error ? decodeURIComponent(params.error) : undefined;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm text-slate-500">Penilaian yang harus Anda isi</p>
          <h1 className="text-2xl font-semibold text-slate-900">Evaluations</h1>
          <p className="text-sm text-slate-600 mt-1">Isi penilaian sesuai assignment otomatis. Event tertutup tidak bisa disubmit.</p>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Event dibuka</h2>
            <span className="text-sm text-slate-600">{openEvents.length} event</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {openEvents.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{ev.name}</div>
                <div className="text-xs text-slate-600">
                  {ev.type} · {ev.period.name}
                  {ev.proker ? ` · ${ev.proker.name}` : ""}
                </div>
                <div className="text-xs text-slate-600">
                  {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-600">Indikator: {ev.indicators.length}</div>
                <div className="text-xs text-slate-600">Tugas terkirim: {ev._count.evaluations}</div>
              </div>
            ))}
            {openEvents.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Tidak ada event terbuka.</div>}
          </div>
        </div>

        {pending.length === 0 && completed.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500">Tidak ada assignment.</div>}

        {pending.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Belum disubmit</h2>
              <span className="text-sm text-slate-600">{pending.length} tugas</span>
            </div>
            <div className="mt-4 space-y-6">
              {pending.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{ev.evaluatee.name}</div>
                      <div className="text-xs text-slate-600">{ev.evaluatee.division?.name ?? "-"}</div>
                      <div className="text-xs text-slate-600">Event: {ev.event.name}</div>
                      <div className="text-xs text-slate-600">
                        {new Date(ev.event.startDate).toLocaleDateString()} - {new Date(ev.event.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    {!ev.event.isOpen && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Ditutup</span>}
                  </div>

                  <form action={submitEvaluation} className="mt-4 space-y-3">
                    <input type="hidden" name="evaluationId" value={ev.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ev.event.indicators.map((snap) => (
                        <label key={snap.id} className="flex flex-col gap-1 text-sm text-slate-700">
                          <span className="font-medium text-slate-800">{snap.indicator.name}</span>
                          <select name={`score-${snap.id}`} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={!ev.event.isOpen} defaultValue="3">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Feedback</p>
                      <Textarea name="feedback" placeholder="Catatan singkat" className="mt-1" disabled={!ev.event.isOpen} />
                    </div>
                    <Button type="submit" disabled={!ev.event.isOpen}>
                      Simpan Penilaian
                    </Button>
                    {!ev.event.isOpen && <p className="text-xs text-amber-700">Event ini sedang ditutup.</p>}
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Sudah disubmit</h2>
              <span className="text-sm text-slate-600">{completed.length} tugas</span>
            </div>
            <div className="mt-4 space-y-4">
              {completed.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{ev.evaluatee.name}</div>
                      <div className="text-xs text-slate-600">{ev.evaluatee.division?.name ?? "-"}</div>
                      <div className="text-xs text-slate-600">Event: {ev.event.name}</div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Terkirim</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {ev.scores.map((s) => (
                      <div key={s.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <div className="font-medium text-slate-800">{s.indicatorSnapshot.indicator.name}</div>
                        <div className="text-slate-700">Skor: {s.score}</div>
                      </div>
                    ))}
                  </div>
                  {ev.feedback && <p className="mt-2 text-sm text-slate-700">Catatan: {ev.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
