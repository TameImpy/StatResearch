import { createFileRoute } from "@tanstack/react-router";
import { streamText, Output } from "ai";
import { z } from "zod/v4";
import { unzipSync, strFromU8 } from "fflate";

const MAX = 20 * 1024 * 1024;

function pptxText(bytes: Uint8Array) {
  const files = unzipSync(bytes, { filter: (f) => /^ppt\/(slides|notesSlides)\/\w+\.xml$/.test(f.name) });
  return Object.keys(files)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => {
      const xml = strFromU8(files[name]!);
      const parts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
      return parts.join(" ");
    })
    .join("\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getUploaderContext, canUpload } = await import("@/lib/uploaders.server");
        const { user, status, supabaseAdmin } = await getUploaderContext();
        if (!user || !canUpload(status)) return json({ error: "You don't have upload access." }, 403);

        const form = await request.formData();
        const file = form.get("file");
        const weekOf = String(form.get("week_of") ?? "");
        const themeHint = String(form.get("theme") ?? "").trim();
        if (!(file instanceof File)) return json({ error: "Please choose a file." }, 400);
        if (file.size === 0 || file.size > MAX) return json({ error: "File must be under 20MB." }, 400);
        const lower = file.name.toLowerCase();
        const isPdf = lower.endsWith(".pdf");
        const isPptx = lower.endsWith(".pptx");
        if (!isPdf && !isPptx) return json({ error: "Please upload a PDF or PowerPoint (.pptx) file." }, 400);

        const bytes = new Uint8Array(await file.arrayBuffer());
        let extracted = "";
        if (isPptx) {
          try {
            extracted = pptxText(bytes).slice(0, 60000);
          } catch {
            return json({ error: "Couldn't read that PowerPoint file." }, 400);
          }
        }

        const { createGateway, reasoningOptions } = await import("@/lib/ai.server");
        const { model } = createGateway(request);
        const schema = z.object({
          title: z.string(),
          theme: z.string(),
          summary: z.string(),
          key_points: z.array(z.string()),
          content_text: z.string(),
        });
        const instructions =
          "You catalogue weekly consumer research slides. Read the slide and return: a short title; a broad theme in 1-3 words (e.g. Travel, Coffee, Gardening); a 2-3 sentence summary of the findings; 3-6 key points that keep exact numbers; and content_text, a faithful plain-text transcription of all data on the slide. Never invent numbers.";
        const content: any[] = [
          {
            type: "text",
            text: `File name: ${file.name}${themeHint ? `\nTheme suggested by uploader: ${themeHint}` : ""}${extracted ? `\n\nSlide text:\n${extracted}` : ""}`,
          },
        ];
        if (isPdf) content.push({ type: "file", filename: file.name, data: toBase64(bytes), mediaType: "application/pdf" });

        let meta: z.infer<typeof schema>;
        try {
          const result = streamText({
            model,
            instructions,
            messages: [{ role: "user", content }],
            output: Output.object({ schema }),
            providerOptions: reasoningOptions as any,
          });
          meta = (await result.output) as z.infer<typeof schema>;
        } catch (e: any) {
          const code = e?.statusCode ?? e?.status;
          if (code === 402) return json({ error: "AI credits have run out. Please top up to keep adding slides." }, 402);
          if (code === 429) return json({ error: "Too many requests right now — please try again in a minute." }, 429);
          console.error("AI extraction failed", e);
          return json({ error: "Couldn't read the slide with AI. Please try again." }, 502);
        }

        const path = `${weekOf || new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabaseAdmin.storage.from("slides").upload(path, bytes, {
          contentType: file.type || (isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
        });
        if (up.error) return json({ error: "Upload failed. Please try again." }, 500);

        const { data, error } = await supabaseAdmin
          .from("slides")
          .insert({
            title: meta.title,
            theme: themeHint || meta.theme,
            week_of: weekOf || new Date().toISOString().slice(0, 10),
            summary: meta.summary,
            key_points: meta.key_points,
            content_text: (extracted || meta.content_text).slice(0, 60000),
            file_path: path,
            file_name: file.name,
            file_type: isPdf ? "pdf" : "pptx",
            uploaded_by_name: user.displayName ?? user.email,
          })
          .select("id,title")
          .single();
        if (error) return json({ error: "Couldn't save the slide." }, 500);
        return json({ ok: true, slide: data });
      },
    },
  },
});
