import { getSessionUser } from "./auth.server";

export type UploaderStatus = "owner" | "approved" | "pending" | "none" | "signed_out";

export async function getUploaderContext() {
  const user = await getSessionUser();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!user) return { user: null, status: "signed_out" as UploaderStatus, supabaseAdmin };
  const { data } = await supabaseAdmin
    .from("uploaders")
    .select("status")
    .eq("user_id", user.userId)
    .maybeSingle();
  return {
    user,
    status: ((data?.status as UploaderStatus) ?? "none") as UploaderStatus,
    supabaseAdmin,
  };
}

export const canUpload = (s: UploaderStatus) => s === "owner";
