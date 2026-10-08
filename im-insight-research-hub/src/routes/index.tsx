import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/hub/SiteHeader";
import { SlideCard } from "@/components/hub/SlideCard";
import { AnswerText, citedIds } from "@/components/hub/AnswerText";
import { InsightSlide, splitStats } from "@/components/hub/InsightSlide";
import { CopyButton } from "@/components/hub/CopyButton";
import { slidesQuery } from "@/lib/slides.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Research Hub — Ask anything about our weekly research" },
      { name: "description", content: "Search every weekly research slide and get an instant summary with sources." },
      { property: "og:title", content: "Research Hub — Ask anything about our weekly research" },
      { property: "og:description", content: "Search every weekly research slide and get an instant summary with sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(slidesQuery),
  errorComponent: () => <div className="p-10 text-center">Couldn't load the research library.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found.</div>,
  component: Index,
});

const SUGGESTIONS = ["Give me the latest on travel", "What do we know about coffee drinking?", "Gardening trends this year"];

function Index() {
  const { data: slides } = useSuspenseQuery(slidesQuery);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [asked, setAsked] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const themes = useMemo(() => {
    const counts = new Map<string, number>();
    slides.forEach((s) => counts.set(s.theme, (counts.get(s.theme) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [slides]);

  const sources = useMemo(() => citedIds(answer, slides), [answer, slides]);
  const visible = theme ? slides.filter((s) => s.theme === theme) : slides;

  const ask = async (question: string) => {
    if (!question.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAsked(question);
    setAnswer("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setAnswer(text);
      }
      if (!text.trim()) setAnswer("Sorry — I couldn't get an answer right now. Please try again in a moment.");
    } catch (e: any) {
      if (e?.name !== "AbortError") setAnswer("Sorry — something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goTo = (id: string) => {
    setTheme(null);
    setHighlight(id);
    requestAnimationFrame(() =>
      document.getElementById(`slide-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6">
        <section className="py-14 md:py-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {slides.length} slides · {themes.length} themes
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] md:text-4xl">
            What does our research say about…
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="mt-8 flex max-w-3xl items-center gap-2 rounded-lg border-2 border-foreground bg-card p-2 focus-within:border-primary"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. give me the latest on travel"
              className="flex-1 bg-transparent px-3 py-3 text-lg outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={loading || !q.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Ask
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQ(s);
                  ask(s);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          {(asked || loading) && (() => {
            const { body, stats, title } = splitStats(answer);
            const m = body.match(/\n?[#*\s]*How Immediate can help advertisers[*:\s]*\n?/i);
            const main = m ? body.slice(0, m.index) : body;
            const help = m ? body.slice((m.index ?? 0) + m[0].length).trim() : "";
            return (
              <>
                <div className="mt-10 max-w-3xl rounded-lg bg-ink p-6 text-ink-foreground md:p-8">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
                    <Sparkles className="h-4 w-4" /> {asked}
                    {!loading && main && <CopyButton text={main} />}
                  </div>
                  {main ? (
                    <AnswerText text={main} slides={slides} onCite={goTo} />
                  ) : (
                    <p className="flex items-center gap-2 opacity-70">
                      <Loader2 className="h-4 w-4 animate-spin" /> Reading through the slides…
                    </p>
                  )}
                  {!loading && sources.length > 0 && (
                    <p className="mt-4 border-t border-ink-foreground/20 pt-4 text-xs opacity-70">
                      Based on {sources.length} slide{sources.length > 1 ? "s" : ""} — click a tag to jump to it.
                    </p>
                  )}
                </div>
                {!loading && main && <InsightSlide topic={title || "Key Insights"} stats={stats} />}
                {help && (
                  <div className="mt-4 max-w-3xl rounded-lg bg-ink p-6 text-ink-foreground md:p-8">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
                      <Sparkles className="h-4 w-4" /> How Immediate can help
                      {!loading && <CopyButton text={help} />}
                    </div>
                    <AnswerText text={help} slides={slides} onCite={goTo} />
                  </div>
                )}
              </>
            );
          })()}
        </section>

        <section className="pb-20">
          <div className="mb-6 flex flex-wrap items-center gap-2 border-t border-border pt-8">
            <h2 className="mr-4 text-2xl font-semibold">Library</h2>
            <button
              onClick={() => setTheme(null)}
              className={`rounded-sm px-3 py-1 text-sm font-semibold ${!theme ? "bg-foreground text-background" : "bg-secondary"}`}
            >
              All
            </button>
            {themes.map(([t, n]) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-sm px-3 py-1 text-sm font-semibold ${theme === t ? "bg-foreground text-background" : "bg-secondary"}`}
              >
                {t} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              No slides yet. Use “Add this week's slide” to upload the first one.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((s) => (
                <SlideCard key={s.id} slide={s} highlighted={highlight === s.id} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
