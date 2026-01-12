import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewResults } from "@/lib/permissions";
import { getEventReport } from "@/services/reports";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canViewResults(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const report = await getEventReport(eventId, session);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    const status = message.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
