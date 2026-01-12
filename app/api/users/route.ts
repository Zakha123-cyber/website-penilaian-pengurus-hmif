import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      period: true,
      division: true,
    },
  });

  return NextResponse.json({ users });
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

  const user = await prisma.user.create({
    data: {
      nim,
      name,
      email,
      role,
      periodId,
      divisionId,
      passwordHash,
      isActive,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
