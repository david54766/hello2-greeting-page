import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --- Public-ish (authenticated) reads ---

export const getMeetingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("raven_meeting_settings")
      .select("room_url, timezone, buffer_minutes, advance_days")
      .eq("singleton", true)
      .maybeSingle();
    return {
      settings: data ?? { room_url: "", timezone: "America/New_York", buffer_minutes: 0, advance_days: 30 },
    };
  });

export const getAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("raven_availability")
      .select("id, weekday, start_time, end_time, slot_minutes, active")
      .order("weekday")
      .order("start_time");
    return { windows: data ?? [] };
  });

export const getOpenSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: settingsRow }, { data: windows }] = await Promise.all([
      supabase.from("raven_meeting_settings").select("timezone, advance_days, buffer_minutes").eq("singleton", true).maybeSingle(),
      supabase.from("raven_availability").select("weekday, start_time, end_time, slot_minutes, active").eq("active", true),
    ]);
    const settings = settingsRow ?? { timezone: "America/New_York", advance_days: 30, buffer_minutes: 0 };
    const horizon = new Date();
    horizon.setUTCDate(horizon.getUTCDate() + (settings.advance_days ?? 30));

    const { data: existing } = await supabase
      .from("raven_bookings")
      .select("starts_at")
      .eq("status", "booked")
      .gte("starts_at", new Date().toISOString())
      .lte("starts_at", horizon.toISOString());
    const taken = new Set((existing ?? []).map((b: any) => new Date(b.starts_at).toISOString()));

    // Generate slots day by day in the configured timezone
    const slots: { starts_at: string; ends_at: string }[] = [];
    const tz = settings.timezone || "America/New_York";

    const start = new Date();
    for (let day = 0; day <= (settings.advance_days ?? 30); day++) {
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      // Determine weekday in tz
      const wd = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).formatToParts(date).find((p) => p.type === "weekday")?.value
        ? String(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date)))
        : "0", 10);

      const dayWindows = (windows ?? []).filter((w: any) => w.weekday === wd);
      for (const w of dayWindows) {
        const [sH, sM] = (w.start_time as string).split(":").map(Number);
        const [eH, eM] = (w.end_time as string).split(":").map(Number);
        const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
        // Build slot times by walking minutes in tz; convert to UTC via constructed wall-time then offset lookup
        let cursor = sH * 60 + sM;
        const endMin = eH * 60 + eM;
        while (cursor + w.slot_minutes <= endMin) {
          const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
          const mm = String(cursor % 60).padStart(2, "0");
          const iso = wallTimeToUtcIso(dateStr, `${hh}:${mm}`, tz);
          if (iso && new Date(iso).getTime() > Date.now()) {
            const endIso = new Date(new Date(iso).getTime() + w.slot_minutes * 60_000).toISOString();
            if (!taken.has(new Date(iso).toISOString())) {
              slots.push({ starts_at: iso, ends_at: endIso });
            }
          }
          cursor += w.slot_minutes;
        }
      }
    }
    slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return { slots, timezone: tz };
  });

function wallTimeToUtcIso(dateStr: string, timeStr: string, tz: string): string | null {
  // dateStr: YYYY-MM-DD in tz; timeStr: HH:MM in tz. Returns UTC ISO.
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    // Assume UTC, then adjust by tz offset at that moment
    const guess = Date.UTC(y, m - 1, d, h, mi);
    // Compute tz offset of guess in minutes
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(guess));
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
    const asTz = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") === 24 ? 0 : get("hour"), get("minute"));
    const offset = asTz - guess; // ms tz is ahead of UTC at guess
    return new Date(guess - offset).toISOString();
  } catch {
    return null;
  }
}

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("raven_bookings")
      .select("id, starts_at, ends_at, status, topic, created_at")
      .eq("user_id", userId)
      .order("starts_at", { ascending: false });
    return { bookings: data ?? [] };
  });

export const bookSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      starts_at: z.string(),
      ends_at: z.string(),
      topic: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Server-side conflict check
    const { data: conflict } = await supabase
      .from("raven_bookings")
      .select("id")
      .eq("status", "booked")
      .eq("starts_at", data.starts_at)
      .maybeSingle();
    if (conflict) return { ok: false, message: "That slot was just booked. Pick another." };

    const { error } = await supabase.from("raven_bookings").insert({
      user_id: userId,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      topic: data.topic ?? null,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("raven_bookings")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

// --- Admin ---

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Not authorized");

    const { data } = await supabase
      .from("raven_bookings")
      .select("id, user_id, starts_at, ends_at, status, topic, created_at")
      .order("starts_at", { ascending: true });
    const ids = Array.from(new Set((data ?? []).map((b: any) => b.user_id)));
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Member"]));
    }
    return { bookings: (data ?? []).map((b: any) => ({ ...b, member_name: names[b.user_id] ?? "Member" })) };
  });

export const upsertAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      weekday: z.number().int().min(0).max(6),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      slot_minutes: z.number().int().min(5).max(240),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.id) {
      const { error } = await supabase.from("raven_availability").update({
        weekday: data.weekday,
        start_time: data.start_time,
        end_time: data.end_time,
        slot_minutes: data.slot_minutes,
        active: data.active,
      }).eq("id", data.id);
      if (error) return { ok: false, message: error.message };
    } else {
      const { error } = await supabase.from("raven_availability").insert({
        weekday: data.weekday,
        start_time: data.start_time,
        end_time: data.end_time,
        slot_minutes: data.slot_minutes,
        active: data.active,
      });
      if (error) return { ok: false, message: error.message };
    }
    return { ok: true };
  });

export const deleteAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("raven_availability").delete().eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

export const updateMeetingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      room_url: z.string().max(500),
      timezone: z.string().min(1).max(64),
      buffer_minutes: z.number().int().min(0).max(120),
      advance_days: z.number().int().min(1).max(180),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("raven_meeting_settings")
      .update(data)
      .eq("singleton", true);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });
