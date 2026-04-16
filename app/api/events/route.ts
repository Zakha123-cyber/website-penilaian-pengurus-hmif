import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  evaluationEvents,
  indicatorSnapshots,
  evaluations,
  indicators,
  prokers,
} from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createEventSchema } from "@/lib/validation";
import { generateAssignmentsForEvent } from "@/lib/assignment-generator";
import { desc, eq, inArray, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId") || undefined;

  const events = await db.query.evaluationEvents.findMany({
    where: periodId ? eq(evaluationEvents.periodId, periodId) : undefined,
    orderBy: [desc(evaluationEvents.startDate)],
    with: {
      period: true,
      proker: true,
      indicators: {
        with: { indicator: true },
      },
    },
  });

  // Count evaluations per event
  const eventIds = events.map((e) => e.id);
  const counts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const rows = await db
      .select({
        eventId: evaluations.eventId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(evaluations)
      .where(inArray(evaluations.eventId, eventIds))
      .groupBy(evaluations.eventId);
    rows.forEach((r) => (counts[r.eventId] = Number(r.count)));
  }

  const eventsWithCount = events.map((e) => ({
    ...e,
    _count: { evaluations: counts[e.id] ?? 0 },
  }));

  return NextResponse.json({ events: eventsWithCount });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, type, periodId, prokerId, startDate, endDate, isOpen, indicatorIds } = parsed.data;

  // Ensure indicators exist and are active
  const foundIndicators = await db
    .select()
    .from(indicators)
    .where(inArray(indicators.id, indicatorIds));

  const activeIndicators = foundIndicators.filter((i) => i.isActive);
  if (activeIndicators.length !== indicatorIds.length) {
    return NextResponse.json({ error: "Beberapa indikator tidak ditemukan/aktif" }, { status: 400 });
  }

  if (type === "PROKER") {
    if (!prokerId) return NextResponse.json({ error: "Proker wajib diisi" }, { status: 400 });
    const [proker] = await db.select().from(prokers).where(eq(prokers.id, prokerId));
    if (!proker) return NextResponse.json({ error: "Proker tidak ditemukan" }, { status: 400 });
    if (proker.periodId !== periodId) {
      return NextResponse.json({ error: "Proker harus berasal dari periode yang sama" }, { status: 400 });
    }
  }

  try {
    const eventId = crypto.randomUUID();

    await db.insert(evaluationEvents).values({
      id: eventId,
      name,
      type,
      periodId,
      prokerId: type === "PROKER" ? prokerId ?? null : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isOpen: isOpen ?? true,
      createdAt: new Date(),
    });

    // Create indicator snapshots
    if (indicatorIds.length > 0) {
      await db.insert(indicatorSnapshots).values(
        indicatorIds.map((indicatorId) => ({
          id: crypto.randomUUID(),
          indicatorId,
          eventId,
        }))
      );
    }

    const eventRow = { id: eventId, type, periodId, prokerId: type === "PROKER" ? prokerId ?? null : null };
    const assignmentCount = await generateAssignmentsForEvent(eventRow);
    console.log(`[Events API] Event "${name}" created with ${assignmentCount} assignments`);

    const event = await db.query.evaluationEvents.findFirst({
      where: eq(evaluationEvents.id, eventId),
      with: {
        indicators: { with: { indicator: true } },
        period: true,
        proker: true,
      },
    });

    return NextResponse.json({
      event: { ...event, _count: { evaluations: 0 } },
    }, { status: 201 });
  } catch (err) {
    console.error("[Events API] Failed to create event:", err);
    const message = err instanceof Error ? err.message : "Gagal membuat event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
