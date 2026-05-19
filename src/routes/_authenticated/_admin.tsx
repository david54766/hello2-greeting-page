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

async function forceSignOut() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  window.location.href = "/admin-login?reason=revoked";
}

async function verifyOrEject() {
  try {
    await assertAdmin();
    return true;
  } catch {
    await forceSignOut();
    return false;
  }
}

function AdminGuard() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let mounted = true;
    let roleChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const passed = await verifyOrEject();
      if (!mounted) return;
      if (!passed) return;
      setOk(true);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (uid) {
        roleChannel = supabase
          .channel(`admin-role-watch-${uid}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_roles",
              filter: `user_id=eq.${uid}`,
            },
            () => {
              void verifyOrEject();
            },
          )
          .subscribe();
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) {
        window.location.href = "/admin-login";
        return;
      }
      await verifyOrEject();
    });

    const onFocus = () => {
      void verifyOrEject();
    };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      void verifyOrEject();
    }, 60_000);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (roleChannel) supabase.removeChannel(roleChannel);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
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
