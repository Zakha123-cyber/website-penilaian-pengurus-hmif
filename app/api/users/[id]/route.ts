import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { updateUserSchema } from "@/lib/validation";
import { eq } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { period: true, division: true, subdivision: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nim, name, email, role, periodId, divisionId, subdivisionId, password, isActive } = parsed.data;
  const data: Record<string, unknown> = { nim, name, email, role, periodId, divisionId: divisionId ?? null, subdivisionId: subdivisionId ?? null, isActive };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await db.update(users).set(data as any).where(eq(users.id, id));

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { period: true, division: true, subdivision: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.delete(users).where(eq(users.id, id));

  return NextResponse.json({ ok: true });
}
