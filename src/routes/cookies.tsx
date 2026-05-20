import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Prima Donna AI™" },
      { name: "description", content: "How Prima Donna AI™ uses cookies and similar technologies." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const reset = () => {
    try {
      localStorage.removeItem("pd_cookie_consent");
      toast.success("Cookie preferences cleared. The banner will reappear.");
    } catch {}
  };
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 px-6 py-16">
        <article className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Legal</p>
          <h1 className="font-display text-5xl mt-3 mb-2">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <section className="mt-10 space-y-4 text-[15px] leading-relaxed">
            <h2 className="font-display text-2xl">What cookies we use</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Strictly necessary</strong> — authentication session, security, and remembering that you've responded to this banner. These cannot be turned off because the Service won't work without them.</li>
              <li><strong>Functional</strong> — preferences such as your selected coaching mode, scheduler view, and admin role cache (24h).</li>
              <li><strong>Analytics</strong> — aggregated usage signals so we can improve features and detect issues. No third-party advertising trackers.</li>
            </ul>

            <h2 className="font-display text-2xl">Managing your preferences</h2>
            <p>You can clear your stored consent below and the banner will reappear on your next visit. You can also block or delete cookies in your browser settings; doing so may break sign-in or other features.</p>
            <Button onClick={reset} variant="outline" className="rounded-full">Reset cookie preferences</Button>

            <h2 className="font-display text-2xl">Third parties</h2>
            <p>Some essential cookies are set by Supabase (auth/session) and Stripe (when you reach a billing surface). These are governed by their own policies.</p>

            <h2 className="font-display text-2xl">Contact</h2>
            <p><a href="mailto:privacy@thepreschoolprimadonna.com" className="text-primary">privacy@thepreschoolprimadonna.com</a></p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
