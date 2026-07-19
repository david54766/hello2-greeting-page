import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getEliteUpdates } from "@/lib/elite-updates.functions";

const LS_KEYS = {
  conversations: "elite:lastSeen:conversations",
} as const;

function isNewer(latest: string | null, seen: string | null) {
  if (!latest) return false;
  if (!seen) return true;
  return new Date(latest).getTime() > new Date(seen).getTime();
}

export function EliteSubNav() {
  const linkClass =
    "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition";
  const activeClass = "text-primary border-primary/60 bg-primary/5";

  const fetchUpdates = useServerFn(getEliteUpdates);
  const { data } = useQuery({
    queryKey: ["elite-updates"],
    queryFn: () => fetchUpdates(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [seen, setSeen] = useState<{ conversations: string | null }>(() => ({
    conversations: typeof window !== "undefined" ? localStorage.getItem(LS_KEYS.conversations) : null,
  }));

  useEffect(() => {
    if (!data) return;
    if (pathname.startsWith("/elite-circle") && data.conversationsLatest) {
      localStorage.setItem(LS_KEYS.conversations, data.conversationsLatest);
      setSeen((s) => ({ ...s, conversations: data.conversationsLatest }));
    }
  }, [pathname, data]);

  const convoNew = isNewer(data?.conversationsLatest ?? null, seen.conversations);

  return (
    <nav className="flex flex-wrap gap-2">
      <Link to="/elite" className={linkClass} activeProps={{ className: `${linkClass} ${activeClass}` }} activeOptions={{ exact: true }}>
        <Crown className="size-3.5" /> Elite Circle
      </Link>
      <Link to="/elite-circle" className={linkClass} activeProps={{ className: `${linkClass} ${activeClass}` }}>
        <MessageSquare className="size-3.5" /> Conversations
        {convoNew && <NotificationDot />}
      </Link>
    </nav>
  );
}

function NotificationDot() {
  return (
    <span
      aria-label="New updates"
      className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse"
    />
  );
}
