import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  head: () => ({ meta: [{ title: "Super Admin — Prima Donna AI™" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roles) throw redirect({ to: "/admin" });
  },
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !signIn.user) {
      setLoading(false);
      return toast.error(error?.message ?? "Sign in failed");
    }
    // Verify admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", signIn.user.id)
      .eq("role", "admin")
      .maybeSingle();
    setLoading(false);
    if (!roleRow) {
      await supabase.auth.signOut();
      return toast.error("This account does not have super admin access.");
    }
    toast.success("Welcome, Admin.");
    nav({ to: "/admin" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-foreground via-foreground/95 to-primary/40 text-background">
        <Link to="/" className="font-display text-2xl">Prima Donna AI™</Link>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-background/20 px-3 py-1 text-xs uppercase tracking-[0.25em]">
            <ShieldCheck className="size-3" /> Restricted Access
          </div>
          <blockquote className="font-display text-3xl leading-tight max-w-md">
            "The Command Room. For operators of the platform itself."
          </blockquote>
        </div>
        <p className="text-xs uppercase tracking-[0.25em] opacity-70">Super Admin Portal</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Super Admin</p>
            <h1 className="mt-2 font-display text-4xl">Authorized entry only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Members sign in at the <Link to="/login" className="text-primary underline">member portal</Link>.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Admin email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
            {loading ? "Verifying…" : "Enter Admin Console"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Access logged. Unauthorized attempts are signed out automatically.
          </p>
        </form>
      </div>
    </div>
  );
}
