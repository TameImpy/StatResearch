import { useState } from "react";
import { FileText, ExternalLink, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfViewer } from "./PdfViewer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { getSlideUrl, accessQuery, updateSlideTheme, slidesQuery, type Slide } from "@/lib/slides.functions";

export function formatWeek(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Preview = { url: string; isPdf: boolean; fileName: string; title: string };

function safeName(name: string) {
  return name.replace(/[^\w\- ]+/g, "").trim() || "slide";
}

export function useOpenSlide() {
  const [opening, setOpening] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const open = async (id: string, title = "slide") => {
    setOpening(id);
    try {
      const url = await getSlideUrl({ data: { id } });
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const raw = await res.blob();
      const isPdf = raw.type.includes("pdf") || url.toLowerCase().includes(".pdf");
      const blob = isPdf ? new Blob([raw], { type: "application/pdf" }) : raw;
      setPreview({
        url: URL.createObjectURL(blob),
        isPdf,
        fileName: `${safeName(title)}.${isPdf ? "pdf" : "pptx"}`,
        title,
      });
    } catch {
      toast.error("Couldn't open that slide.");
    } finally {
      setOpening(null);
    }
  };
  const close = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  return { open, opening, preview, close };
}

function PreviewDialog({ preview, onClose }: { preview: Preview | null; onClose: () => void }) {
  return (
    <Dialog open={!!preview} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{preview?.title}</DialogTitle>
        </DialogHeader>
        {preview?.isPdf ? (
          <PdfViewer url={preview.url} />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-md border bg-muted p-6 text-center text-sm text-muted-foreground">
            PowerPoint files can't be previewed in the browser. Download it to view.
          </div>
        )}
        {preview && (
          <Button asChild className="self-end">
            <a href={preview.url} download={preview.fileName}>
              <Download /> Download
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ThemeBadge({ slide }: { slide: Slide }) {
  const qc = useQueryClient();
  const { data: access } = useQuery(accessQuery);
  const canEdit = access?.status === "owner";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slide.theme);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const theme = value.trim();
    if (!theme || theme === slide.theme) return setEditing(false);
    setSaving(true);
    try {
      await updateSlideTheme({ data: { id: slide.id, theme } });
      await qc.invalidateQueries({ queryKey: slidesQuery.queryKey });
      toast.success("Theme updated");
      setEditing(false);
    } catch {
      toast.error("Couldn't change the theme.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(slide.theme);
            setEditing(false);
          }
        }}
        className="h-7 w-40 rounded-sm border border-input bg-background px-2 text-xs font-semibold uppercase tracking-wider"
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant="secondary" className="rounded-sm font-semibold uppercase tracking-wider">
        {slide.theme}
      </Badge>
      {canEdit && (
        <button
          onClick={() => {
            setValue(slide.theme);
            setEditing(true);
          }}
          aria-label="Change theme"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

export function SlideCard({ slide, highlighted }: { slide: Slide; highlighted?: boolean }) {
  const { open, opening, preview, close } = useOpenSlide();
  return (
    <article
      id={`slide-${slide.id}`}
      className={`group flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-md ${
        highlighted ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <ThemeBadge slide={slide} />
        <span className="text-xs text-muted-foreground">Week of {formatWeek(slide.week_of)}</span>
      </div>
      <h3 className="mb-2 text-xl font-semibold leading-snug">{slide.title}</h3>
      <p className="mb-4 text-sm text-muted-foreground/80">{slide.summary}</p>
      {slide.key_points.length > 0 && (
        <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
          {slide.key_points.slice(0, 4).map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => open(slide.id, slide.title)}
        className="mt-auto inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:underline"
      >
        {opening === slide.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Preview {slide.file_type === "pdf" ? "PDF" : "PowerPoint"}
        <ExternalLink className="h-3 w-3" />
      </button>
      <PreviewDialog preview={preview} onClose={close} />
    </article>
  );
}
