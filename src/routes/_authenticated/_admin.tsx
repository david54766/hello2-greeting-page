import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VERIFY_KEY = "pd_admin_verified_at";
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedVerification(uid: string): boolean {
  try {
    const raw = localStorage.getItem(VERIFY_KEY);
    if (!raw) return false;
    const { uid: cachedUid, at } = JSON.parse(raw) as { uid: string; at: number };
    if (cachedUid !== uid) return false;
    return Date.now() - at < VERIFY_TTL_MS;
  } catch {
    return false;
  }
}

function setCachedVerification(uid: string) {
  try {
    localStorage.setItem(VERIFY_KEY, JSON.stringify({ uid, at: Date.now() }));
  } catch {
    // ignore
  }
}

function clearCachedVerification() {
  try {
    localStorage.removeItem(VERIFY_KEY);
  } catch {
    // ignore
  }
}

async function assertAdmin() {
  const { data: u, error } = await supabase.auth.getUser();
  if (error || !u.user) throw redirect({ to: "/admin-login" });
  if (getCachedVerification(u.user.id)) return u.user.id;
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) {
    clearCachedVerification();
    throw redirect({ to: "/dashboard" });
  }
  setCachedVerification(u.user.id);
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

    (async () => {
      try {
        await assertAdmin();
        if (mounted) setOk(true);
      } catch {
        clearCachedVerification();
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        window.location.href = "/admin-login?reason=revoked";
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        clearCachedVerification();
        window.location.href = "/admin-login";
      }
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
