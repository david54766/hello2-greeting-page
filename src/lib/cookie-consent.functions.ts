import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const COOKIE_POLICY_VERSION = "2026-05-20.v1";

const LogSchema = z.object({
  choice: z.enum(["accepted", "essential"]),
  policy_version: z.string().min(1).max(64),
  session_id: z.string().min(1).max(128).optional(),
  user_id: z.string().uuid().optional(),
  user_agent: z.string().max(512).optional(),
});

export const logCookieConsent = createServerFn({ method: "POST" })
  .inputValidator((input) => LogSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("cookie_consents").insert({
      choice: data.choice,
      policy_version: data.policy_version,
      session_id: data.session_id ?? null,
      user_id: data.user_id ?? null,
      user_agent: data.user_agent ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCookieConsents = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("cookie_consents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  },
);
