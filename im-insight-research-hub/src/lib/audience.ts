import data from "@/data/demographics.json";

type Row = { label: string; k: (number | null)[]; v: (number | null)[]; i: (number | null)[] };
const d = data as { columns: string[]; rows: Row[]; source: string };

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}m` : `${Math.round(n)}k`);

/** Compact text of brand audience facts (reach, % profile, index) for the AI prompt. */
export function audienceFacts(): string {
  const lines = d.columns.slice(1).map((col, idx) => {
    const c = idx + 1;
    const parts = d.rows.map((r) => {
      const k = r.k[c];
      if (k == null) return null;
      if (r.label === "Totals") return `reach ${fmt(k)}`;
      return `${r.label.replace(/^\[|\]$/g, "")} ${r.v[c]?.toFixed(0)}% (idx ${r.i[c]?.toFixed(0)})`;
    });
    return `${col}: ${parts.filter(Boolean).join("; ")}`;
  });
  return `Source: ${d.source}. Reach in adults 15+; idx = index vs GB adults (100 = average).\n${lines.join("\n")}`;
}
