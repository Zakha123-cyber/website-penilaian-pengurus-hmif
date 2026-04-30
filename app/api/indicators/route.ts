import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { indicators } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createIndicatorSchema } from "@/lib/validation";
import { asc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("eventType") as "PERIODIC" | "PROKER" | null;

  const query = db.select().from(indicators).$dynamic();
  const result = await (eventType
    ? query.where(eq(indicators.eventType, eventType)).orderBy(asc(indicators.name))
    : query.orderBy(asc(indicators.name)));

  return NextResponse.json({ indicators: result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = createIndicatorSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(indicators).values({
    id,
    name: parsed.data.name,
    eventType: parsed.data.eventType,
    evaluatorRole: parsed.data.evaluatorRole ?? null,
    evaluateeRole: parsed.data.evaluateeRole ?? null,
    isActive: parsed.data.isActive ?? true,
    createdAt: new Date(),
  });

  return NextResponse.json({ indicator: { id, ...parsed.data } }, { status: 201 });
}
