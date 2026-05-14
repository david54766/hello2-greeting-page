import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) throw redirect({ to: "/login" });
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
