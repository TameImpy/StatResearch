import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { audienceFacts } from "@/lib/audience";

export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { question?: string };
        const question = (body.question ?? "").trim().slice(0, 1000);
        if (!question) return new Response("Please type a question.", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: slides } = await supabaseAdmin
          .from("slides")
          .select("id,title,theme,week_of,summary,key_points,content_text")
          .order("week_of", { ascending: false })
          .limit(150);

        if (!slides?.length) {
          return new Response("There are no slides in the hub yet — once some are uploaded, I can answer questions about them.");
        }

        const library = slides
          .map(
            (s) =>
              `[S:${s.id.slice(0, 8)}] ${s.title} | Theme: ${s.theme} | Uploaded (ordering only, do not mention): ${s.week_of}\nSummary: ${s.summary}\nKey points: ${s.key_points.join("; ")}\nData: ${s.content_text.slice(0, 1500)}`,
          )
          .join("\n\n---\n\n");

        const today = new Date().toISOString().slice(0, 10);
        const { createGateway, reasoningOptions } = await import("@/lib/ai.server");
        const { model } = createGateway(request);
        try {
          const result = streamText({
            model,
            instructions: `You are the research hub assistant. Today is ${today}. Answer using ONLY the slides below, newest first. When asked for "the latest", prioritise the most recent slides. Never mention upload dates or "week of" dates in the answer — only dates that are part of the research data itself. Keep it concise: a one-line headline, then 3-6 bullet points with exact figures. Cite every fact with its slide tag exactly like [S:xxxxxxxx]. If the slides don't cover the topic, say so plainly. After the bullets, add a section headed **How Immediate can help advertisers** with 2-4 bullets explaining how Immediate Media is uniquely positioned for this theme: name the most relevant Immediate brands, choosing ONLY from this exact list and never any other brand: BBC Good Food, Radio Times, olive, MadeForMums, Gardeners' World, Top Gear, HistoryExtra, link each point to an insight above with its slide tag, and suggest practical ad or content opportunities (sponsored content, seasonal moments, recipes/guides, events). Back each brand with 1-2 real figures from the BRAND AUDIENCE data below (e.g. reach, % female, an over-indexing age group or social grade with its index), attributed as (TGI). Never invent audience sizes or figures not in the slides or BRAND AUDIENCE data. Do NOT use BRAND AUDIENCE figures in the STATS line. Skip this section if the slides don't cover the topic. Use simple markdown (bullets, **bold**) only. Finally, on its own line output TITLE: followed by a 1-3 word theme name plus the word "Insight" (e.g. TITLE: Travel Insight, TITLE: Christmas Insight, TITLE: Black Friday Insight) — never repeat the question. Then on the very last line, output STATS: followed by a JSON array of 3 to 5 headline stats for a summary slide, e.g. STATS: [{"value":"62%","label":"of IM audience host BBQs monthly","icon":"flame"}]. Use ONLY figures about the IM / Immediate audience from the slides — never UK population, nat rep or national average figures. value is short (e.g. "62%", "3.6m", "2x"); label is max 7 words; icon is one of: flame, utensils, coffee, plane, sprout, home, shopping, users, heart, sun, car, tv, wallet, trending. If there are no IM audience figures, output STATS: [].\n\nBRAND AUDIENCE (TGI):\n${audienceFacts()}\n\nSLIDES:\n${library}`,
            messages: [{ role: "user", content: question }],
            abortSignal: request.signal,
            providerOptions: reasoningOptions as any,
          });
          return result.toTextStreamResponse({ headers: { "Cache-Control": "no-store" } });
        } catch (e) {
          console.error(e);
          return new Response("Something went wrong answering that.", { status: 500 });
        }
      },
    },
  },
});
