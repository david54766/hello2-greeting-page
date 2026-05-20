import { Link } from "@tanstack/react-router";
import { Crown, MessageSquare, Calendar } from "lucide-react";

export function EliteSubNav() {
  const linkClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition";
  const activeClass = "text-primary border-primary/60 bg-primary/5";
  return (
    <nav className="flex flex-wrap gap-2">
      <Link to="/elite" className={linkClass} activeProps={{ className: `${linkClass} ${activeClass}` }} activeOptions={{ exact: true }}>
        <Crown className="size-3.5" /> Elite Circle
      </Link>
      <Link to="/elite-circle" className={linkClass} activeProps={{ className: `${linkClass} ${activeClass}` }}>
        <MessageSquare className="size-3.5" /> Conversations
      </Link>
      <Link to="/elite-schedule" className={linkClass} activeProps={{ className: `${linkClass} ${activeClass}` }}>
        <Calendar className="size-3.5" /> Schedule
      </Link>
    </nav>
  );
}
