import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const hasAnyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.rpc("has_any_admin");
    if (error) return { exists: true, error: error.message };
    return { exists: !!data, error: null as string | null };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin.rpc("has_any_admin");
    if (existing) return { ok: false, message: "An admin already exists." };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Admin access granted." };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return { users: [], error: "Forbidden" };

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
    if (authErr) return { users: [], error: authErr.message };

    const ids = authData.users.map((u) => u.id);
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, business_name").in("id", ids),
      supabaseAdmin.from("subscriptions").select("user_id, tier, status").in("user_id", ids),
    ]);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const smap = new Map((subs ?? []).map((s) => [s.user_id, s]));

    const users = authData.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      full_name: pmap.get(u.id)?.full_name ?? null,
      business_name: pmap.get(u.id)?.business_name ?? null,
      tier: (smap.get(u.id)?.tier as string) ?? "essentials",
      status: (smap.get(u.id)?.status as string) ?? "active",
    }));
    return { users, error: null as string | null };
  });

export const setUserTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        tier: z.enum(["essentials", "pro", "elite"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return { ok: false, message: "Forbidden" };
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ tier: data.tier, status: "active" })
      .eq("user_id", data.targetUserId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Tier updated." };
  });

export const listEliteRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return { requests: [], error: "Forbidden" };
    const { data, error } = await supabaseAdmin
      .from("elite_requests")
      .select("id, user_id, topic, preferred_times, status, created_at")
      .order("created_at", { ascending: false });
    if (error) return { requests: [], error: error.message };

    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, business_name")
      .in("id", ids);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      requests: (data ?? []).map((r) => ({
        ...r,
        full_name: pmap.get(r.user_id)?.full_name ?? null,
        business_name: pmap.get(r.user_id)?.business_name ?? null,
      })),
      error: null as string | null,
    };
  });

export const updateEliteRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "scheduled", "completed", "declined"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!isAdmin) return { ok: false };
    await supabaseAdmin.from("elite_requests").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });

export const deleteRagDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!isAdmin) return { ok: false, message: "Forbidden" };
    const { data: doc } = await supabaseAdmin.from("rag_documents").select("storage_path").eq("id", data.id).maybeSingle();
    if (doc?.storage_path) await supabaseAdmin.storage.from("rag-docs").remove([doc.storage_path]);
    await supabaseAdmin.from("rag_documents").delete().eq("id", data.id);
    return { ok: true, message: "Document removed." };
  });
