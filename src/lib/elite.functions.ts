import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitEliteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        topic: z.string().min(5).max(500),
        preferred_times: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("elite_requests").insert({
      user_id: userId,
      topic: data.topic,
      preferred_times: data.preferred_times ?? null,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Request submitted. The Circle team will be in touch." };
  });

export const getMyEliteRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("elite_requests")
      .select("id, topic, preferred_times, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    return { requests: data ?? [] };
  });
