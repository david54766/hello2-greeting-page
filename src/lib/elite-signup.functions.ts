import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isAdminUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export const listEliteSignupRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdminUser(context.userId))) return { requests: [], error: "Forbidden" };
    const { data, error } = await supabaseAdmin
      .from("elite_signup_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { requests: [], error: error.message };
    return { requests: data ?? [], error: null as string | null };
  });

export const decideEliteSignupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "declined"]),
        admin_notes: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) return { ok: false, message: "Forbidden" };

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("elite_signup_requests")
      .select("id, email, full_name, business_name, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr || !req) return { ok: false, message: "Request not found." };
    if (req.status !== "pending") return { ok: false, message: `Already ${req.status}.` };

    let invitedUserId: string | null = null;

    if (data.decision === "approved") {
      // Invite the user via Supabase Auth, pre-seeded for Elite tier provisioning.
      const { data: invite, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        req.email,
        {
          data: {
            full_name: req.full_name,
            intended_tier: "elite",
            elite_invited: "true",
          },
        },
      );
      if (inviteErr) {
        return { ok: false, message: `Invite failed: ${inviteErr.message}` };
      }
      invitedUserId = invite.user?.id ?? null;
    }

    const { error: updErr } = await supabaseAdmin
      .from("elite_signup_requests")
      .update({
        status: data.decision,
        admin_notes: data.admin_notes ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        invited_user_id: invitedUserId,
      })
      .eq("id", data.id);
    if (updErr) return { ok: false, message: updErr.message };

    return {
      ok: true,
      message:
        data.decision === "approved"
          ? "Approved. Invitation email sent."
          : "Declined.",
    };
  });
