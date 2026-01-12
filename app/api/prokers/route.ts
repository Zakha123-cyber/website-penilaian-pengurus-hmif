import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createProkerSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId") || undefined;

  const prokers = await prisma.proker.findMany({
    where: { periodId: periodId ?? undefined },
    orderBy: { name: "asc" },
    include: {
      division: true,
      period: true,
      panitia: { include: { user: true } },
    },
  });

  return NextResponse.json({ prokers });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = createProkerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const proker = await prisma.proker.create({ data: parsed.data });

  return NextResponse.json({ proker }, { status: 201 });
}
