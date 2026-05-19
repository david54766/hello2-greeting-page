import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import loginPortrait from "@/assets/prima-donna-login.jpeg";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Prima Donna AI™" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back.");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-rose-soft/20 to-background">
        <Link to="/" className="font-display text-2xl">Prima Donna AI™</Link>
        <div className="mx-auto w-full max-w-xs aspect-[3/4] overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/20">
          <img src={loginPortrait} alt="Founder of Prima Donna AI™" className="size-full object-cover" loading="eager" />
        </div>
        <blockquote className="font-display text-2xl leading-tight max-w-md text-center italic">
          "Owners who treat their center like a business build empires. The rest run daycare."
        </blockquote>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="font-display text-4xl">Sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              New here? <Link to="/signup" className="text-primary underline">Apply for access</Link>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
            {loading ? "Signing in…" : "Enter Command Center"}
          </Button>
        </form>
      </div>
    </div>
  );
}
