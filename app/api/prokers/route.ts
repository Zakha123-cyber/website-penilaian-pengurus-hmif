import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prokers, panitia, users } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createProkerSchema } from "@/lib/validation";
import { asc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canManageRoles(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId") || undefined;

  const result = await db.query.prokers.findMany({
    where: periodId ? eq(prokers.periodId, periodId) : undefined,
    orderBy: [asc(prokers.name)],
    with: {
      division: true,
      period: true,
      panitia: {
        with: { user: true },
      },
    },
  });

  return NextResponse.json({ prokers: result });
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

  const id = crypto.randomUUID();
  await db.insert(prokers).values({
    id,
    name: parsed.data.name,
    divisionId: parsed.data.divisionId,
    periodId: parsed.data.periodId,
    createdAt: new Date(),
  });

  const proker = await db.query.prokers.findFirst({
    where: eq(prokers.id, id),
    with: { division: true, period: true, panitia: { with: { user: true } } },
  });

  return NextResponse.json({ proker }, { status: 201 });
}
