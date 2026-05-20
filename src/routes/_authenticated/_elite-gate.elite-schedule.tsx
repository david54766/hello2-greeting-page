import { createFileRoute, Link } from "@tanstack/react-router";
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6"><EliteSubNav /></div>
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Elite Circle</p>
        <h1 className="mt-2 font-display text-4xl">Schedule with Raven</h1>
        <p className="mt-2 text-muted-foreground">Pick an open slot. All times shown in {tz}.</p>
      </div>


      {upcoming.length > 0 && (
        <section className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-display text-xl">Your upcoming sessions</h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">
                    {new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date(b.starts_at))}
                  </div>
                  {b.topic && <div className="text-xs text-muted-foreground mt-0.5">Topic: {b.topic}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {roomUrl && (
                    <a href={roomUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Join <ExternalLink className="size-3" />
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>Cancel</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="gold-divider mt-10" />

      <section className="mt-8">
        <h2 className="font-display text-2xl flex items-center gap-2"><Calendar className="size-5 text-primary" /> Open slots</h2>
        {slots.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading availability…</p>}
        {!slots.isLoading && grouped.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No open slots available right now.</p>
        )}
        <div className="mt-6 space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <h3 className="font-display text-lg text-muted-foreground">{day}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {items.map((s) => (
                  <button
                    key={s.starts_at}
                    onClick={() => setChosen(s)}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary hover:text-primary transition"
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
