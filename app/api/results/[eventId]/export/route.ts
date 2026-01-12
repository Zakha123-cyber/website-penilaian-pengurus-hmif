import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewResults } from "@/lib/permissions";
import { exportEventReport, exportEventReportXlsx } from "@/services/reports";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canViewResults(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "xlsx").toLowerCase();

    if (format === "csv") {
      const csv = await exportEventReport(eventId, session);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="event-${eventId}-report.csv"`,
        },
      });
    }

    const xlsx = await exportEventReportXlsx(eventId, session);
    const body = Buffer.from(xlsx);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="event-${eventId}-report.xlsx"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    const status = message.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
