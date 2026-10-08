import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies answer text with citation tags and markdown markers removed. */
export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const clean = text.replace(/\s*\[S:[^\]]+\]/g, "").replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "• ").trim();
    await navigator.clipboard.writeText(clean);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold normal-case tracking-normal opacity-80 hover:bg-ink-foreground/10 hover:opacity-100"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Copied" : "Copy"}
    </button>
  );
}
