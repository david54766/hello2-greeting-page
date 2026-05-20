import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  COOKIE_POLICY_VERSION,
  logCookieConsent,
} from "@/lib/cookie-consent.functions";

const KEY = "pd_cookie_consent";
const SESSION_KEY = "pd_cookie_session";

type StoredConsent = {
  choice: "accepted" | "essential";
  at: string;
  policy_version?: string;
};

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        (crypto.randomUUID && crypto.randomUUID()) ||
        `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const log = useServerFn(logCookieConsent);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const parsed: StoredConsent = JSON.parse(raw);
      // Re-prompt only if the policy version changed
      if (parsed.policy_version !== COOKIE_POLICY_VERSION) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const respond = async (choice: "accepted" | "essential") => {
    const payload: StoredConsent = {
      choice,
      at: new Date().toISOString(),
      policy_version: COOKIE_POLICY_VERSION,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {}
    setVisible(false);

    try {
      const { data } = await supabase.auth.getUser();
      await log({
        data: {
          choice,
          policy_version: COOKIE_POLICY_VERSION,
          session_id: getOrCreateSessionId(),
          user_id: data.user?.id,
          user_agent:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 500)
              : undefined,
        },
      });
    } catch {
      // best-effort logging; never block the user
    }
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
