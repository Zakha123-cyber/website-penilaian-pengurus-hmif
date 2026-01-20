import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogoutButton } from "@/components/logout-button";
import { Progress } from "@/components/ui/progress";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function EvaluationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect("/");
  const currentUser = session.userId ? await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }) : null;

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
      redirect("/evaluations?error=Evaluasi%20tidak%20ditemukan");
    }

    const scores = evaluation.event.indicators.map((snap) => ({
      indicatorSnapshotId: snap.id,
      score: Number(formData.get(`score-${snap.id}`)),
    }));

    const parsed = submitEvaluationSchema.safeParse({ evaluationId, feedback, scores });
    if (!parsed.success) {
      redirect("/evaluations?error=Input%20tidak%20valid");
    }

    const now = new Date();
    if (!evaluation.event.isOpen || now < evaluation.event.startDate || now > evaluation.event.endDate) {
      redirect("/evaluations?error=Event%20tidak%20sedang%20dibuka");
    }

    if (evaluation.scores.length > 0) {
      redirect("/evaluations?error=Sudah%20pernah%20submit");
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

    revalidatePath("/evaluations");
    redirect("/evaluations?success=Penilaian%20tersimpan");
  }

  const now = new Date();

  const [pending, completed, openEvents] = await Promise.all([
    prisma.evaluation.findMany({
      where: { evaluatorId: session.userId, scores: { none: {} } },
      include: {
        evaluatee: { include: { division: true } },
        event: { include: { indicators: { include: { indicator: true } }, period: true, proker: true } },
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
      where: {
        isOpen: true,
        startDate: { lte: now },
        endDate: { gte: now },
        evaluations: { some: { evaluatorId: session.userId } },
      },
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
  const greetingName = currentUser?.name ?? "";

  const pendingByEvent = (() => {
    const map = new Map<
      string,
      {
        event: (typeof pending)[number]["event"];
        items: (typeof pending)[number][];
      }
    >();
    for (const ev of pending) {
      const key = ev.event.id;
      const bucket = map.get(key) ?? { event: ev.event, items: [] };
      bucket.items.push(ev);
      map.set(key, bucket);
    }
    return Array.from(map.values());
  })();

  const completedByEvent = (() => {
    const map = new Map<
      string,
      {
        event: (typeof completed)[number]["event"];
        items: (typeof completed)[number][];
      }
    >();
    for (const ev of completed) {
      const key = ev.event.id;
      const bucket = map.get(key) ?? { event: ev.event, items: [] };
      bucket.items.push(ev);
      map.set(key, bucket);
    }
    return Array.from(map.values());
  })();

  const pendingCountByEvent = new Map(pendingByEvent.map((g) => [g.event.id, g.items.length]));
  const completedCountByEvent = new Map(completedByEvent.map((g) => [g.event.id, g.items.length]));

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Halo{greetingName ? `, ${greetingName}` : ""}!</p>
              <h1 className="text-2xl font-semibold text-slate-900">Siap melakukan penilaian?</h1>
              <p className="text-sm text-slate-600 mt-1">Isi tugas penilaian yang sudah ditetapkan otomatis. Event yang sedang dibuka bisa langsung kamu kerjakan.</p>
            </div>
            <LogoutButton />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Fokus pada objektivitas dan beri feedback singkat yang membangun.</div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">Pastikan menyelesaikan semua penilaian sebelum event ditutup.</div>
          </div>
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
              <Link key={ev.id} href={`/evaluations/${ev.id}`} className="rounded-xl border border-slate-200 px-4 py-3 shadow-xs transition hover:border-slate-300 hover:bg-slate-50">
                <div className="text-sm font-semibold text-slate-900">{ev.name}</div>
                <div className="text-xs text-slate-600">
                  {ev.type} · {ev.period.name}
                  {ev.proker ? ` · ${ev.proker.name}` : ""}
                </div>
                <div className="text-xs text-slate-600">
                  {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-600">Indikator: {ev.indicators.length}</div>
                <div className="text-xs text-slate-600">Sisa tugas: {pendingCountByEvent.get(ev.id) ?? 0}</div>
              </Link>
            ))}
            {openEvents.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Tidak ada event terbuka.</div>}
          </div>
        </div>

        {pending.length === 0 && completed.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-500">Tidak ada assignment.</div>}

        {pendingByEvent.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Progres penilaian</h2>
              <span className="text-sm text-slate-600">{pending.length} tugas belum disubmit</span>
            </div>
            <div className="mt-4 space-y-4">
              {pendingByEvent.map((group) => {
                const completedCount = completedCountByEvent.get(group.event.id) ?? 0;
                const pendingCount = group.items.length;
                const total = completedCount + pendingCount;
                const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
                return (
                  <div key={group.event.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{group.event.name}</div>
                        <div className="text-xs text-slate-600">
                          {group.event.type} · {group.event.period?.name ?? "-"}
                          {group.event.proker ? ` · ${group.event.proker.name ?? ""}` : ""}
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(group.event.startDate).toLocaleDateString()} - {new Date(group.event.endDate).toLocaleDateString()}
                          {!group.event.isOpen && <span className="ml-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">Ditutup</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-700">
                        {pendingCount} belum • {completedCount} selesai
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Progress value={percent} />
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>{percent}% selesai</span>
                        <Link href={`/evaluations/${group.event.id}`} className="text-xs font-semibold text-slate-900 hover:underline">
                          Buka penilaian
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {completedByEvent.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Sudah disubmit</h2>
              <span className="text-sm text-slate-600">{completed.length} tugas</span>
            </div>
            <div className="mt-4 space-y-4">
              {completedByEvent.map((group) => (
                <div key={group.event.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{group.event.name}</div>
                      <div className="text-xs text-slate-600">{group.event.type}</div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{group.items.length} terkirim</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {group.items.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{ev.evaluatee.name}</div>
                            <div className="text-xs text-slate-600">{ev.evaluatee.division?.name ?? "-"}</div>
                          </div>
                          <div className="text-xs text-slate-600">{ev.scores.length} indikator</div>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
