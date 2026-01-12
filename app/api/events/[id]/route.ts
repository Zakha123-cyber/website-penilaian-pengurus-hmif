import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { updateEventSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.evaluationEvent.findUnique({
    where: { id: params.id },
    include: { indicators: { include: { indicator: true } }, period: true, proker: true, _count: { select: { evaluations: true } } },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const hasEvaluations = await prisma.evaluation.count({ where: { eventId: params.id } });
  if (hasEvaluations > 0) {
    return NextResponse.json({ error: "Event sudah memiliki penilaian, tidak bisa diubah" }, { status: 400 });
  }

  const event = await prisma.evaluationEvent.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hasEvaluations = await prisma.evaluation.count({ where: { eventId: params.id } });
  if (hasEvaluations > 0) {
    return NextResponse.json({ error: "Event sudah memiliki penilaian, tidak bisa dihapus" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.indicatorSnapshot.deleteMany({ where: { eventId: params.id } });
    await tx.evaluationEvent.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
