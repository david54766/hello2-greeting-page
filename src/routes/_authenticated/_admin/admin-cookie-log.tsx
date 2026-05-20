import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listCookieConsents } from "@/lib/cookie-consent.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin-cookie-log")({
  component: AdminCookieLogPage,
});

function AdminCookieLogPage() {
  const fetchLog = useServerFn(listCookieConsents);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-cookie-consents"],
    queryFn: () => fetchLog(),
  });

  const rows = data?.rows ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Admin</p>
          <h1 className="mt-2 font-display text-4xl">Cookie consent log</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent acceptances and declines. Visitors are re-prompted only when the policy version changes.
          </p>
        </div>
        <Link to="/admin" className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          ← Back to admin
        </Link>
      </div>

      <div className="gold-divider mt-8" />

      <section className="mt-8 rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">Failed to load: {(error as Error).message}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No consent events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Choice</th>
                  <th className="px-4 py-3">Policy version</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">User agent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex rounded-full px-2 py-0.5 text-xs " +
                          (r.choice === "accepted"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-foreground")
                        }
                      >
                        {r.choice}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.policy_version}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.user_id ? r.user_id.slice(0, 8) + "…" : "anon"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.session_id ? String(r.session_id).slice(0, 10) + "…" : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-md truncate" title={r.user_agent ?? ""}>
                      {r.user_agent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
