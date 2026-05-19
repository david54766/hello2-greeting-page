// Server-only Resend mailer + branded email templates.
// Never import from client code.

export const APP_URL = "https://app.thepreschoolprimadonna.com";

function from() {
  return process.env.EMAIL_FROM || "Prima Donna AI <noreply@thepreschoolprimadonna.com>";
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[mailer] RESEND_API_KEY missing");
    return { ok: false, error: "Email service not configured" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from(),
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.reply_to,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[mailer] Resend error", res.status, body);
    return { ok: false, error: `Email delivery failed (${res.status})` };
  }
  return { ok: true };
}

function shell(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#faf7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2a1a1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #f0e3e7;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:32px 40px 8px 40px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.5px;color:#9b1c3d;">Prima Donna AI™</div>
        </td></tr>
        <tr><td style="padding:8px 40px 32px 40px;font-size:15px;line-height:1.65;">${inner}</td></tr>
        <tr><td style="padding:20px 40px 32px 40px;border-top:1px solid #f3e6ea;color:#8a6b73;font-size:12px;">
          Sent from <a href="${APP_URL}" style="color:#9b1c3d;text-decoration:none;">app.thepreschoolprimadonna.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#9b1c3d;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;">${label}</a></p>
  <p style="font-size:12px;color:#8a6b73;word-break:break-all;">Or paste this link into your browser:<br>${href}</p>`;
}

export const Templates = {
  invite(args: { name: string; link: string }) {
    return {
      subject: "Your seat in the Elite Circle is ready",
      html: shell(
        `<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px 0;">Welcome, ${escapeHtml(args.name)}.</h1>
         <p>Your application has been approved. You've been granted a seat at the Elite Circle table.</p>
         <p>Click below to finalize your account and unlock live coaching, the Elite Vault, and 1:1 strategy access.</p>
         ${button(args.link, "Activate my membership")}
         <p style="color:#8a6b73;font-size:13px;">This invitation link expires in 24 hours. If you didn't apply, you can ignore this email.</p>`,
      ),
      text: `Welcome, ${args.name}. Your Elite Circle application was approved. Activate your membership: ${args.link}`,
    };
  },
  recovery(args: { link: string; isAdmin: boolean }) {
    return {
      subject: args.isAdmin ? "Reset your super admin password" : "Reset your Prima Donna AI password",
      html: shell(
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px 0;">Password reset requested</h1>
         <p>We received a request to reset the password for ${args.isAdmin ? "your super admin account" : "your account"}. Use the button below to choose a new one.</p>
         ${button(args.link, "Set a new password")}
         <p style="color:#8a6b73;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore the email.</p>`,
      ),
      text: `Reset your Prima Donna AI password: ${args.link}`,
    };
  },
  decisionApproved(args: { name: string; businessName: string }) {
    return {
      subject: "You're in — Welcome to the Prima Donna AI Elite Circle",
      html: shell(
        `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px 0;">Congratulations, ${escapeHtml(args.name)}.</h1>
         <p>Your application for the Elite Circle has been approved. We're thrilled to welcome ${escapeHtml(args.businessName)} into the room.</p>
         <p>Watch your inbox — a separate invitation email with your activation link is on its way.</p>
         ${button(`${APP_URL}/dashboard`, "Go to dashboard")}`,
      ),
      text: `Your Elite Circle application is approved. Activation link to follow.`,
    };
  },
  decisionDeclined(args: { name: string; adminNotes?: string }) {
    return {
      subject: "An update on your Elite Circle application",
      html: shell(
        `<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px 0;">Hi ${escapeHtml(args.name)},</h1>
         <p>Thank you for applying to the Elite Circle. After review, we're not able to offer membership at this time.</p>
         ${args.adminNotes ? `<p style="background:#fbf3f5;border-left:3px solid #9b1c3d;padding:12px 14px;border-radius:6px;">${escapeHtml(args.adminNotes)}</p>` : ""}
         <p>You're welcome to keep building inside Essentials or Pro and reapply when your goals evolve.</p>
         ${button(`${APP_URL}/signup`, "Continue with Essentials or Pro")}`,
      ),
      text: `Update on your Elite Circle application.`,
    };
  },
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
