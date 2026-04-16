import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  evaluations,
  evaluationScores,
  indicatorSnapshots,
  evaluationEvents,
} from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const result = await db.query.evaluations.findMany({
    where: eq(evaluations.evaluatorId, session.userId),
    orderBy: [desc(evaluations.createdAt)],
    with: {
      evaluatee: {
        with: { division: true },
      },
      event: {
        with: {
          indicators: {
            with: { indicator: true },
          },
        },
      },
      scores: {
        with: {
          indicatorSnapshot: {
            with: { indicator: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ evaluations: result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = submitEvaluationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { evaluationId, feedback, scores } = parsed.data;

  // Fetch evaluation with its event and existing scores
  const evaluation = await db.query.evaluations.findFirst({
    where: eq(evaluations.id, evaluationId),
    with: {
      event: {
        with: { indicators: true },
      },
      scores: true,
    },
  });

  if (!evaluation || evaluation.evaluatorId !== session.userId) {
    return NextResponse.json({ error: "Evaluation tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  if (
    !evaluation.event.isOpen ||
    now < evaluation.event.startDate ||
    now > evaluation.event.endDate
  ) {
    return NextResponse.json({ error: "Event belum dibuka atau sudah ditutup" }, { status: 400 });
  }

  if (evaluation.scores.length > 0) {
    return NextResponse.json({ error: "Sudah submit, tidak bisa mengubah" }, { status: 400 });
  }

  const snapshotIds = evaluation.event.indicators.map((i) => i.id);
  const invalidSnapshot = scores.some((s) => !snapshotIds.includes(s.indicatorSnapshotId));
  if (invalidSnapshot) {
    return NextResponse.json({ error: "Indikator tidak valid untuk event ini" }, { status: 400 });
  }

  // Insert scores and update feedback
  await db.insert(evaluationScores).values(
    scores.map((s) => ({
      id: crypto.randomUUID(),
      evaluationId: evaluation.id,
      indicatorSnapshotId: s.indicatorSnapshotId,
      score: s.score,
      createdAt: new Date(),
    }))
  );

  await db
    .update(evaluations)
    .set({ feedback: feedback ?? null })
    .where(eq(evaluations.id, evaluation.id));

  const full = await db.query.evaluations.findFirst({
    where: eq(evaluations.id, evaluation.id),
    with: {
      scores: {
        with: {
          indicatorSnapshot: { with: { indicator: true } },
        },
      },
      evaluatee: true,
      event: true,
    },
  });

  return NextResponse.json({ evaluation: full }, { status: 201 });
}
