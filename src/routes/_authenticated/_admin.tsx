import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

async function assertAdmin() {
  const { data: u, error } = await supabase.auth.getUser();
  if (error || !u.user) throw redirect({ to: "/admin-login" });
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw redirect({ to: "/dashboard" });
  return u.user.id;
}

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    await assertAdmin();
  },
  component: AdminGuard,
});

function AdminGuard() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let mounted = true;
    assertAdmin()
      .then(() => mounted && setOk(true))
      .catch(() => {
        window.location.href = "/admin-login";
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) window.location.href = "/admin-login";
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Verifying admin access…
      </div>
    );
  }
  return <Outlet />;
}
