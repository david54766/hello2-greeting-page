import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: u, error } = await supabase.auth.getUser();
    if (error || !u.user) throw redirect({ to: "/login" });
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
