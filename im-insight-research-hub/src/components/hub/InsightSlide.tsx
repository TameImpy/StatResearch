import {
  Car, Coffee, Flame, Heart, Home, Plane, ShoppingBag, Sprout, Sun, TrendingUp, Tv, Users, UtensilsCrossed, Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import logos from "@/assets/im-logos.png.asset.json";

export type Stat = { value: string; label: string; icon?: string };

const ICONS: Record<string, LucideIcon> = {
  flame: Flame, utensils: UtensilsCrossed, coffee: Coffee, plane: Plane, sprout: Sprout, home: Home,
  shopping: ShoppingBag, users: Users, heart: Heart, sun: Sun, car: Car, tv: Tv, wallet: Wallet, trending: TrendingUp,
};

/** Splits the trailing "STATS: [...]" line off the answer. */
export function splitStats(text: string): { body: string; stats: Stat[]; title: string } {
  let title = "";
  const t = text.match(/\n?\s*TITLE:\s*(.+)\s*(\n|$)/);
  if (t) {
    title = (t[1] ?? "").replace(/[*#]/g, "").trim();
    text = text.slice(0, t.index) + "\n" + text.slice((t.index ?? 0) + t[0].length);
  }
  const i = text.lastIndexOf("STATS:");
  if (i === -1) return { body: text.trimEnd(), stats: [], title };
  const body = text.slice(0, i).trimEnd();
  try {
    const parsed = JSON.parse(text.slice(i + 6).trim());
    return { body, stats: Array.isArray(parsed) ? parsed.slice(0, 5) : [], title };
  } catch {
    return { body, stats: [], title };
  }
}

export function InsightSlide({ topic, stats }: { topic: string; stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  if (!stats.length) return null;
  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.replace(/[^\w\s-]/g, "").trim() || "insight"}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 max-w-3xl">
    <div ref={ref} className="overflow-hidden rounded-lg bg-im-banner font-sans text-primary-foreground shadow-lg">
      <div className="relative flex aspect-video flex-col items-center px-6 pb-10 pt-8 md:px-10 md:pt-12">
        <h3 className="text-center text-3xl font-bold capitalize md:text-5xl">{topic}</h3>
        <div
          className="mt-6 grid w-full flex-1 items-start gap-4 pt-4 md:mt-8 md:pt-8"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((s, i) => {
            const Icon = ICONS[s.icon ?? ""] ?? TrendingUp;
            return (
              <div key={i} className="flex flex-col items-center text-center">
                <Icon className="h-8 w-8 md:h-12 md:w-12" strokeWidth={1.4} />
                <span className={`mt-2 font-extrabold leading-none ${stats.length > 3 ? "text-3xl md:text-5xl" : "text-4xl md:text-6xl"}`}>
                  {s.value}
                </span>
                <span className="mt-2 text-xs leading-tight md:text-base">{s.label}</span>
              </div>
            );
          })}
        </div>
        <p className="absolute bottom-3 left-4 text-[10px] opacity-80 md:text-xs">Source: IM Insight research</p>
        <img src={logos.url} alt="IM Insight | Immediate" className="absolute bottom-3 right-4 h-6 w-auto md:h-8" />
      </div>
    </div>
      <button
        onClick={download}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download slide
      </button>
    </div>
  );
}
