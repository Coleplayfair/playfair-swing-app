import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const searchBuddyProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => d)
  .handler(async ({ data, context }) => {
    const q = (data.q || "").trim();
    if (q.length < 2) return { profiles: [] };
    const { supabase, userId } = context;
    const like = `%${q}%`;
    const res = await supabase
      .from("profiles")
      .select("id,first_name,last_name,suburb,handicap,avatar_url")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .neq("id", userId)
      .limit(25);
    return { profiles: res.data || [] };
  });

export const listBuddies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const b = await supabase
      .from("buddies")
      .select("*")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    const rows = b.data || [];
    const otherIds = Array.from(new Set(rows.map((r: any) => (r.requester_id === userId ? r.addressee_id : r.requester_id))));
    let profs: Record<string, any> = {};
    if (otherIds.length) {
      const pr = await supabase.from("profiles").select("id,first_name,last_name,suburb,handicap,avatar_url").in("id", otherIds);
      for (const p of pr.data || []) profs[p.id] = p;
    }
    return {
      accepted: rows.filter((r: any) => r.status === "accepted").map((r: any) => {
        const oid = r.requester_id === userId ? r.addressee_id : r.requester_id;
        return { id: r.id, profile: profs[oid], since: r.accepted_at };
      }),
      pendingIncoming: rows.filter((r: any) => r.status === "pending" && r.addressee_id === userId).map((r: any) => ({
        id: r.id, profile: profs[r.requester_id],
      })),
      pendingOutgoing: rows.filter((r: any) => r.status === "pending" && r.requester_id === userId).map((r: any) => ({
        id: r.id, profile: profs[r.addressee_id],
      })),
    };
  });

export const sendBuddyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { addresseeId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.addresseeId === userId) throw new Error("Cannot buddy yourself");
    const ins = await supabase.from("buddies").upsert(
      { requester_id: userId, addressee_id: data.addresseeId, status: "pending" },
      { onConflict: "requester_id,addressee_id", ignoreDuplicates: true },
    );
    if (ins.error) throw ins.error;
    return { ok: true };
  });

export const respondBuddyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { buddyId: string; accept: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.accept) {
      const u = await supabase.from("buddies").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", data.buddyId);
      if (u.error) throw u.error;
    } else {
      await supabase.from("buddies").delete().eq("id", data.buddyId);
    }
    return { ok: true };
  });
