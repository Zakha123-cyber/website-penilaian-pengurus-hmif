import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, divisions, periods } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validation";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await db.query.users.findMany({
    orderBy: [asc(users.name)],
    with: {
      period: true,
      division: true,
    },
  });

  return NextResponse.json({ users: result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nim, name, email, role, periodId, divisionId, password, isActive } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    nim,
    name,
    email: email ?? null,
    role,
    periodId,
    divisionId: divisionId ?? null,
    passwordHash,
    isActive: isActive ?? true,
    createdAt: new Date(),
  });

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { period: true, division: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
