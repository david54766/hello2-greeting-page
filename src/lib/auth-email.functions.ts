import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail, Templates, APP_URL } from "./mailer.server";

/**
 * Public server fn: send a branded password reset email through Resend.
 * Uses supabase.auth.admin.generateLink so the link itself works with Supabase
 * Auth, but the email body + sender are fully branded through our domain.
 * Always responds with the same message to avoid email enumeration.
 */
export const sendPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email().max(255),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const generic = { ok: true, message: "If that account exists, a reset link is on its way." };

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });
    if (error || !link.properties?.action_link) {
      // Don't reveal existence
      return generic;
    }

    // Check admin status to brand subject line appropriately
    let isAdmin = false;
    if (link.user) {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", link.user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }

    const tmpl = Templates.recovery({ link: link.properties.action_link, isAdmin });
    await sendEmail({ to: data.email, ...tmpl });
    return generic;
  });
