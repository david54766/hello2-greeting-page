import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/prima-donna-logo.png";

export function AppHeader() {
  const { user, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const authedLinks = (
    <>
      <Link to="/dashboard" className="hover:text-primary transition" activeProps={{ className: "text-primary" }} onClick={close}>
        Command Center
      </Link>
      <Link to="/coach" className="hover:text-primary transition" activeProps={{ className: "text-primary" }} onClick={close}>
        Coaching
      </Link>
      <Link to="/templates" className="hover:text-primary transition" activeProps={{ className: "text-primary" }} onClick={close}>
        Vault
      </Link>
      <Link to="/elite" className="hover:text-primary transition" activeProps={{ className: "text-primary" }} onClick={close}>
        Elite Circle
      </Link>
      <Link to="/billing" className="hover:text-primary transition" activeProps={{ className: "text-primary" }} onClick={close}>
        Billing
      </Link>
      {isAdmin && (
        <Link to="/admin" className="hover:text-primary transition" activeProps={{ className: "text-primary" }} onClick={close}>
          Admin
        </Link>
      )}
    </>
  );

  const guestLinks = (
    <>
      <a href="/#pricing" className="hover:text-primary transition" onClick={close}>Pricing</a>
      <a href="/#how" className="hover:text-primary transition" onClick={close}>How it works</a>
    </>
  );

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={close}>
          <img
            src={logo}
            alt="The Preschool Prima Donna"
            width={48}
            height={48}
            className="h-10 sm:h-14 md:h-16 lg:h-20 w-auto aspect-square"
          />
          <span className="sr-only">Prima Donna AI</span>
          <span className="font-display text-sm sm:text-base text-primary -ml-1 self-end pb-1 sm:pb-2">AI™</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {user ? authedLinks : guestLinks}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground">
                Settings
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await signOut(); nav({ to: "/" }); }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm hover:text-primary">Sign in</Link>
              <Button asChild size="sm" className="rounded-full px-5">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-1">
          {!user && (
            <Button asChild size="sm" className="rounded-full px-4 h-9">
              <Link to="/signup" onClick={close}>Sign up</Link>
            </Button>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-muted text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1 text-base">
            {(user ? authedLinks : guestLinks)}
            <div className="my-3 h-px bg-border" />
            {user ? (
              <>
                <Link to="/settings" className="py-2 text-muted-foreground hover:text-foreground" onClick={close}>
                  Settings
                </Link>
                <button
                  className="py-2 text-left text-muted-foreground hover:text-foreground"
                  onClick={async () => { close(); await signOut(); nav({ to: "/" }); }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="py-2 hover:text-primary" onClick={close}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
