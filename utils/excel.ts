import * as XLSX from "xlsx";

type Report = {
  event: {
    id: string;
    name: string;
    type: string;
    period: string;
    proker: string | null;
    startDate: Date | string;
    endDate: Date | string;
    indicators: Array<{ id: string; name: string; category: string }>;
  };
  results: Array<{
    evaluateeId: string;
    name: string;
    division: string | null;
    raterCount: number;
    overallAvg: number;
    categoryAvg: Record<string, number>;
    indicators: Array<{ id: string; name: string; category: string; avg: number }>;
    feedback: string[];
  }>;
};

export function exportEventToXlsx(report: Report): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData: any[][] = [
    ["Event", report.event.name],
    ["Type", report.event.type],
    ["Period", report.event.period],
    ["Proker", report.event.proker ?? ""],
    ["Start", formatDate(report.event.startDate)],
    ["End", formatDate(report.event.endDate)],
    [],
    ["Evaluatee", "Division", "Rater Count", "Overall Avg", "Category", "Category Avg"],
  ];

  for (const r of report.results) {
    const cats = Object.entries(r.categoryAvg);
    if (cats.length === 0) {
      summaryData.push([r.name, r.division ?? "", r.raterCount, fix2(r.overallAvg), "", ""]);
    } else {
      let first = true;
      for (const [cat, val] of cats) {
        summaryData.push([r.name, r.division ?? "", first ? r.raterCount : "", first ? fix2(r.overallAvg) : "", cat, fix2(val)]);
        first = false;
      }
    }
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Per-indicator sheet
  const indicatorData: any[][] = [["Evaluatee", "Division", "Indicator", "Category", "Avg"]];
  for (const r of report.results) {
    for (const ind of r.indicators) {
      indicatorData.push([r.name, r.division ?? "", ind.name, ind.category, fix2(ind.avg)]);
    }
  }
  const indicatorSheet = XLSX.utils.aoa_to_sheet(indicatorData);
  XLSX.utils.book_append_sheet(wb, indicatorSheet, "Per Indicator");

  // Feedback sheet
  const feedbackData: any[][] = [["Evaluatee", "Division", "Feedback (anon)"]];
  for (const r of report.results) {
    for (const fb of r.feedback) {
      feedbackData.push([r.name, r.division ?? "", fb]);
    }
  }
  const feedbackSheet = XLSX.utils.aoa_to_sheet(feedbackData);
  XLSX.utils.book_append_sheet(wb, feedbackSheet, "Feedback");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(out as ArrayBuffer);
}

function fix2(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
