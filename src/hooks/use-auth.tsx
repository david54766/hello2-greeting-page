import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Tier = "essentials" | "pro" | "elite";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  tier: Tier;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<Tier>("essentials");
  const [isAdmin, setIsAdmin] = useState(false);

  const loadProfile = async (uid: string) => {
    const [subRes, roleRes] = await Promise.all([
      supabase.from("subscriptions").select("tier").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    ]);
    setTier((subRes.data?.tier as Tier) ?? "essentials");
    setIsAdmin(!!roleRes.data);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setTier("essentials");
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        tier,
        isAdmin,
        refresh: async () => {
          if (session?.user) await loadProfile(session.user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

export const TIER_RANK: Record<Tier, number> = { essentials: 0, pro: 1, elite: 2 };
export function tierAtLeast(current: Tier, needed: Tier) {
  return TIER_RANK[current] >= TIER_RANK[needed];
}
