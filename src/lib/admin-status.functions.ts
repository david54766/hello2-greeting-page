import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUPER_ADMIN_EMAIL = "david@easyfill.ai";

export const verifySuperAdminConfigured = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data: userRes, error: userErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (userErr) return { ok: false, email: SUPER_ADMIN_EMAIL, reason: "lookup_failed" as const };

    const user = userRes.users.find(
      (u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase(),
    );
    if (!user) return { ok: false, email: SUPER_ADMIN_EMAIL, reason: "no_account" as const };

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    return role
      ? { ok: true, email: SUPER_ADMIN_EMAIL, reason: null }
      : { ok: false, email: SUPER_ADMIN_EMAIL, reason: "no_role" as const };
  },
);
