import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EliteSubNav } from "@/components/EliteSubNav";

export const Route = createFileRoute("/_authenticated/_elite-gate/elite-schedule")({
  head: () => ({ meta: [{ title: "Schedule with Raven — Prima Donna AI™" }] }),
  component: Scheduler,
});

type Slot = { starts_at: string; ends_at: string };
type View = "week" | "day";

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 = Sun
  x.setDate(x.getDate() - day);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDayInTZ(a: Date, b: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(a) === fmt.format(b);
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

  const tz = slots.data?.timezone ?? "America/New_York";

  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const days = useMemo(
    () => (view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [cursor]),
    [view, weekStart, cursor]
  );

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    (slots.data?.slots ?? []).forEach((s) => {
      const k = keyFmt.format(new Date(s.starts_at));
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    });
    return { map, keyFmt };
  }, [slots.data, tz]);

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" }).format(cursor);
    }
    const end = addDays(weekStart, 6);
    const m = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(d);
    return `${m(weekStart)} – ${m(end)}`;
  }, [view, cursor, weekStart, tz]);

  const step = (dir: -1 | 1) => setCursor((c) => addDays(c, view === "week" ? 7 * dir : dir));
  const goToday = () => setCursor(new Date());

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

  const upcoming = (mine.data?.bookings ?? []).filter(
    (b: any) => b.status === "booked" && new Date(b.starts_at).getTime() > Date.now()
  );
  const roomUrl = settings.data?.settings.room_url || "";
  const today = new Date();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6"><EliteSubNav /></div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Elite Circle</p>
          <h1 className="mt-1 font-display text-3xl">Schedule with Raven</h1>
        </div>
        <p className="text-xs text-muted-foreground">{tz}</p>
      </header>

      {upcoming.length > 0 && (
        <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Your upcoming session{upcoming.length > 1 ? "s" : ""}
          </h2>
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

      {/* Calendar nav bar */}
      <section className="mt-8 rounded-xl border border-border bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => step(-1)} className="h-8 w-8 p-0">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday} className="h-8 px-3 text-xs">Today</Button>
            <Button variant="outline" size="sm" onClick={() => step(1)} className="h-8 w-8 p-0">
              <ChevronRight className="size-4" />
            </Button>
            <div className="ml-2 text-sm font-medium">{rangeLabel}</div>
          </div>
          <div className="inline-flex rounded-full border border-border p-0.5 text-[11px]">
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1 rounded-full transition ${view === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 rounded-full transition ${view === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Week
            </button>
          </div>
        </div>

        {slots.isLoading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Loading availability…</p>
        ) : (
          <div
            className={`grid divide-x divide-border ${
              view === "week" ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" : "grid-cols-1"
            }`}
          >
            {days.map((d) => {
              const key = slotsByDay.keyFmt.format(d);
              const dayItems = (slotsByDay.map.get(key) ?? []).sort(
                (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
              );
              const isToday = sameDayInTZ(d, today, tz);
              return (
                <div key={d.toISOString()} className="min-h-[120px] p-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d)}
                    </div>
                    <div className={`text-sm font-display ${isToday ? "text-primary" : ""}`}>
                      {new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" }).format(d)}
                    </div>
                  </div>
                  {dayItems.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/70">—</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {dayItems.map((s) => (
                        <button
                          key={s.starts_at}
                          onClick={() => setChosen(s)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-left text-xs hover:border-primary hover:text-primary transition"
                        >
                          {new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(s.starts_at))}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
