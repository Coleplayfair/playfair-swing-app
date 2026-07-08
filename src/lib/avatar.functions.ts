import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Turn a storage path into a long-lived signed URL and persist on the profile.
export const setAvatarFromPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Path must be under your user folder");
    // 10 years — the file is per-user and overwritten on re-upload.
    const signed = await supabase.storage.from("avatars").createSignedUrl(data.path, 60 * 60 * 24 * 365 * 10);
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Could not sign URL");
    const upd = await supabase.from("profiles").update({ avatar_url: signed.data.signedUrl }).eq("id", userId);
    if (upd.error) throw upd.error;
    return { url: signed.data.signedUrl };
  });
