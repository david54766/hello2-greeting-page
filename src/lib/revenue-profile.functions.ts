import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Snapshot = z.object({
  capacity: z.number().nullable().optional(),
  enrollment: z.number().nullable().optional(),
  waitlist: z.number().nullable().optional(),
  avg_weekly_tuition: z.number().nullable().optional(),
  tuition_range: z.string().optional(),
  collection_rate: z.number().nullable().optional(),
  past_due_ar: z.number().nullable().optional(),
});

const Model = z.object({
  tuition_structure: z.enum(["weekly", "monthly", "other"]).optional(),
  sibling_discount: z.string().optional(),
  registration_fee: z.string().optional(),
  subsidy_pct: z.number().nullable().optional(),
  ancillary: z.string().optional(),
});

const Goals = z.object({
  revenue_goal: z.string().optional(),
  raise_tuition: z.enum(["yes", "maybe", "no"]).optional(),
  staffing_constraints: z.string().optional(),
  target_margin: z.number().nullable().optional(),
});

const UpsertInput = z.object({
  scope_mode: z.enum(["portfolio", "center"]),
  active_center_id: z.string().uuid().nullable().optional(),
  snapshot: Snapshot,
  model: Model,
  goals: Goals,
  skipped: z.boolean().optional(),
});

export const getRevenueProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("revenue_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { profile: null, error: error.message };
    return { profile: data, error: null as string | null };
  });

export const upsertRevenueProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("revenue_profiles")
      .upsert(
        {
          user_id: userId,
          scope_mode: data.scope_mode,
          active_center_id: data.active_center_id ?? null,
          snapshot: data.snapshot,
          model: data.model,
          goals: data.goals,
          skipped: data.skipped ?? false,
        },
        { onConflict: "user_id" },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null as string | null };
  });

export const setRevenueScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        scope_mode: z.enum(["portfolio", "center"]),
        active_center_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("revenue_profiles")
      .update({
        scope_mode: data.scope_mode,
        active_center_id: data.active_center_id ?? null,
      })
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null as string | null };
  });

export const resetRevenueProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("revenue_profiles")
      .delete()
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null as string | null };
  });
