"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VALID_PAIRS: Record<string, string[]> = {
  BPI:      ["BPI", "KADIV", "KASUBDIV"],
  KADIV:    ["BPI", "KASUBDIV", "ANGGOTA"],
  KASUBDIV: ["KADIV", "ANGGOTA"],
  ANGGOTA:  ["BPI", "KADIV", "KASUBDIV", "ANGGOTA"],
};

const ROLE_LABELS: Record<string, string> = {
  BPI:      "BPI",
  KADIV:    "Kepala Divisi",
  KASUBDIV: "Kepala Sub Divisi",
  ANGGOTA:  "Anggota",
};

const EVALUATOR_ROLES = Object.keys(VALID_PAIRS);

type IndicatorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: {
    id?: string;
    name?: string;
    eventType?: string;
    evaluatorRole?: string;
    evaluateeRole?: string;
    isActive?: boolean;
  };
  submitLabel?: string;
};

export function IndicatorForm({ action, defaultValues, submitLabel = "Simpan" }: IndicatorFormProps) {
  const [eventType, setEventType] = useState(defaultValues?.eventType ?? "PERIODIC");
  const [evaluatorRole, setEvaluatorRole] = useState(defaultValues?.evaluatorRole ?? "ANGGOTA");

  const validEvaluatees = VALID_PAIRS[evaluatorRole] ?? [];
  const defaultEvaluatee = validEvaluatees.includes(defaultValues?.evaluateeRole ?? "")
    ? defaultValues!.evaluateeRole!
    : validEvaluatees[0] ?? "";
  const [evaluateeRole, setEvaluateeRole] = useState(defaultEvaluatee);

  const handleEvaluatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setEvaluatorRole(newRole);
    const newValid = VALID_PAIRS[newRole] ?? [];
    setEvaluateeRole(newValid[0] ?? "");
  };

  const isPeriodic = eventType === "PERIODIC";

  return (
    <form action={action} className="grid gap-3 p-4 pt-0">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <label className="text-sm font-medium text-foreground">
        Nama Indikator
        <Input name="name" defaultValue={defaultValues?.name} placeholder="Contoh: Kedisiplinan" required className="mt-1" />
      </label>

      <label className="text-sm font-medium text-foreground">
        Tipe Event
        <select
          name="eventType"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="PERIODIC">Periodik</option>
          <option value="PROKER">Proker</option>
        </select>
      </label>

      {isPeriodic && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 grid gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hierarki Penilaian</p>

          <label className="text-sm font-medium text-foreground">
            Penilai (Evaluator)
            <select
              name="evaluatorRole"
              value={evaluatorRole}
              onChange={handleEvaluatorChange}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {EVALUATOR_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-foreground">
            Yang Dinilai (Evaluatee)
            <select
              name="evaluateeRole"
              value={evaluateeRole}
              onChange={(e) => setEvaluateeRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {validEvaluatees.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>

          <p className="text-xs text-muted-foreground">
            Indikator ini muncul saat <strong>{ROLE_LABELS[evaluatorRole]}</strong> menilai <strong>{ROLE_LABELS[evaluateeRole] ?? "-"}</strong>.
          </p>
        </div>
      )}

      {!isPeriodic && (
        <p className="text-xs text-muted-foreground rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
          Indikator proker bersifat general — berlaku untuk semua pasangan penilai dalam event proker.
        </p>
      )}

      <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
        <input name="isActive" type="checkbox" defaultChecked={defaultValues?.isActive ?? true} className="h-4 w-4 rounded border-border" />
        Aktif
      </label>

      <Button type="submit" className="mt-1">{submitLabel}</Button>
    </form>
  );
}
