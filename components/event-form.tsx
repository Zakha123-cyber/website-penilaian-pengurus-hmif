"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventFormProps = {
    action: (formData: FormData) => void | Promise<void>;
    periodsData: any[];
    prokersData: any[];
    indicatorsData: any[];
};

const eventTypes = [
    { value: "PERIODIC", label: "Periodik" },
    { value: "PROKER", label: "Proker" },
] as const;

export function EventForm({ action, periodsData, prokersData, indicatorsData }: EventFormProps) {
    const [type, setType] = useState<"PERIODIC" | "PROKER">("PERIODIC");

    const ROLE_LABELS: Record<string, string> = { BPI: "BPI", KADIV: "Kepala Divisi", KASUBDIV: "Kepala Sub Divisi", ANGGOTA: "Anggota" };
    const PAIRS = [
        { evaluatorRole: "BPI", evaluateeRole: "KADIV" },
        { evaluatorRole: "BPI", evaluateeRole: "KASUBDIV" },
        { evaluatorRole: "KADIV", evaluateeRole: "BPI" },
        { evaluatorRole: "KADIV", evaluateeRole: "KASUBDIV" },
        { evaluatorRole: "KADIV", evaluateeRole: "ANGGOTA" },
        { evaluatorRole: "KASUBDIV", evaluateeRole: "KADIV" },
        { evaluatorRole: "KASUBDIV", evaluateeRole: "ANGGOTA" },
        { evaluatorRole: "ANGGOTA", evaluateeRole: "BPI" },
        { evaluatorRole: "ANGGOTA", evaluateeRole: "KADIV" },
        { evaluatorRole: "ANGGOTA", evaluateeRole: "KASUBDIV" },
        { evaluatorRole: "ANGGOTA", evaluateeRole: "ANGGOTA" },
    ];
    const prokerIndicators = indicatorsData.filter(ind => ind.type === "PROKER");

    return (
        <form action={action} className="grid gap-3 p-4 pt-0">
            <label className="text-sm font-medium text-foreground">
                Nama
                <Input name="name" placeholder="Evaluasi Tengah Periode" required className="mt-1" />
            </label>
            <label className="text-sm font-medium text-foreground">
                Tipe
                <select
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "PERIODIC" | "PROKER")}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                    {eventTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="text-sm font-medium text-foreground">
                Periode
                <select name="periodId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                    {periodsData.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </label>
            {type === "PROKER" && (
                <label className="text-sm font-medium text-foreground">
                    Proker
                    <select name="prokerId" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                        <option value="">(Pilih Proker)</option>
                        {prokersData.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                                {pr.name} · {pr.period.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-foreground">
                    Mulai
                    <Input name="startDate" type="date" required className="mt-1" />
                </label>
                <label className="text-sm font-medium text-foreground">
                    Selesai
                    <Input name="endDate" type="date" required className="mt-1" />
                </label>
            </div>
            <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3">
                <p className="text-sm font-semibold text-foreground">Pilih indikator yang dinilai</p>

                {type === "PROKER" && prokerIndicators.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Program Kerja (PROKER)
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                            {prokerIndicators.map((ind) => (
                                <label key={ind.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                                    <input name="indicatorIds" value={ind.id} type="checkbox" className="h-4 w-4 rounded border-border" />
                                    <span>{ind.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {type === "PROKER" && prokerIndicators.length === 0 && (
                    <p className="text-xs text-muted-foreground italic pl-1">Tidak ada indikator proker.</p>
                )}

                {type === "PERIODIC" && PAIRS.map(({ evaluatorRole, evaluateeRole }) => {
                    const group = indicatorsData.filter(
                        (ind) => ind.type !== "PROKER" && ind.evaluatorRole === evaluatorRole && ind.evaluateeRole === evaluateeRole
                    );
                    return (
                        <div key={`${evaluatorRole}-${evaluateeRole}`} className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground">
                                {ROLE_LABELS[evaluatorRole]} → {ROLE_LABELS[evaluateeRole]}
                            </p>
                            {group.length === 0 && (
                                <p className="text-xs text-muted-foreground italic pl-1">Tidak ada indikator.</p>
                            )}
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {group.map((ind) => (
                                    <label key={ind.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                                        <input name="indicatorIds" value={ind.id} type="checkbox" className="h-4 w-4 rounded border-border" />
                                        <span>{ind.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
                <input name="isOpen" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                Buka segera
            </label>
            <Button type="submit" className="mt-1">
                Simpan
            </Button>
        </form>
    );
}
