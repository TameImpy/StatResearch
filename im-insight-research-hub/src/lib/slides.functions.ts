import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

export type Slide = {
  id: string;
  title: string;
  theme: string;
  week_of: string;
  summary: string;
  key_points: string[];
  file_name: string;
  file_type: string;
  uploaded_by_name: string | null;
  created_at: string;
};

export const listSlides = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await sb
    .from("slides")
    .select(
      "id,title,theme,week_of,summary,key_points,file_name,file_type,uploaded_by_name,created_at",
    )
    .order("week_of", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Slide[];
});

export const slidesQuery = queryOptions({
  queryKey: ["slides"],
  queryFn: () => listSlides(),
});

export const getSlideUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("slides")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Slide not found");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("slides")
      .createSignedUrl(row.file_path, 60 * 10);
    if (error || !signed) throw new Error("Could not open file");
    return signed.signedUrl;
  });

export const getMyAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { getUploaderContext } = await import("./uploaders.server");
  const { user, status, supabaseAdmin } = await getUploaderContext();
  let pending: { user_id: string; email: string | null; display_name: string | null }[] = [];
  let ownerExists = true;
  if (user) {
    const { count } = await supabaseAdmin
      .from("uploaders")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "owner");
    ownerExists = (count ?? 0) > 0;
  }
  if (status === "owner") {
    const { data } = await supabaseAdmin
      .from("uploaders")
      .select("user_id,email,display_name")
      .eq("status", "pending");
    pending = data ?? [];
  }
  return {
    user: user ? { name: user.displayName ?? user.email ?? "You", email: user.email } : null,
    status,
    ownerExists,
    pending,
  };
});

export const requestAccess = createServerFn({ method: "POST" }).handler(async () => {
  const { getUploaderContext } = await import("./uploaders.server");
  const { user, status, supabaseAdmin } = await getUploaderContext();
  if (!user) throw new Error("Please sign in first");
  if (status !== "none") return { status };
  const { count } = await supabaseAdmin
    .from("uploaders")
    .select("user_id", { count: "exact", head: true })
    .eq("status", "owner");
  // The very first person becomes the owner; everyone after asks for approval.
  if ((count ?? 0) > 0) throw new Error("Uploading is limited to the hub owner");
  const newStatus = "owner";
  await supabaseAdmin.from("uploaders").insert({
    user_id: user.userId,
    email: user.email,
    display_name: user.displayName,
    status: newStatus,
  });
  return { status: newStatus };
});

export const decideAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().min(1), approve: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getUploaderContext } = await import("./uploaders.server");
    const { status, supabaseAdmin } = await getUploaderContext();
    if (status !== "owner") throw new Error("Only the owner can approve uploaders");
    if (data.approve) {
      await supabaseAdmin
        .from("uploaders")
        .update({ status: "approved" })
        .eq("user_id", data.userId)
        .eq("status", "pending");
    } else {
      await supabaseAdmin
        .from("uploaders")
        .delete()
        .eq("user_id", data.userId)
        .eq("status", "pending");
    }
    return { ok: true };
  });

export const accessQuery = queryOptions({
  queryKey: ["access"],
  queryFn: () => getMyAccess(),
});

export const updateSlideTheme = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), theme: z.string().trim().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getUploaderContext, canUpload } = await import("./uploaders.server");
    const { status, supabaseAdmin } = await getUploaderContext();
    if (!canUpload(status)) throw new Error("Only the hub owner can change themes");
    const { error } = await supabaseAdmin
      .from("slides")
      .update({ theme: data.theme })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
