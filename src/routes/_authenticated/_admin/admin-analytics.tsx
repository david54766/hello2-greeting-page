import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getTierBreakdown,
  getActivityTimeseries,
  getFeatureUsage,
  getTopPrompts,
  listRecentPrompts,
} from "@/lib/admin-analytics.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/admin-analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AnalyticsPage,
});

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const TIER_COLORS: Record<string, string> = {
  essentials: "#d4a5c0", // soft rose
  pro: "#e83e8c",        // hot magenta-pink (brand primary)
  elite: "#a01a3c",      // deep crimson (brand accent)
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);

  const overviewFn = useServerFn(getAnalyticsOverview);
  const tierFn = useServerFn(getTierBreakdown);
  const activityFn = useServerFn(getActivityTimeseries);
  const featureFn = useServerFn(getFeatureUsage);
  const promptsFn = useServerFn(getTopPrompts);
  const recentFn = useServerFn(listRecentPrompts);

  const overview = useQuery({ queryKey: ["a-overview", days], queryFn: () => overviewFn({ data: { days } }) });
  const tiers = useQuery({ queryKey: ["a-tiers", days], queryFn: () => tierFn({ data: { days } }) });
  const activity = useQuery({ queryKey: ["a-activity", days], queryFn: () => activityFn({ data: { days } }) });
  const features = useQuery({ queryKey: ["a-features", days], queryFn: () => featureFn({ data: { days } }) });
  const prompts = useQuery({ queryKey: ["a-prompts", days], queryFn: () => promptsFn({ data: { days } }) });
  const recent = useQuery({
    queryKey: ["a-recent", days, page, search],
    queryFn: () => recentFn({ data: { days, page, search: search || undefined } }),
  });

  const heatmapMax = Math.max(1, ...(activity.data?.heatmap.map((h) => h.count) ?? [0]));

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Admin</p>
          <h1 className="mt-2 font-display text-4xl">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            ← Back to admin
          </Link>
          <div className="ml-4 inline-flex rounded-md border border-border overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1.5 text-sm ${days === r.value ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total users" value={overview.data?.totalUsers} sub={`+${overview.data?.newUsers7 ?? 0} this week`} />
        <Kpi label="Active users" value={overview.data?.activeUsers} sub={`last ${days}d`} />
        <Kpi label="Coaching sessions" value={overview.data?.sessions} sub={`avg ${overview.data?.avgSessionsPerActive ?? 0}/user`} />
        <Kpi label="Elite applications" value={overview.data?.eliteApplications} sub={`${overview.data?.recommendations ?? 0} daily recs`} />
      </section>

      {/* Tiers */}
      <Section title="Active tiers">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-medium mb-4">Tier distribution</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={Object.entries(tiers.data?.totals ?? {}).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {Object.keys(tiers.data?.totals ?? {}).map((k) => (
                      <Cell key={k} fill={TIER_COLORS[k] ?? "hsl(var(--primary))"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-medium mb-4">New signups (12 weeks)</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={tiers.data?.weekly ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="week" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="essentials" stackId="a" fill={TIER_COLORS.essentials} />
                  <Bar dataKey="pro" stackId="a" fill={TIER_COLORS.pro} />
                  <Bar dataKey="elite" stackId="a" fill={TIER_COLORS.elite} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </Section>

      {/* Activity timeseries */}
      <Section title="Usage over time">
        <Card>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={activity.data?.timeseries ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="activeUsers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="mt-6">
          <h3 className="text-sm font-medium mb-4">Busiest hours (sessions by weekday × hour)</h3>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-px" style={{ gridTemplateColumns: "auto repeat(24, minmax(18px, 1fr))" }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-[10px] text-center text-muted-foreground">{h}</div>
              ))}
              {DAY_LABELS.map((dayLabel, day) => {
                const heatmap = activity.data?.heatmap ?? [];
                return (
                  <FragmentRow key={day} dayLabel={dayLabel} day={day} heatmap={heatmap} max={heatmapMax} />
                );
              })}
            </div>
          </div>
        </Card>
      </Section>

      {/* Features */}
      <Section title="Most actively used">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-medium mb-4">Event types</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={features.data?.events ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-medium mb-4">Coaching modes</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={features.data?.modes ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-medium mb-4">Top templates</h3>
            <TwoColList items={features.data?.topTemplates ?? []} empty="No template events recorded yet." />
          </Card>
          <Card>
            <h3 className="text-sm font-medium mb-4">Top Elite request topics</h3>
            <TwoColList items={features.data?.topRequestTopics ?? []} empty="No requests in range." />
          </Card>
        </div>
      </Section>

      {/* Prompts */}
      <Section title="Common questions">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-medium mb-4">Top prompts ({prompts.data?.totalPrompts ?? 0} total)</h3>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {(prompts.data?.topPrompts ?? []).map((p, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm border-b border-border pb-2">
                  <span className="text-foreground/90">{p.prompt}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">×{p.count}</span>
                </li>
              ))}
              {!prompts.isLoading && (prompts.data?.topPrompts.length ?? 0) === 0 && (
                <li className="text-sm text-muted-foreground">No prompts in this range.</li>
              )}
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-medium mb-4">Keyword cloud</h3>
            <div className="flex flex-wrap gap-2">
              {(prompts.data?.keywords ?? []).map((k) => {
                const max = prompts.data?.keywords[0]?.count ?? 1;
                const size = 12 + (k.count / max) * 18;
                return (
                  <span
                    key={k.word}
                    className="rounded-full bg-muted px-3 py-1 text-foreground"
                    style={{ fontSize: `${size}px` }}
                    title={`${k.count} mentions`}
                  >
                    {k.word}
                  </span>
                );
              })}
              {!prompts.isLoading && (prompts.data?.keywords.length ?? 0) === 0 && (
                <span className="text-sm text-muted-foreground">Not enough data.</span>
              )}
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="text-sm font-medium">Recent prompts</h3>
            <form
              onSubmit={(e) => { e.preventDefault(); setPage(0); setSearch(searchInput); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Search prompts…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 w-64"
              />
              <Button type="submit" size="sm" variant="outline">Search</Button>
            </form>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.isLoading && <tr><td colSpan={5} className="px-3 py-3">Loading…</td></tr>}
                {recent.data?.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.full_name}</td>
                    <td className="px-3 py-2 capitalize">{r.tier}</td>
                    <td className="px-3 py-2 capitalize">{r.mode}</td>
                    <td className="px-3 py-2 max-w-xl truncate" title={r.prompt}>{r.prompt}</td>
                  </tr>
                ))}
                {recent.data && recent.data.rows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-3 text-muted-foreground">No prompts.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {recent.data ? `${recent.data.page * recent.data.pageSize + 1}–${Math.min((recent.data.page + 1) * recent.data.pageSize, recent.data.total)} of ${recent.data.total}` : ""}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!recent.data || (recent.data.page + 1) * recent.data.pageSize >= recent.data.total}
                onClick={() => setPage((p) => p + 1)}
              >Next</Button>
            </div>
          </div>
        </Card>
      </Section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value?: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value ?? "—"}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl mb-6">{title}</h2>
      {children}
    </section>
  );
}

function TwoColList({ items, empty }: { items: { name: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.name} className="flex items-center justify-between text-sm border-b border-border pb-2">
          <span className="truncate pr-3">{it.name}</span>
          <span className="text-xs text-muted-foreground">×{it.count}</span>
        </li>
      ))}
    </ul>
  );
}

function FragmentRow({ dayLabel, day, heatmap, max }: { dayLabel: string; day: number; heatmap: { day: number; hour: number; count: number }[]; max: number }) {
  return (
    <>
      <div className="text-[10px] pr-2 text-muted-foreground self-center">{dayLabel}</div>
      {Array.from({ length: 24 }, (_, hour) => {
        const cell = heatmap.find((c) => c.day === day && c.hour === hour);
        const intensity = (cell?.count ?? 0) / max;
        return (
          <div
            key={`${day}-${hour}`}
            title={`${dayLabel} ${hour}:00 — ${cell?.count ?? 0} sessions`}
            className="aspect-square rounded-sm"
            style={{ background: `hsl(var(--primary) / ${0.08 + intensity * 0.85})` }}
          />
        );
      })}
    </>
  );
}
