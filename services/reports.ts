import { db } from "@/lib/db";
import { evaluationEvents, evaluations, users, evaluationScores } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { isKadivPSDM } from "@/lib/permissions";
import { exportEventToXlsx } from "@/utils/excel";

type Session = { userId: string; role: string; periodId: string };

export async function getEventReport(eventId: string, session: Session) {
  const event = await db.query.evaluationEvents.findFirst({
    where: eq(evaluationEvents.id, eventId),
    with: {
      period: true,
      proker: true,
      indicators: { with: { indicator: true } },
    },
  });

  if (!event) throw new Error("Event tidak ditemukan");

  const requester = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { division: true }
  });
  const requesterDivisionId = requester?.divisionId ?? null;
  const requesterDivisionName = requester?.division?.name ?? null;
  const kadivScopeAll = isKadivPSDM(session.role, requesterDivisionName);

  const useDivisionFilter = session.role === "KADIV" && !kadivScopeAll && requesterDivisionId;

  // Assignments Count
  let assignmentQuery = db.select({ count: sql<number>`count(*)` }).from(evaluations).$dynamic();
  if (useDivisionFilter) {
    assignmentQuery = assignmentQuery.innerJoin(users, eq(evaluations.evaluateeId, users.id)).where(and(eq(evaluations.eventId, eventId), eq(users.divisionId, requesterDivisionId!)));
  } else {
    assignmentQuery = assignmentQuery.where(eq(evaluations.eventId, eventId));
  }
  const [assignmentRow] = await assignmentQuery;
  const assignmentsCount = Number(assignmentRow?.count ?? 0);

  // Submissions Count (evaluations with scores)
  const submittedSubquery = db.select({ evaluationId: evaluationScores.evaluationId })
    .from(evaluationScores)
    .groupBy(evaluationScores.evaluationId)
    .as("submitted_evals");

  let submissionQuery = db.select({ count: sql<number>`count(*)` })
    .from(evaluations)
    .innerJoin(submittedSubquery, eq(evaluations.id, submittedSubquery.evaluationId))
    .$dynamic();

  if (useDivisionFilter) {
    submissionQuery = submissionQuery.innerJoin(users, eq(evaluations.evaluateeId, users.id)).where(and(eq(evaluations.eventId, eventId), eq(users.divisionId, requesterDivisionId!)));
  } else {
    submissionQuery = submissionQuery.where(eq(evaluations.eventId, eventId));
  }
  const [submissionRow] = await submissionQuery;
  const submissionsCount = Number(submissionRow?.count ?? 0);

  // Evaluators Count
  let evaluatorQuery = db.selectDistinct({ id: evaluations.evaluatorId }).from(evaluations).$dynamic();
  if (useDivisionFilter) {
    evaluatorQuery = evaluatorQuery.innerJoin(users, eq(evaluations.evaluateeId, users.id)).where(and(eq(evaluations.eventId, eventId), eq(users.divisionId, requesterDivisionId!)));
  } else {
    evaluatorQuery = evaluatorQuery.where(eq(evaluations.eventId, eventId));
  }
  const evaluatorDistinct = await evaluatorQuery;

  // Evaluatees Count
  let evaluateeDistinctQuery = db.selectDistinct({ id: evaluations.evaluateeId }).from(evaluations).$dynamic();
  if (useDivisionFilter) {
    evaluateeDistinctQuery = evaluateeDistinctQuery.innerJoin(users, eq(evaluations.evaluateeId, users.id)).where(and(eq(evaluations.eventId, eventId), eq(users.divisionId, requesterDivisionId!)));
  } else {
    evaluateeDistinctQuery = evaluateeDistinctQuery.where(eq(evaluations.eventId, eventId));
  }
  const evaluateeDistinct = await evaluateeDistinctQuery;

  // Detailed Evaluations
  const evaluationsData = await db.query.evaluations.findMany({
    where: eq(evaluations.eventId, eventId),
    with: {
      evaluatee: { with: { division: true } },
      scores: { with: { indicatorSnapshot: { with: { indicator: true } } } },
    },
  });

  const filteredEvaluations = evaluationsData.filter((ev: any) => {
    if (ev.scores.length === 0) return false;
    if (useDivisionFilter && ev.evaluatee.divisionId !== requesterDivisionId) return false;
    return true;
  });

  const byEvaluatee: Record<
    string,
    {
      evaluateeId: string;
      name: string;
      division: string | null;
      raterCount: number;
      overallAvg: number;
      indicators: Array<{ id: string; name: string; avg: number }>;
      feedback: string[];
    }
  > = {};

  for (const ev of filteredEvaluations) {
    const key = ev.evaluateeId;
    if (!byEvaluatee[key]) {
      byEvaluatee[key] = {
        evaluateeId: ev.evaluateeId,
        name: ev.evaluatee.name,
        division: ev.evaluatee.division?.name ?? null,
        raterCount: 0,
        overallAvg: 0,
        indicators: [],
        feedback: [],
      };
    }

    const bucket = byEvaluatee[key];
    bucket.raterCount += 1;

    const totalScore = ev.scores.reduce((acc: number, s: any) => acc + s.score, 0);
    const avgScore = ev.scores.length ? totalScore / ev.scores.length : 0;
    bucket.overallAvg += avgScore;

    for (const s of ev.scores) {
      const indId = s.indicatorSnapshot.indicatorId;
      const existing = bucket.indicators.find((i: any) => i.id === indId);
      if (existing) existing.avg += s.score;
      else bucket.indicators.push({ id: indId, name: s.indicatorSnapshot.indicator.name, avg: s.score });
    }

    if (ev.feedback) bucket.feedback.push(ev.feedback);
  }

  const results = Object.values(byEvaluatee).map((item) => {
    const divisor = item.raterCount || 1;
    const indicators = item.indicators.map((i: any) => ({ ...i, avg: i.avg / divisor }));
    return {
      ...item,
      overallAvg: item.overallAvg / divisor,
      indicators,
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
      indicators: event.indicators.map((i: any) => ({ id: i.id, name: i.indicator.name })),
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
  lines.push("Evaluatee,Division,Rater Count,Overall Avg");

  for (const r of report.results) {
    lines.push(`"${r.name}","${r.division ?? ""}",${r.raterCount},${r.overallAvg.toFixed(2)}`);
  }

  lines.push("");
  lines.push("Per Indicator");
  lines.push("Evaluatee,Division,Indicator,Avg");
  for (const r of report.results) {
    for (const ind of r.indicators) {
      lines.push(`"${r.name}","${r.division ?? ""}","${ind.name}",${ind.avg.toFixed(2)}`);
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
