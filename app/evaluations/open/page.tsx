import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { evaluations, evaluationScores, evaluationEvents } from "@/lib/schema";
import { eq, and, lte, gte, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { CalendarCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpenEventsPage() {
    const session = await getSession();
    if (!session) redirect("/");

    const now = new Date();

    // Fetch open events where this user has at least one evaluation assignment
    const openEvents = await db.query.evaluationEvents.findMany({
        where: and(
            eq(evaluationEvents.isOpen, 1),
            lte(evaluationEvents.startDate, now),
            gte(evaluationEvents.endDate, now)
        ),
        orderBy: [asc(evaluationEvents.startDate)],
        with: {
            period: { columns: { name: true } },
            proker: { columns: { name: true } },
            indicators: { columns: { id: true } },
            evaluations: {
                where: eq(evaluations.evaluatorId, session.userId),
                columns: { id: true },
                with: { scores: { columns: { id: true } } },
            },
        },
    });

    // Filter to only events where this user has assignments
    const filteredEvents = openEvents.filter((ev) => ev.evaluations.length > 0);

    function formatDate(d: Date) {
        return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
    }

    function daysLeft(end: Date) {
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    }

    return (
        <div className="space-y-5">
            {/* Page title */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-[#1a5632]" />
                    <h2 className="text-lg font-bold text-slate-900">Event Dibuka</h2>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {filteredEvents.length} event aktif
                </span>
            </div>

            {filteredEvents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {filteredEvents.map((ev) => {
                        const total = ev.evaluations.length;
                        const done = ev.evaluations.filter((e) => e.scores.length > 0).length;
                        const pending = total - done;
                        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                        const allDone = pending === 0 && total > 0;
                        const remaining = daysLeft(new Date(ev.endDate));

                        return (
                            <Link
                                key={ev.id}
                                href={`/evaluations/${ev.id}`}
                                className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
                            >
                                {/* Left accent bar */}
                                <div className={`h-1 w-full ${allDone ? "bg-emerald-400" : "bg-[#1a5632]"}`} />

                                <div className="flex-1 p-5">
                                    {/* Title + badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-sm font-bold text-slate-900 group-hover:text-[#1a5632] transition-colors leading-snug">
                                            {ev.name}
                                        </div>
                                        {allDone ? (
                                            <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                <CheckCircle2 className="h-3 w-3" /> Selesai
                                            </span>
                                        ) : (
                                            <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                                <Clock className="h-3 w-3" /> {pending} sisa
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta info */}
                                    <div className="mt-2 space-y-1">
                                        <div className="text-xs text-slate-500">
                                            <span className="font-medium text-slate-600">{ev.type}</span>
                                            {" · "}{ev.period.name}
                                            {ev.proker && ` · ${ev.proker.name}`}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span>{formatDate(new Date(ev.startDate))} – {formatDate(new Date(ev.endDate))}</span>
                                            {remaining <= 3 && (
                                                <span className="font-semibold text-red-600">
                                                    ⚠ {remaining}h lagi
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {ev.indicators.length} indikator · {total} tugas
                                        </div>
                                    </div>
                                </div>

                                {/* Progress footer */}
                                {total > 0 && (
                                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                            <span>{done}/{total} selesai</span>
                                            <span className="flex items-center gap-1 font-medium text-slate-600">
                                                Buka <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-400" : "bg-[#1a5632]"}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="font-medium text-slate-500">Tidak ada event yang sedang dibuka</p>
                    <p className="text-sm text-slate-400 mt-1">Event akan tampil di sini saat admin membuka penilaian.</p>
                </div>
            )}
        </div>
    );
}
