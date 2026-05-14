import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Crown, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/elite")({
  head: () => ({ meta: [{ title: "Elite Circle — Prima Donna AI™" }] }),
  component: Elite,
});

function Elite() {
  const { tier } = useAuth();
  const isElite = tier === "elite";

  if (!isElite) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Crown className="size-10 text-elite mx-auto" />
        <h1 className="mt-6 font-display text-5xl">The Elite Circle is by invitation.</h1>
        <p className="mt-4 text-muted-foreground">
          Live coaching, vault content reserved for the Circle, priority response styling. The room where decisions are made.
        </p>
        <Button asChild className="mt-8 rounded-full"><Link to="/settings">Apply for Elite</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-elite-foreground">
        <Crown className="size-3 text-elite" /> Elite Circle
      </div>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Welcome to the room.</h1>

      <div className="gold-divider mt-8" />

      <section className="mt-10 rounded-2xl border border-elite/40 bg-gradient-to-br from-elite/10 to-transparent p-8">
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-elite-foreground" />
          <h2 className="font-display text-2xl">Live coaching</h2>
        </div>
        <p className="mt-3 text-muted-foreground">Book a 1:1 strategy session. Calendar booking opens soon.</p>
        <Button className="mt-6 rounded-full" variant="outline">Request a session</Button>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Circle Vault</h2>
        <p className="mt-2 text-muted-foreground">Curated content reserved for Elite members. New drops monthly.</p>
      </section>
    </div>
  );
}
