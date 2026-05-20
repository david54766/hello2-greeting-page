import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getEliteUpdates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [threads, replies, bookings] = await Promise.all([
      supabase.from("elite_threads").select("updated_at, created_at").order("updated_at", { ascending: false }).limit(1),
      supabase.from("elite_thread_replies").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("raven_bookings").select("updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1),
    ]);

    const maxTs = (arr: Array<string | null | undefined>) =>
      arr.filter(Boolean).sort().slice(-1)[0] ?? null;

    const conversationsLatest = maxTs([
      threads.data?.[0]?.updated_at,
      threads.data?.[0]?.created_at,
      replies.data?.[0]?.created_at,
    ]);
    const scheduleLatest = maxTs([bookings.data?.[0]?.updated_at]);

    return { conversationsLatest, scheduleLatest };
  });
