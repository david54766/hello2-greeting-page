import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const blockEliteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ blocked_user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.blocked_user_id === userId) return { ok: false, message: "You cannot block yourself." };
    const { error } = await supabase
      .from("elite_blocks")
      .upsert(
        { blocker_id: userId, blocked_id: data.blocked_user_id },
        { onConflict: "blocker_id,blocked_id" },
      );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

export const unblockEliteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ blocked_user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("elite_blocks")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", data.blocked_user_id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

export const listEliteBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("elite_blocks")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((row) => row.blocked_id);
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Member"]));
    }
    return {
      blocks: (data ?? []).map((row) => ({
        id: row.id,
        blocked_user_id: row.blocked_id,
        blocked_user_name: names[row.blocked_id] ?? "Member",
        created_at: row.created_at,
      })),
    };
  });

export const reportEliteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        content_type: z.enum(["thread", "reply"]),
        content_id: z.string().uuid(),
        reason: z.string().min(1).max(200),
        details: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let reportedUserId: string | null = null;
    if (data.content_type === "thread") {
      const { data: row } = await supabase
        .from("elite_threads")
        .select("user_id")
        .eq("id", data.content_id)
        .maybeSingle();
      reportedUserId = row?.user_id ?? null;
    } else {
      const { data: row } = await supabase
        .from("elite_thread_replies")
        .select("user_id")
        .eq("id", data.content_id)
        .maybeSingle();
      reportedUserId = row?.user_id ?? null;
    }

    const { data: inserted, error } = await supabase
      .from("elite_content_reports")
      .insert({
        reporter_id: userId,
        content_type: data.content_type,
        content_id: data.content_id,
        reported_user_id: reportedUserId,
        reason: data.reason,
        details: data.details ?? null,
        platform: "web",
      })
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    return { ok: true, id: inserted?.id ?? null };
  });
