import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ApplicationSchema = z.object({
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

async function isAdminUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export const submitEliteApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ApplicationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Block if user already has a pending or approved application
    const { data: existing } = await supabase
      .from("elite_applications")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        message:
          existing.status === "approved"
            ? "Your application has already been approved."
            : "You already have an application under review.",
      };
    }

    const { error } = await supabase.from("elite_applications").insert({
      user_id: userId,
      full_name: data.full_name,
      email: data.email,
      business_name: data.business_name,
      state: data.state ?? null,
      role: data.role ?? null,
      centers_count: data.centers_count ?? null,
      annual_revenue: data.annual_revenue ?? null,
      goals: data.goals,
      referral: data.referral ?? null,
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Application submitted. We'll be in touch shortly." };
  });

export const getMyEliteApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("elite_applications")
      .select("id, status, admin_notes, decided_at, created_at, full_name, business_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { application: data ?? null };
  });

export const listEliteApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    if (!(await isAdminUser(userId))) return { applications: [], error: "Forbidden" };

    const { data, error } = await supabaseAdmin
      .from("elite_applications")
      .select(
        "id, user_id, full_name, email, business_name, state, role, centers_count, annual_revenue, goals, referral, status, admin_notes, decided_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) return { applications: [], error: error.message };
    return { applications: data ?? [], error: null as string | null };
  });

export const decideEliteApplication = createServerFn({ method: "POST" })
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
    const { userId } = context;
    if (!(await isAdminUser(userId))) return { ok: false, message: "Forbidden" };

    const { data: app, error: fetchErr } = await supabaseAdmin
      .from("elite_applications")
      .select("id, user_id, full_name, email, business_name, status")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !app) return { ok: false, message: "Application not found." };
    if (app.status !== "pending") return { ok: false, message: `Application already ${app.status}.` };

    const { error: updErr } = await supabaseAdmin
      .from("elite_applications")
      .update({
        status: data.decision,
        admin_notes: data.admin_notes ?? null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updErr) return { ok: false, message: updErr.message };

    // Notify the applicant. The actual delivery channel is configurable —
    // currently logged server-side until an email provider is wired.
    await sendDecisionEmail({
      to: app.email,
      applicantName: app.full_name,
      businessName: app.business_name,
      decision: data.decision,
      adminNotes: data.admin_notes,
    });

    return {
      ok: true,
      message:
        data.decision === "approved"
          ? "Approved. Confirmation email queued."
          : "Declined. Notification email queued.",
    };
  });

// --- Email delivery (pluggable) ---------------------------------------------
// Until an email provider (Lovable Emails / Resend / Brevo) is wired, the
// decision payload is logged server-side so admins can verify the workflow.
// Replace the body of this function with the provider call when ready.
async function sendDecisionEmail(args: {
  to: string;
  applicantName: string;
  businessName: string;
  decision: "approved" | "declined";
  adminNotes?: string;
}) {
  const subject =
    args.decision === "approved"
      ? "You're in — Welcome to the Prima Donna AI Elite Circle"
      : "An update on your Elite Circle application";

  const upgradeUrl = `${process.env.APP_URL ?? "https://app.primadonna.ai"}/settings`;

  const body =
    args.decision === "approved"
      ? `Hi ${args.applicantName},\n\nCongratulations — your application for the Prima Donna AI Elite Circle has been approved.\n\nFinal step: confirm your membership and complete registration here:\n${upgradeUrl}\n\nOnce you finalize, your Elite features unlock immediately:\n• Live coaching access\n• Elite-only Vault content\n• Priority response and 1:1 strategy sessions\n\nLooking forward to having ${args.businessName} in the room.\n\n— The Circle Team`
      : `Hi ${args.applicantName},\n\nThank you for applying to the Prima Donna AI Elite Circle. After review, we are not able to offer membership at this time.\n\n${args.adminNotes ? `Notes from the review team:\n${args.adminNotes}\n\n` : ""}You're welcome to keep building inside Pro and reapply when your goals evolve.\n\n— The Circle Team`;

  // TODO: replace with Lovable Emails / Resend / Brevo provider call.
  console.log("[elite-application:email]", { to: args.to, subject, body });
  return { queued: true };
}
