import { Fragment, type ReactNode } from "react";
import type { Slide } from "@/lib/slides.functions";

function inline(text: string, slides: Slide[], onCite: (id: string) => void, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[S:([0-9a-f]{8})\]|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const s = slides.find((x) => x.id.startsWith(m![1]!));
      const n = s ? slides.indexOf(s) : -1;
      out.push(
        s ? (
          <button
            key={`${key}-${i++}`}
            onClick={() => onCite(s.id)}
            title={s.title}
            className="mx-0.5 inline-flex -translate-y-0.5 items-center rounded-sm bg-highlight px-1.5 text-[11px] font-bold text-foreground hover:bg-primary hover:text-primary-foreground"
          >
            {s.theme} · {n + 1}
          </button>
        ) : null,
      );
    } else if (m[2]) {
      out.push(<strong key={`${key}-${i++}`}>{m[2]}</strong>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function AnswerText({
  text,
  slides,
  onCite,
}: {
  text: string;
  slides: Slide[];
  onCite: (id: string) => void;
}) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${k}`}>
          {list.map((l, j) => (
            <li key={j}>{inline(l, slides, onCite, `li-${k}-${j}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  text.split("\n").forEach((raw, k) => {
    const line = raw.trim();
    if (/^[-*•]\s+/.test(line)) list.push(line.replace(/^[-*•]\s+/, ""));
    else {
      flush(k);
      if (line) blocks.push(<p key={`p-${k}`}>{inline(line.replace(/^#+\s*/, ""), slides, onCite, `p-${k}`)}</p>);
    }
  });
  flush(-1);
  return <div className="answer-prose">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}

export function citedIds(text: string, slides: Slide[]) {
  const ids = new Set<string>();
  for (const m of text.matchAll(/\[S:([0-9a-f]{8})\]/g)) {
    const s = slides.find((x) => x.id.startsWith(m[1]!));
    if (s) ids.add(s.id);
  }
  return [...ids];
}
