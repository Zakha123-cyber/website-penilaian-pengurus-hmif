import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createPeriodSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canManageRoles(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periods = await prisma.period.findMany({
    orderBy: { startYear: "desc" },
  });

  return NextResponse.json({ periods });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canManageRoles(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createPeriodSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, startYear, endYear, isActive } = parsed.data;

  if (isActive) {
    await prisma.period.updateMany({ data: { isActive: false } });
  }

  const period = await prisma.period.create({
    data: { name, startYear, endYear, isActive: !!isActive },
  });

  return NextResponse.json({ period }, { status: 201 });
}
