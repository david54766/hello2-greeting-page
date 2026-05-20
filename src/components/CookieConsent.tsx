import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const KEY = "pd_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {}
  }, []);

  const respond = (choice: "accepted" | "essential") => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card/95 backdrop-blur shadow-2xl shadow-primary/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            We use essential cookies to keep you signed in and a small amount of analytics to improve Raven.{" "}
            <Link to="/cookies" className="text-primary underline-offset-4 hover:underline">Learn more</Link>.
          </p>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => respond("essential")}>
              Essential only
            </Button>
            <Button size="sm" className="rounded-full" onClick={() => respond("accepted")}>
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
