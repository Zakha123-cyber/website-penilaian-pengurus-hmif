import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EventEvaluationsPage({ params, searchParams }: PageProps) {
  const query = await searchParams;
  const { eventId } = await params;
  const session = await getSession();
  if (!session) redirect("/");

  const success = query?.success ? decodeURIComponent(query.success) : undefined;
  const error = query?.error ? decodeURIComponent(query.error) : undefined;

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

    if (!evaluation || evaluation.evaluatorId !== session.userId || evaluation.eventId !== eventId) {
      redirect(`/evaluations/${eventId}?error=Evaluasi%20tidak%20ditemukan`);
    }

    const scores = evaluation.event.indicators.map((snap) => ({
      indicatorSnapshotId: snap.id,
      score: Number(formData.get(`score-${snap.id}`)),
    }));

    const parsed = submitEvaluationSchema.safeParse({ evaluationId, feedback, scores });
    if (!parsed.success) {
      redirect(`/evaluations/${eventId}?error=Input%20tidak%20valid`);
    }

    const now = new Date();
    if (!evaluation.event.isOpen || now < evaluation.event.startDate || now > evaluation.event.endDate) {
      redirect(`/evaluations/${eventId}?error=Event%20tidak%20sedang%20dibuka`);
    }

    if (evaluation.scores.length > 0) {
      redirect(`/evaluations/${eventId}?error=Sudah%20pernah%20submit`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluationScore.createMany({
        data: scores.map((s) => ({ evaluationId: evaluation.id, indicatorSnapshotId: s.indicatorSnapshotId, score: s.score })),
      });
      await tx.evaluation.update({ where: { id: evaluation.id }, data: { feedback } });
    });

    revalidatePath("/evaluations");
    revalidatePath(`/evaluations/${eventId}`);
    redirect(`/evaluations/${eventId}?success=Penilaian%20tersimpan`);
  }

  const now = new Date();

  const [event, pending, completed] = await Promise.all([
    prisma.evaluationEvent.findUnique({
      where: { id: eventId },
      include: {
        period: true,
        proker: true,
        indicators: { include: { indicator: true } },
      },
    }),
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, eventId, scores: { none: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: { include: { indicators: { include: { indicator: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, eventId, scores: { some: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: true,
        scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!event) {
    redirect("/evaluations?error=Event%20tidak%20ditemukan");
  }

  if (pending.length === 0 && completed.length === 0) {
    redirect("/evaluations?error=Tidak%20ada%20tugas%20untuk%20event%20ini");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-slate-600">Event penilaian</div>
            <h1 className="text-2xl font-semibold text-slate-900">{event.name}</h1>
            <div className="text-sm text-slate-700">
              {event.type} · {event.period?.name ?? "-"}
              {event.proker ? ` · ${event.proker.name ?? ""}` : ""}
            </div>
            <div className="text-xs text-slate-600">
              {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
              {!event.isOpen && <span className="ml-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">Ditutup</span>}
            </div>
          </div>
          <Link href="/evaluations" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            ← Kembali
          </Link>
        </div>

        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        {pending.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Belum disubmit</h2>
              <span className="text-sm text-slate-600">{pending.length} tugas</span>
            </div>
            <div className="mt-4 space-y-4">
              {pending.map((ev) => (
                <details key={ev.id} className="group rounded-xl border border-slate-200 p-4">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    <div className="flex flex-col">
                      <span>{ev.evaluatee.name}</span>
                      <span className="text-xs text-slate-600">{ev.evaluatee.division?.name ?? "-"}</span>
                    </div>
                    <div className="text-xs text-slate-600 text-right">{ev.event.indicators.length} indikator</div>
                  </summary>
                  <div className="mt-4 space-y-3">
                    <form action={submitEvaluation} className="space-y-3">
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
                </details>
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
                      <div className="text-xs text-slate-600">Terkirim</div>
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
