import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createDivisionSchema } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canManageRoles(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const divisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ divisions });
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
  const parsed = createDivisionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const division = await prisma.division.create({ data: parsed.data });

  return NextResponse.json({ division }, { status: 201 });
}
