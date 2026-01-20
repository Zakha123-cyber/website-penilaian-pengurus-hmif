import { prisma } from "@/lib/prisma";
import { isKadivPSDM } from "@/lib/permissions";
import { exportEventToXlsx } from "@/utils/excel";

type Session = { userId: string; role: string; periodId: string };

export async function getEventReport(eventId: string, session: Session) {
  const event = await prisma.evaluationEvent.findUnique({
    where: { id: eventId },
    include: {
      period: true,
      proker: true,
      indicators: { include: { indicator: true } },
    },
  });

  if (!event) throw new Error("Event tidak ditemukan");

  const requester = await prisma.user.findUnique({ where: { id: session.userId }, include: { division: true } });
  const requesterDivisionId = requester?.divisionId ?? null;
  const requesterDivisionName = requester?.division?.name ?? null;
  const kadivScopeAll = isKadivPSDM(session.role, requesterDivisionName);

  const baseWhere = session.role === "KADIV" && !kadivScopeAll && requesterDivisionId ? { eventId, evaluatee: { divisionId: requesterDivisionId } } : { eventId };

  const [evaluations, assignmentsCount, submissionsCount, evaluatorDistinct, evaluateeDistinct] = await Promise.all([
    prisma.evaluation.findMany({
      where: { ...baseWhere, scores: { some: {} } },
      include: {
        evaluatee: { include: { division: true } },
        scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
      },
    }),
    prisma.evaluation.count({ where: baseWhere }),
    prisma.evaluation.count({ where: { ...baseWhere, scores: { some: {} } } }),
    prisma.evaluation.findMany({ where: baseWhere, select: { evaluatorId: true }, distinct: ["evaluatorId"] }),
    prisma.evaluation.findMany({ where: baseWhere, select: { evaluateeId: true }, distinct: ["evaluateeId"] }),
  ]);

  const byEvaluatee: Record<
    string,
    {
      evaluateeId: string;
      name: string;
      division: string | null;
      raterCount: number;
      overallAvg: number;
      categoryAvg: Record<string, number>;
      indicators: Array<{ id: string; name: string; category: string; avg: number }>;
      feedback: string[];
    }
  > = {};

  for (const ev of evaluations) {
    const key = ev.evaluateeId;
    if (!byEvaluatee[key]) {
      byEvaluatee[key] = {
        evaluateeId: ev.evaluateeId,
        name: ev.evaluatee.name,
        division: ev.evaluatee.division?.name ?? null,
        raterCount: 0,
        overallAvg: 0,
        categoryAvg: {},
        indicators: [],
        feedback: [],
      };
    }

    const bucket = byEvaluatee[key];
    bucket.raterCount += 1;

    const totalScore = ev.scores.reduce((acc, s) => acc + s.score, 0);
    const avgScore = ev.scores.length ? totalScore / ev.scores.length : 0;
    bucket.overallAvg += avgScore;

    for (const s of ev.scores) {
      const cat = s.indicatorSnapshot.indicator.category;
      bucket.categoryAvg[cat] = (bucket.categoryAvg[cat] ?? 0) + s.score;
    }

    for (const s of ev.scores) {
      const indId = s.indicatorSnapshot.indicatorId;
      const existing = bucket.indicators.find((i) => i.id === indId);
      if (existing) existing.avg += s.score;
      else bucket.indicators.push({ id: indId, name: s.indicatorSnapshot.indicator.name, category: s.indicatorSnapshot.indicator.category, avg: s.score });
    }

    if (ev.feedback) bucket.feedback.push(ev.feedback);
  }

  const results = Object.values(byEvaluatee).map((item) => {
    const divisor = item.raterCount || 1;
    const indicators = item.indicators.map((i) => ({ ...i, avg: i.avg / divisor }));
    const categoryAvg: Record<string, number> = {};
    for (const [cat, sum] of Object.entries(item.categoryAvg)) {
      categoryAvg[cat] = sum / divisor;
    }
    return {
      ...item,
      overallAvg: item.overallAvg / divisor,
      indicators,
      categoryAvg,
    };
  });

  return {
    event: {
      id: event.id,
      name: event.name,
      type: event.type,
      period: event.period.name,
      proker: event.proker?.name ?? null,
      startDate: event.startDate,
      endDate: event.endDate,
      indicators: event.indicators.map((i) => ({ id: i.id, name: i.indicator.name, category: i.indicator.category })),
    },
    results,
    stats: {
      totalAssignments: assignmentsCount,
      submittedCount: submissionsCount,
      evaluatorCount: evaluatorDistinct.length,
      evaluateeCount: evaluateeDistinct.length,
    },
  };
}

export async function exportEventReport(eventId: string, session: Session): Promise<string> {
  const report = await getEventReport(eventId, session);
  const lines: string[] = [];
  lines.push(`Event,"${report.event.name}",Type,${report.event.type},Period,"${report.event.period}",Proker,"${report.event.proker ?? ""}"`);
  lines.push("Evaluatee,Division,Rater Count,Overall Avg,Category,Category Avg");

  for (const r of report.results) {
    if (Object.keys(r.categoryAvg).length === 0) {
      lines.push(`"${r.name}","${r.division ?? ""}",${r.raterCount},${r.overallAvg.toFixed(2)},,,`);
    } else {
      let first = true;
      for (const [cat, val] of Object.entries(r.categoryAvg)) {
        lines.push(`"${r.name}","${r.division ?? ""}",${first ? r.raterCount : ""},${first ? r.overallAvg.toFixed(2) : ""},${cat},${val.toFixed(2)}`);
        first = false;
      }
    }
  }

  lines.push("");
  lines.push("Per Indicator");
  lines.push("Evaluatee,Division,Indicator,Category,Avg");
  for (const r of report.results) {
    for (const ind of r.indicators) {
      lines.push(`"${r.name}","${r.division ?? ""}","${ind.name}",${ind.category},${ind.avg.toFixed(2)}`);
    }
  }

  lines.push("");
  lines.push("Feedback (anonymized)");
  lines.push("Evaluatee,Division,Feedback");
  for (const r of report.results) {
    if (r.feedback.length === 0) continue;
    for (const fb of r.feedback) {
      lines.push(`"${r.name}","${r.division ?? ""}","${fb.replace(/"/g, '""')}"`);
    }
  }

  return lines.join("\r\n");
}

export async function exportEventReportXlsx(eventId: string, session: Session): Promise<Uint8Array> {
  const report = await getEventReport(eventId, session);
  return exportEventToXlsx(report);
}
