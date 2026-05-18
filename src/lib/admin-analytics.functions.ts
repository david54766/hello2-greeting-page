import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

const RangeSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

function sinceDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const getAnalyticsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = sinceDate(data.days);
    const since7 = sinceDate(7);

    const [users, newUsers7, newUsers30, sessions, recs, apps, events] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceDate(30)),
      supabaseAdmin.from("coaching_sessions").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("daily_recommendations").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("elite_applications").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("usage_events").select("user_id").gte("created_at", since).limit(5000),
    ]);

    const activeUsers = new Set((events.data ?? []).map((e: any) => e.user_id)).size;

    return {
      totalUsers: users.count ?? 0,
      newUsers7: newUsers7.count ?? 0,
      newUsers30: newUsers30.count ?? 0,
      sessions: sessions.count ?? 0,
      recommendations: recs.count ?? 0,
      eliteApplications: apps.count ?? 0,
      activeUsers,
      avgSessionsPerActive: activeUsers > 0 ? +(((sessions.count ?? 0) / activeUsers).toFixed(2)) : 0,
    };
  });

export const getTierBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("subscriptions").select("tier, created_at").limit(5000);
    const tally: Record<string, number> = { essentials: 0, pro: 0, elite: 0 };
    (data ?? []).forEach((r: any) => { tally[r.tier] = (tally[r.tier] ?? 0) + 1; });
    // weekly new signups by tier (last 12 weeks)
    const weeks: Record<string, { week: string; essentials: number; pro: number; elite: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      const key = d.toISOString().slice(0, 10);
      weeks[key] = { week: key, essentials: 0, pro: 0, elite: 0 };
    }
    const earliest = new Date(now); earliest.setDate(earliest.getDate() - 12 * 7);
    (data ?? []).forEach((r: any) => {
      const created = new Date(r.created_at);
      if (created < earliest) return;
      const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 7));
      const idx = 11 - diff;
      if (idx < 0 || idx > 11) return;
      const keys = Object.keys(weeks);
      const wk = weeks[keys[idx]];
      if (wk && r.tier in wk) (wk as any)[r.tier]++;
    });
    return {
      totals: tally,
      weekly: Object.values(weeks),
    };
  });

export const getActivityTimeseries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = sinceDate(data.days);

    const [{ data: sessions }, { data: events }] = await Promise.all([
      supabaseAdmin.from("coaching_sessions").select("user_id, mode, created_at").gte("created_at", since).limit(5000),
      supabaseAdmin.from("usage_events").select("user_id, created_at").gte("created_at", since).limit(5000),
    ]);

    const days: Record<string, { date: string; sessions: number; activeUsers: number; _users: Set<string> }> = {};
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key, sessions: 0, activeUsers: 0, _users: new Set() };
    }
    (sessions ?? []).forEach((s: any) => {
      const key = new Date(s.created_at).toISOString().slice(0, 10);
      if (days[key]) days[key].sessions++;
    });
    (events ?? []).forEach((e: any) => {
      const key = new Date(e.created_at).toISOString().slice(0, 10);
      if (days[key]) days[key]._users.add(e.user_id);
    });
    const timeseries = Object.values(days).map(({ _users, ...rest }) => ({ ...rest, activeUsers: _users.size }));

    // hour x weekday heatmap
    const heatmap: { day: number; hour: number; count: number }[] = [];
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    (sessions ?? []).forEach((s: any) => {
      const d = new Date(s.created_at);
      grid[d.getDay()][d.getHours()]++;
    });
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) heatmap.push({ day: d, hour: h, count: grid[d][h] });

    return { timeseries, heatmap };
  });

export const getFeatureUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = sinceDate(data.days);

    const [{ data: events }, { data: sessions }, { data: requests }] = await Promise.all([
      supabaseAdmin.from("usage_events").select("event_type, metadata").gte("created_at", since).limit(5000),
      supabaseAdmin.from("coaching_sessions").select("mode").gte("created_at", since).limit(5000),
      supabaseAdmin.from("elite_requests").select("topic").gte("created_at", since).limit(1000),
    ]);

    const eventCounts: Record<string, number> = {};
    const templateCounts: Record<string, number> = {};
    (events ?? []).forEach((e: any) => {
      eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
      const tid = e.metadata?.template_id || e.metadata?.template_title;
      if (tid) templateCounts[String(tid)] = (templateCounts[String(tid)] ?? 0) + 1;
    });
    const modeCounts: Record<string, number> = {};
    (sessions ?? []).forEach((s: any) => { modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1; });
    const topicCounts: Record<string, number> = {};
    (requests ?? []).forEach((r: any) => {
      const k = (r.topic ?? "").trim().toLowerCase().slice(0, 80);
      if (k) topicCounts[k] = (topicCounts[k] ?? 0) + 1;
    });

    const toSorted = (rec: Record<string, number>) =>
      Object.entries(rec).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    return {
      events: toSorted(eventCounts),
      modes: toSorted(modeCounts),
      topTemplates: toSorted(templateCounts).slice(0, 10),
      topRequestTopics: toSorted(topicCounts).slice(0, 10),
    };
  });

const STOP_WORDS = new Set(("a an the and or but if then so of in on for to from with by at as is are was were be been being have has had do does did i you we they it this that what how when where why which who whom my our your their me us them about can could should would will just like need want help my our".split(" ")));

export const getTopPrompts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = sinceDate(data.days);
    const { data: rows } = await supabaseAdmin
      .from("coaching_sessions")
      .select("prompt, created_at, mode")
      .gte("created_at", since)
      .limit(5000);

    const grouped: Record<string, { prompt: string; count: number; lastAsked: string; mode: string }> = {};
    const keywordCounts: Record<string, number> = {};

    (rows ?? []).forEach((r: any) => {
      const norm = (r.prompt ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
      if (!norm) return;
      if (!grouped[norm]) grouped[norm] = { prompt: r.prompt.slice(0, 200), count: 0, lastAsked: r.created_at, mode: r.mode };
      grouped[norm].count++;
      if (r.created_at > grouped[norm].lastAsked) grouped[norm].lastAsked = r.created_at;

      norm.split(/[^a-z0-9]+/).forEach((w: string) => {
        if (w.length < 4 || STOP_WORDS.has(w)) return;
        keywordCounts[w] = (keywordCounts[w] ?? 0) + 1;
      });
    });

    const topPrompts = Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 25);
    const keywords = Object.entries(keywordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);

    return { topPrompts, keywords, totalPrompts: rows?.length ?? 0 };
  });

const RecentSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
  page: z.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
});

export const listRecentPrompts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const since = sinceDate(data.days);
    const pageSize = 25;
    const from = data.page * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("coaching_sessions")
      .select("id, user_id, prompt, mode, created_at", { count: "exact" })
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.search) q = q.ilike("prompt", `%${data.search}%`);

    const { data: rows, count } = await q;
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
      supabaseAdmin.from("subscriptions").select("user_id, tier").in("user_id", ids),
    ]);
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    const smap = new Map((subs ?? []).map((s: any) => [s.user_id, s.tier]));

    return {
      total: count ?? 0,
      page: data.page,
      pageSize,
      rows: (rows ?? []).map((r: any) => ({
        id: r.id,
        prompt: r.prompt,
        mode: r.mode,
        created_at: r.created_at,
        full_name: pmap.get(r.user_id) ?? "—",
        tier: smap.get(r.user_id) ?? "essentials",
      })),
    };
  });
