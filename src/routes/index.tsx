import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import ravenPortrait from "@/assets/raven.jpeg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prima Donna AI™ — Executive Coaching for Childcare Leaders" },
      { name: "description", content: "Premium AI executive coaching built for childcare center owners. CEO-grade strategic intelligence on demand." },
    ],
  }),
  component: Landing,
});

const tiers = [
  {
    name: "Essentials",
    price: 97,
    tagline: "Your strategist on call.",
    features: ["Unlimited AI coaching across 5 strategic modes", "Business memory that personalizes every response", "Daily strategic recommendation"],
    cta: "Start with Essentials",
  },
  {
    name: "Pro",
    price: 197,
    tagline: "Strategy plus the systems to execute it.",
    features: ["Everything in Essentials", "Template Vault: hiring, enrollment, operations", "Downloadable resource library"],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Elite Circle",
    price: 497,
    tagline: "By invitation. The inner room.",
    features: ["Everything in Pro", "Live coaching sessions", "Vault content reserved for the Circle", "Priority response styling"],
    cta: "Apply for Elite",
  },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      {/* Hero */}
      <section className="relative px-6 py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-soft/20 via-background to-background" />
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-10 w-56 md:w-64 aspect-[3/4] overflow-hidden rounded-2xl border-2 border-primary/30 shadow-xl ring-1 ring-primary/20">
            <img
              src={ravenPortrait}
              alt="Founder of Prima Donna AI™"
              className="size-full object-contain bg-rose-soft/20"
              loading="eager"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            For childcare center owners
          </div>
          <h1 className="mt-8 font-display text-5xl md:text-7xl leading-[1.05] tracking-tight">
            Your <em className="text-primary">executive strategist</em>,<br />
            available the moment you need her.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Prima Donna AI™ is not a chatbot. It is a structured intelligence system built
            for owners who run childcare like a business — and want to grow it like one.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8 h-12 text-base">
              <Link to="/signup">Take command <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full px-8 h-12 text-base">
              <a href="#pricing">See the tiers</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="gold-divider mx-auto max-w-3xl" />

      {/* Modes */}
      <section id="how" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Five strategic modes</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">One platform. Five sides of your business.</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              ["CEO", "Vision, leadership, decisions."],
              ["Revenue", "Pricing, enrollment, retention."],
              ["Marketing", "Brand, funnels, conversion."],
              ["Compliance", "Licensing, ratios, policy."],
              ["Systems", "SOPs, hiring, operations."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 transition">
                <div className="font-display text-2xl text-primary">{t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Membership</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">Three rooms. Choose yours.</h2>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`relative rounded-2xl border bg-card p-8 flex flex-col ${
                  t.featured ? "border-primary shadow-xl scale-[1.02]" : "border-border/60"
                }`}
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground uppercase tracking-wider">
                    Most chosen
                  </div>
                )}
                <h3 className="font-display text-3xl">{t.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground italic">{t.tagline}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl">${t.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="size-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8 rounded-full" variant={t.featured ? "default" : "outline"}>
                  <Link to="/signup">{t.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-6 py-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-display text-lg text-foreground">Prima Donna AI™</div>
          <div>© {new Date().getFullYear()} — Strategy for women who run rooms full of futures.</div>
        </div>
      </footer>
    </div>
  );
}
