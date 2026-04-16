import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { indicators } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { updateIndicatorSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = updateIndicatorSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await db.update(indicators).set(parsed.data).where(eq(indicators.id, params.id));
  const [indicator] = await db.select().from(indicators).where(eq(indicators.id, params.id));
  return NextResponse.json({ indicator });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(indicators).where(eq(indicators.id, params.id));
  return NextResponse.json({ ok: true });
}
