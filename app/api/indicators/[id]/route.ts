import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { indicators } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { updateIndicatorSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = updateIndicatorSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await db.update(indicators).set({
    name: parsed.data.name,
    eventType: parsed.data.eventType,
    evaluatorRole: parsed.data.evaluatorRole ?? null,
    evaluateeRole: parsed.data.evaluateeRole ?? null,
    isActive: parsed.data.isActive,
  }).where(eq(indicators.id, id));
  const [indicator] = await db.select().from(indicators).where(eq(indicators.id, id));
  return NextResponse.json({ indicator });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.delete(indicators).where(eq(indicators.id, id));
  return NextResponse.json({ ok: true });
}
