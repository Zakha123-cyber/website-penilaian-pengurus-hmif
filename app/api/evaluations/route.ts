import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { submitEvaluationSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const evaluations = await prisma.evaluation.findMany({
    where: { evaluatorId: session.userId },
    include: {
      evaluatee: { include: { division: true } },
      event: { include: { indicators: { include: { indicator: true } } } },
      scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ evaluations });
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

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      event: { include: { indicators: true } },
      scores: true,
    },
  });

  if (!evaluation || evaluation.evaluatorId !== session.userId) {
    return NextResponse.json({ error: "Evaluation tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  if (!evaluation.event.isOpen || now < evaluation.event.startDate || now > evaluation.event.endDate) {
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

  const full = await prisma.evaluation.findUnique({
    where: { id: evaluation.id },
    include: {
      scores: { include: { indicatorSnapshot: { include: { indicator: true } } } },
      evaluatee: true,
      event: true,
    },
  });

  return NextResponse.json({ evaluation: full }, { status: 201 });
}
