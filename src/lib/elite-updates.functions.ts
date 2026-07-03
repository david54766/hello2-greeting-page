import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getEliteUpdates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [threads, replies] = await Promise.all([
      supabase.from("elite_threads").select("updated_at, created_at").order("updated_at", { ascending: false }).limit(1),
      supabase.from("elite_thread_replies").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);

    const maxTs = (arr: Array<string | null | undefined>) =>
      arr.filter(Boolean).sort().slice(-1)[0] ?? null;

    const conversationsLatest = maxTs([
      threads.data?.[0]?.updated_at,
      threads.data?.[0]?.created_at,
      replies.data?.[0]?.created_at,
    ]);

    return { conversationsLatest };
  });
