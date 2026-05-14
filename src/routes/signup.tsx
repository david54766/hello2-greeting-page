import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Apply — Prima Donna AI™" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    if (data.user) {
      // Backfill business name on profile (trigger created the row)
      await supabase.from("profiles").update({ business_name: businessName, full_name: fullName }).eq("id", data.user.id);
    }
    setLoading(false);
    toast.success("Welcome to Prima Donna AI.");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-rose-soft/20 to-background">
        <Link to="/" className="font-display text-2xl">Prima Donna AI™</Link>
        <blockquote className="font-display text-3xl leading-tight max-w-md">
          You don't need another chatbot. You need a strategist who already knows your room.
        </blockquote>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="font-display text-4xl">Apply</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Already a member? <Link to="/login" className="text-primary underline">Sign in</Link>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz">Center name</Label>
            <Input id="biz" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
            {loading ? "Creating your seat…" : "Take my seat"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Starts on Essentials. Upgrade anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
