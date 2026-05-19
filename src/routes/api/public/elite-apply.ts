import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  business_name: z.string().trim().min(2).max(160),
  state: z.string().trim().max(60).optional(),
  role: z.string().trim().max(120).optional(),
  centers_count: z.number().int().min(1).max(500).optional(),
  annual_revenue: z.enum(["under_250k", "250k_1m", "1m_5m", "over_5m"]).optional(),
  goals: z.string().trim().min(20).max(2000),
  referral: z.string().trim().max(500).optional(),
});

export const Route = createFileRoute("/api/public/elite-apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 },
          );
        }
        const d = parsed.data;
        const { error } = await supabaseAdmin.from("elite_signup_requests").insert({
          full_name: d.full_name,
          email: d.email,
          business_name: d.business_name,
          state: d.state ?? null,
          role: d.role ?? null,
          centers_count: d.centers_count ?? null,
          annual_revenue: d.annual_revenue ?? null,
          goals: d.goals,
          referral: d.referral ?? null,
        });
        if (error) {
          return Response.json({ ok: false, message: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, message: "Application received." });
      },
    },
  },
});
