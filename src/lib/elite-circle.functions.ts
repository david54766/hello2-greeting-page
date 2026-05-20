import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("elite_threads")
      .select("id, user_id, title, body, pinned, created_at, updated_at")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((data ?? []).map((t) => t.user_id)));
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Member"]));
    }

    // reply counts
    const { data: counts } = await supabase
      .from("elite_thread_replies")
      .select("thread_id");
    const tally: Record<string, number> = {};
    (counts ?? []).forEach((r: any) => { tally[r.thread_id] = (tally[r.thread_id] ?? 0) + 1; });

    return {
      threads: (data ?? []).map((t) => ({
        ...t,
        author_name: names[t.user_id] ?? "Member",
        reply_count: tally[t.id] ?? 0,
      })),
    };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(3).max(200),
      body: z.string().min(1).max(10_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("elite_threads")
      .insert({ user_id: userId, title: data.title, body: data.body })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, id: row.id };
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: thread, error } = await supabase
      .from("elite_threads")
      .select("id, user_id, title, body, pinned, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !thread) throw new Error(error?.message ?? "Not found");

    const { data: replies } = await supabase
      .from("elite_thread_replies")
      .select("id, user_id, body, created_at")
      .eq("thread_id", data.id)
      .order("created_at", { ascending: true });

    const ids = Array.from(new Set([thread.user_id, ...(replies ?? []).map((r: any) => r.user_id)]));
    const { data: profs } = await supabase
      .from("profiles").select("id, full_name").in("id", ids);
    const names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Member"]));

    return {
      thread: { ...thread, author_name: names[thread.user_id] ?? "Member" },
      replies: (replies ?? []).map((r: any) => ({ ...r, author_name: names[r.user_id] ?? "Member" })),
    };
  });

export const replyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      thread_id: z.string().uuid(),
      body: z.string().min(1).max(10_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("elite_thread_replies").insert({
      thread_id: data.thread_id,
      user_id: userId,
      body: data.body,
    });
    if (error) return { ok: false, message: error.message };
    // Bump thread updated_at
    await supabase.from("elite_threads").update({ updated_at: new Date().toISOString() }).eq("id", data.thread_id);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("elite_threads").delete().eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });
