import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail, Templates, APP_URL } from "./mailer.server";

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
      // 1) Create the auth user (or fetch existing) and mint an invitation link
      //    we can deliver ourselves through Resend on our own domain.
      const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: req.email,
        options: {
          redirectTo: `${APP_URL}/dashboard`,
          data: {
            full_name: req.full_name,
            intended_tier: "elite",
            elite_invited: "true",
          },
        },
      });
      if (linkErr || !link.properties?.action_link) {
        return { ok: false, message: `Invite failed: ${linkErr?.message ?? "no link"}` };
      }
      invitedUserId = link.user?.id ?? null;

      // 2) Send a branded invitation email through our domain via Resend.
      const tmpl = Templates.invite({ name: req.full_name, link: link.properties.action_link });
      const send = await sendEmail({ to: req.email, ...tmpl });
      if (!send.ok) {
        return { ok: false, message: send.error ?? "Email delivery failed" };
      }
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
