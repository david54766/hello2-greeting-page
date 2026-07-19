import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EliteAccess = {
  allowed: boolean;
  reason: "elite" | "admin" | "denied";
};

export async function getEliteAccessStatus(
  supabase: any,
  userId: string,
): Promise<EliteAccess> {
  const [subRes, roleRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
  ]);

  const isAdmin = !!roleRes.data;
  const isElite =
    subRes.data?.tier === "elite" && subRes.data?.status === "active";

  if (isElite) return { allowed: true, reason: "elite" };
  if (isAdmin) return { allowed: true, reason: "admin" };
  return { allowed: false, reason: "denied" };
}

export async function requireEliteAccess(
  supabase: any,
  userId: string,
): Promise<void> {
  const access = await getEliteAccessStatus(supabase, userId);
  if (!access.allowed) throw new Error("Elite access required");
}

export const checkEliteAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EliteAccess> => {
    const { supabase, userId } = context;
    return getEliteAccessStatus(supabase, userId);
  });
