import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/prima-donna-logo.png";

export function AppHeader() {
  const { user, signOut, isAdmin } = useAuth();
  const nav = useNavigate();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="The Preschool Prima Donna" className="h-12 w-auto" />
          <span className="sr-only">Prima Donna AI</span>
          <span className="font-display text-base text-primary -ml-1 self-end pb-2">AI™</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                Command Center
              </Link>
              <Link to="/coach" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                Coaching
              </Link>
              <Link to="/templates" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                Vault
              </Link>
              <Link to="/elite" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                Elite Circle
              </Link>
              {isAdmin && (
                <Link to="/admin" className="hover:text-primary transition" activeProps={{ className: "text-primary" }}>
                  Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <a href="/#pricing" className="hover:text-primary transition">Pricing</a>
              <a href="/#how" className="hover:text-primary transition">How it works</a>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground">
                Settings
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm hover:text-primary">Sign in</Link>
              <Button asChild size="sm" className="rounded-full px-5">
                <Link to="/signup">Apply now</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
