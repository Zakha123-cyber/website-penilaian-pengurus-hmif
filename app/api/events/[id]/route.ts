import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluationEvents, indicatorSnapshots, evaluations } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { updateEventSchema } from "@/lib/validation";
import { eq, sql } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await db.query.evaluationEvents.findFirst({
    where: eq(evaluationEvents.id, params.id),
    with: {
      indicators: { with: { indicator: true } },
      period: true,
      proker: true,
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [countRow] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(evaluations)
    .where(eq(evaluations.eventId, params.id));

  return NextResponse.json({ event: { ...event, _count: { evaluations: Number(countRow?.count ?? 0) } } });
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

  const [countRow] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(evaluations)
    .where(eq(evaluations.eventId, params.id));

  if (Number(countRow?.count ?? 0) > 0) {
    return NextResponse.json({ error: "Event sudah memiliki penilaian, tidak bisa diubah" }, { status: 400 });
  }

  await db.update(evaluationEvents).set(parsed.data as any).where(eq(evaluationEvents.id, params.id));

  const event = await db.query.evaluationEvents.findFirst({
    where: eq(evaluationEvents.id, params.id),
    with: { indicators: { with: { indicator: true } }, period: true, proker: true },
  });

  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [countRow] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(evaluations)
    .where(eq(evaluations.eventId, params.id));

  if (Number(countRow?.count ?? 0) > 0) {
    return NextResponse.json({ error: "Event sudah memiliki penilaian, tidak bisa dihapus" }, { status: 400 });
  }

  // Delete snapshots first (FK constraint), then event
  await db.delete(indicatorSnapshots).where(eq(indicatorSnapshots.eventId, params.id));
  await db.delete(evaluationEvents).where(eq(evaluationEvents.id, params.id));

  return NextResponse.json({ ok: true });
}
