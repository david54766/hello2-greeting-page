import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAvailability,
  getMeetingSettings,
  upsertAvailability,
  deleteAvailability,
  updateMeetingSettings,
  adminListBookings,
} from "@/lib/raven-schedule.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function RavenScheduleAdmin() {
  const availFn = useServerFn(getAvailability);
  const settingsFn = useServerFn(getMeetingSettings);
  const bookingsFn = useServerFn(adminListBookings);
  const upsertFn = useServerFn(upsertAvailability);
  const delFn = useServerFn(deleteAvailability);
  const saveSettingsFn = useServerFn(updateMeetingSettings);
  const qc = useQueryClient();

  const avail = useQuery({ queryKey: ["admin-raven-availability"], queryFn: () => availFn() });
  const settings = useQuery({ queryKey: ["admin-raven-settings"], queryFn: () => settingsFn() });
  const bookings = useQuery({ queryKey: ["admin-raven-bookings"], queryFn: () => bookingsFn() });

  // Settings form local state, hydrated from query
  const s = settings.data?.settings;
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [tz, setTz] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<number | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const _roomUrl = roomUrl ?? s?.room_url ?? "";
  const _tz = tz ?? s?.timezone ?? "America/New_York";
  const _buffer = buffer ?? s?.buffer_minutes ?? 0;
  const _advance = advance ?? s?.advance_days ?? 30;

  const saveSettings = async () => {
    const r = await saveSettingsFn({ data: {
      room_url: _roomUrl, timezone: _tz, buffer_minutes: _buffer, advance_days: _advance,
    }});
    if (!r.ok) return toast.error(r.message);
    toast.success("Settings saved.");
    qc.invalidateQueries({ queryKey: ["admin-raven-settings"] });
    qc.invalidateQueries({ queryKey: ["raven-settings"] });
  };

  const addRow = async () => {
    const r = await upsertFn({ data: { weekday: 1, start_time: "09:00", end_time: "10:00", slot_minutes: 30, active: true } });
    if (!r.ok) return toast.error(r.message);
    qc.invalidateQueries({ queryKey: ["admin-raven-availability"] });
  };

  const removeRow = async (id: string) => {
    const r = await delFn({ data: { id } });
    if (!r.ok) return toast.error(r.message);
    qc.invalidateQueries({ queryKey: ["admin-raven-availability"] });
    qc.invalidateQueries({ queryKey: ["raven-slots"] });
  };

  const saveRow = async (row: any) => {
    const r = await upsertFn({ data: {
      id: row.id,
      weekday: Number(row.weekday),
      start_time: row.start_time,
      end_time: row.end_time,
      slot_minutes: Number(row.slot_minutes),
      active: !!row.active,
    }});
    if (!r.ok) return toast.error(r.message);
    toast.success("Saved.");
    qc.invalidateQueries({ queryKey: ["admin-raven-availability"] });
    qc.invalidateQueries({ queryKey: ["raven-slots"] });
  };

  return (
    <div>
      <h2 className="font-display text-2xl">Raven scheduling</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Define Raven's weekly availability and the standing meeting room link. Elite members book against these windows.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">Meeting settings</h3>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Standing Raven room URL</Label>
            <Input value={_roomUrl} onChange={(e) => setRoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." />
          </div>
          <div>
            <Label>Timezone (IANA)</Label>
            <Input value={_tz} onChange={(e) => setTz(e.target.value)} placeholder="America/New_York" />
          </div>
          <div>
            <Label>Buffer (minutes)</Label>
            <Input type="number" min={0} max={120} value={_buffer} onChange={(e) => setBuffer(parseInt(e.target.value || "0", 10))} />
          </div>
          <div>
            <Label>Booking window (days ahead)</Label>
            <Input type="number" min={1} max={180} value={_advance} onChange={(e) => setAdvance(parseInt(e.target.value || "30", 10))} />
          </div>
        </div>
        <Button onClick={saveSettings} className="mt-4 rounded-full">Save settings</Button>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Weekly availability windows</h3>
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="size-4 mr-1" /> Add window</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Day</th>
                <th className="px-2 py-2">Start</th>
                <th className="px-2 py-2">End</th>
                <th className="px-2 py-2">Slot (min)</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {avail.data?.windows.map((w: any) => (
                <AvailabilityRow key={w.id} row={w} onSave={saveRow} onDelete={() => removeRow(w.id)} />
              ))}
              {avail.data?.windows.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-4 text-muted-foreground">No availability defined.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">Upcoming bookings</h3>
        <div className="mt-3 space-y-2 text-sm">
          {bookings.data?.bookings.filter((b: any) => b.status === "booked" && new Date(b.starts_at).getTime() > Date.now()).map((b: any) => (
            <div key={b.id} className="flex justify-between items-start gap-3 border-b border-border/40 py-2">
              <div>
                <div>{new Date(b.starts_at).toLocaleString()} — {b.member_name}</div>
                {b.topic && <div className="text-xs text-muted-foreground">{b.topic}</div>}
              </div>
              <span className="text-xs text-muted-foreground">{b.status}</span>
            </div>
          ))}
          {bookings.data?.bookings.filter((b: any) => b.status === "booked" && new Date(b.starts_at).getTime() > Date.now()).length === 0 && (
            <p className="text-muted-foreground">No upcoming bookings.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailabilityRow({ row, onSave, onDelete }: { row: any; onSave: (r: any) => void; onDelete: () => void }) {
  const [local, setLocal] = useState(row);
  const dirty = JSON.stringify(local) !== JSON.stringify(row);
  return (
    <tr className="border-t border-border/40">
      <td className="px-2 py-2">
        <select className="rounded-md border border-border bg-background px-2 py-1"
          value={local.weekday} onChange={(e) => setLocal({ ...local, weekday: parseInt(e.target.value, 10) })}>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={local.start_time.slice(0,5)} onChange={(e) => setLocal({ ...local, start_time: e.target.value })} className="w-28" />
      </td>
      <td className="px-2 py-2">
        <Input type="time" value={local.end_time.slice(0,5)} onChange={(e) => setLocal({ ...local, end_time: e.target.value })} className="w-28" />
      </td>
      <td className="px-2 py-2">
        <Input type="number" min={5} max={240} value={local.slot_minutes} onChange={(e) => setLocal({ ...local, slot_minutes: parseInt(e.target.value || "30", 10) })} className="w-20" />
      </td>
      <td className="px-2 py-2">
        <input type="checkbox" checked={!!local.active} onChange={(e) => setLocal({ ...local, active: e.target.checked })} />
      </td>
      <td className="px-2 py-2 flex gap-2">
        <Button size="sm" disabled={!dirty} onClick={() => onSave(local)}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="size-4 text-destructive" /></Button>
      </td>
    </tr>
  );
}
