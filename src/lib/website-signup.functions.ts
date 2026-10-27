import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { performWebsiteSignup } from "./adult-attestation";

// Public endpoint: validation happens inside performWebsiteSignup (literal true attestation).
export const websiteSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    return performWebsiteSignup(data, {
      signUp: async ({ email, password, metadata, redirectTo }) => {
        const { data: r, error } = await pub.auth.signUp({
          email,
          password,
          options: { data: metadata, emailRedirectTo: redirectTo },
        });
        if (error) return { userId: null, isNewIdentity: false, session: null, error: error.message };
        return {
          userId: r.user?.id ?? null,
          isNewIdentity: (r.user?.identities?.length ?? 0) > 0,
          session: r.session
            ? { access_token: r.session.access_token, refresh_token: r.session.refresh_token }
            : null,
          error: null,
        };
      },
      recordAttestation: async (row) => {
        const { error } = await supabaseAdmin.from("adult_attestations").insert(row);
        if (error) console.error("adult_attestations insert failed", error.message);
        return { error: error?.message ?? null };
      },
      updateProfile: async (id, p) => {
        await supabaseAdmin.from("profiles").update(p).eq("id", id);
      },
    });
  });
