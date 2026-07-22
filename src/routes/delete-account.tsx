import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Account - Prima Donna AI" },
      {
        name: "description",
        content: "How to request deletion of your Prima Donna AI account and associated data.",
      },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 px-6 py-16">
        <article className="mx-auto max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Account privacy</p>
          <h1 className="mt-3 font-display text-5xl">Delete your account.</h1>
          <p className="mt-5 leading-7 text-muted-foreground">
            Sign in, open Settings, and select <strong>Request account deletion</strong>. We will
            permanently delete your account and associated personal, business, and coaching data
            within 30 days, except records we must retain by law.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link to="/login">Sign in to request deletion</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <a href="mailto:privacy@thepreschoolprimadonna.com">Contact privacy support</a>
            </Button>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
