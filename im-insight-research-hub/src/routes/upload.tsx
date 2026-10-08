import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/hub/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideAccess, getMyAccess, requestAccess } from "@/lib/slides.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Add a weekly slide — Research Hub" },
      { name: "description", content: "Upload this week's research slide to the Research Hub." },
      { property: "og:title", content: "Add a weekly slide — Research Hub" },
      { property: "og:description", content: "Upload this week's research slide to the Research Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => getMyAccess(),
  errorComponent: () => <div className="p-10 text-center">Couldn't load this page.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found.</div>,
  component: UploadPage,
});

function mondayOf(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

function UploadPage() {
  const access = Route.useLoaderData();
  const router = useRouter();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [week, setWeek] = useState(mondayOf());
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);

  const canUpload = access.status === "owner";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("week_of", week);
      fd.append("theme", theme);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success(`Added “${json.slide.title}”`);
      setFile(null);
      setTheme("");
      await qc.invalidateQueries({ queryKey: ["slides"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="text-4xl font-semibold">Add this week's slide</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a PDF or PowerPoint. AI reads it, writes a summary and files it under a theme.
        </p>

        <div className="mt-10">
          {access.status === "signed_out" && (
            <Notice>
              Uploading is limited to approved team members. Please sign in to Lovable in this browser, then
              reload this page.
            </Notice>
          )}

          {access.status !== "owner" && access.status !== "signed_out" && !access.ownerExists && (
            <Notice>
              <p className="mb-4">
                {access.ownerExists
                  ? `Hi ${access.user?.name} — you don't have upload access yet.`
                  : `Hi ${access.user?.name} — nobody manages this hub yet. Claim it to become the owner, who approves other uploaders.`}
              </p>
              <Button
                onClick={async () => {
                  const r = await requestAccess();
                  toast.success(r.status === "owner" ? "You're now the owner" : "Request sent to the owner");
                  router.invalidate();
                }}
              >
                {access.ownerExists ? "Request upload access" : "Claim as owner"}
              </Button>
            </Notice>
          )}

          {access.status !== "owner" && access.status !== "signed_out" && access.ownerExists && <Notice>Uploading is limited to the hub owner.</Notice>}

          {canUpload && (
            <form onSubmit={submit} className="space-y-6">
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                  file ? "border-primary bg-accent/40" : "border-border hover:border-foreground"
                }`}
              >
                <UploadCloud className="mb-3 h-8 w-8 text-primary" />
                <span className="font-semibold">{file ? file.name : "Choose a PDF or .pptx file"}</span>
                <span className="mt-1 text-xs text-muted-foreground">Up to 20MB</span>
                <input
                  type="file"
                  accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="week">Week of</Label>
                  <Input id="week" type="date" value={week} onChange={(e) => setWeek(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme (optional)</Label>
                  <Input
                    id="theme"
                    placeholder="AI will suggest one"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" size="lg" disabled={!file || busy} className="w-full">
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" /> Reading the slide…
                  </>
                ) : (
                  "Upload slide"
                )}
              </Button>
            </form>
          )}

          {access.status === "owner" && (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="text-xl font-semibold">Upload access requests</h2>
              {access.pending.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {access.pending.map((p) => (
                    <li key={p.user_id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <span>
                        <span className="font-semibold">{p.display_name ?? "Unnamed"}</span>{" "}
                        <span className="text-sm text-muted-foreground">{p.email}</span>
                      </span>
                      <span className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            await decideAccess({ data: { userId: p.user_id, approve: true } });
                            router.invalidate();
                          }}
                        >
                          <Check /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await decideAccess({ data: { userId: p.user_id, approve: false } });
                            router.invalidate();
                          }}
                        >
                          <X />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <p className="mt-10 text-sm">
            <Link to="/" className="text-primary hover:underline">
              ← Back to the library
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-6">{children}</div>;
}
