import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOpenSlots,
  getMyBookings,
  bookSlot,
  cancelBooking,
  getMeetingSettings,
} from "@/lib/raven-schedule.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EliteSubNav } from "@/components/EliteSubNav";

export const Route = createFileRoute("/_authenticated/_elite-gate/elite-schedule")({
  head: () => ({ meta: [{ title: "Schedule with Raven — Prima Donna AI™" }] }),
  component: EliteSchedule,
});

function EliteSchedule() {
  return <Scheduler />;
}

function Scheduler() {
  const slotsFn = useServerFn(getOpenSlots);
  const myFn = useServerFn(getMyBookings);
  const settingsFn = useServerFn(getMeetingSettings);
  const bookFn = useServerFn(bookSlot);
  const cancelFn = useServerFn(cancelBooking);
  const qc = useQueryClient();

  const slots = useQuery({ queryKey: ["raven-slots"], queryFn: () => slotsFn() });
  const mine = useQuery({ queryKey: ["my-bookings"], queryFn: () => myFn() });
  const settings = useQuery({ queryKey: ["raven-settings"], queryFn: () => settingsFn() });

  const [chosen, setChosen] = useState<{ starts_at: string; ends_at: string } | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    if (typeof window === "undefined") return "comfortable";
    return (window.localStorage.getItem("elite-schedule-density") as any) === "compact" ? "compact" : "comfortable";
  });
  const setDensityPersist = (d: "comfortable" | "compact") => {
    setDensity(d);
    try { window.localStorage.setItem("elite-schedule-density", d); } catch {}
  };
  const isCompact = density === "compact";

  const grouped = useMemo(() => {
    const tz = slots.data?.timezone ?? "America/New_York";
    const map = new Map<string, { starts_at: string; ends_at: string }[]>();
    (slots.data?.slots ?? []).forEach((s) => {
      const key = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" }).format(new Date(s.starts_at));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [slots.data]);

  const tz = slots.data?.timezone ?? "America/New_York";

  const confirm = async () => {
    if (!chosen) return;
    setBusy(true);
    const r = await bookFn({ data: { ...chosen, topic: topic.trim() || undefined } });
    setBusy(false);
    if (!r.ok) return toast.error(r.message);
    toast.success("Booked. See you then.");
    setChosen(null);
    setTopic("");
    qc.invalidateQueries({ queryKey: ["raven-slots"] });
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  const cancel = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;

    const r = await cancelFn({ data: { id } });
    if (!r.ok) return toast.error(r.message);
    toast.success("Booking cancelled.");
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
    qc.invalidateQueries({ queryKey: ["raven-slots"] });
  };

  const upcoming = (mine.data?.bookings ?? []).filter((b: any) => b.status === "booked" && new Date(b.starts_at).getTime() > Date.now());
  const roomUrl = settings.data?.settings.room_url || "";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6"><EliteSubNav /></div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Elite Circle</p>
          <h1 className="mt-1 font-display text-3xl">Schedule with Raven</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-border p-0.5 text-[11px]">
            <button
              onClick={() => setDensityPersist("comfortable")}
              className={`px-2.5 py-1 rounded-full transition ${!isCompact ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensityPersist("compact")}
              className={`px-2.5 py-1 rounded-full transition ${isCompact ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Compact
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{tz}</p>
        </div>
      </header>

      {upcoming.length > 0 && (
        <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">Your upcoming session{upcoming.length > 1 ? "s" : ""}</h2>
          <ul className="mt-2 divide-y divide-primary/10">
            {upcoming.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(b.starts_at))}
                  </div>
                  {b.topic && <div className="text-xs text-muted-foreground truncate">{b.topic}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {roomUrl && (
                    <a href={roomUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2">
                      Join <ExternalLink className="size-3" />
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => cancel(b.id)} className="h-7 px-2 text-xs">Cancel</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Calendar className="size-4 text-primary" /> Open slots
        </h2>
        {slots.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading availability…</p>}
        {!slots.isLoading && grouped.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No open slots available right now.</p>
        )}
        <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${isCompact ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {grouped.map(([day, items]) => (
            <div key={day} className={`rounded-lg border border-border bg-card/50 ${isCompact ? "p-2" : "p-3"}`}>
              <h3 className={`font-semibold uppercase tracking-wider text-muted-foreground ${isCompact ? "text-[10px]" : "text-xs"}`}>{day}</h3>
              <div className={`flex flex-wrap ${isCompact ? "mt-1.5 gap-1" : "mt-2 gap-1.5"}`}>
                {items.map((s) => (
                  <button
                    key={s.starts_at}
                    onClick={() => setChosen(s)}
                    className={`rounded-md border border-border bg-background hover:border-primary hover:text-primary transition ${isCompact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
                  >
                    {new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(s.starts_at))}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={!!chosen} onOpenChange={(o) => { if (!o) { setChosen(null); setTopic(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your session</DialogTitle>
          </DialogHeader>
          {chosen && (
            <div className="space-y-3">
              <p className="text-sm">
                {new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date(chosen.starts_at))} ({tz})
              </p>
              <Textarea
                placeholder="What would you like to focus on? (optional)"
                value={topic}
                maxLength={500}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChosen(null)}>Cancel</Button>
            <Button onClick={confirm} disabled={busy} className="rounded-full">
              {busy ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
