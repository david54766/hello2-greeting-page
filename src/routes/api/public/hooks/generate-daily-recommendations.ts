import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/generate-daily-recommendations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKeyHeader = request.headers.get("apikey");
        if (apiKeyHeader !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const openAiKey = process.env.OPENAI_API_KEY;
        if (!openAiKey) return new Response("OPENAI_API_KEY missing", { status: 500 });

        const { data: due, error: dueErr } = await supabaseAdmin
          .from("profiles")
          .select("id, business_name, state, timezone");
        if (dueErr) return new Response(dueErr.message, { status: 500 });

        const now = new Date();
        const eligible = (due ?? []).filter((p: any) => {
          const tz = p.timezone || "America/New_York";
          const hour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now), 10);
          return hour === 3;
        });

        let generated = 0;
        let skipped = 0;
        for (const p of eligible) {
          const tz = p.timezone || "America/New_York";
          const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

          const { data: existing } = await supabaseAdmin
            .from("daily_recommendations")
            .select("id")
            .eq("user_id", p.id)
            .eq("for_date", todayLocal)
            .maybeSingle();
          if (existing) { skipped++; continue; }

          const { data: centers } = await supabaseAdmin
            .from("centers")
            .select("name, state, enrollment_size, capacity, tuition_range, staff_count")
            .eq("user_id", p.id);

          const memory = centers && centers.length
            ? `Owner runs ${centers.length} center(s): ${centers.map((c: any) => `${c.name} (${c.state ?? "?"}, ${c.enrollment_size ?? "?"}/${c.capacity ?? "?"} enrolled, tuition ${c.tuition_range ?? "?"})`).join("; ")}.`
            : `Single center: ${p.business_name ?? "(unnamed)"}, ${p.state ?? "n/a"}.`;

          try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: "You are Prima Donna AI™. Generate ONE crisp strategic recommendation (1-2 sentences max) that a childcare center owner could act on today. No fluff, no greetings. Speak with authority." },
                  { role: "user", content: `Owner context: ${memory}\n\nGive me today's strategic move.` },
                ],
              }),
            });
            if (!res.ok) {
              console.error("OpenAI recommendation error for", p.id, res.status);
              skipped++;
              continue;
            }
            const json = await res.json();
            const text = json.choices?.[0]?.message?.content?.trim();
            if (!text) { skipped++; continue; }

            await supabaseAdmin
              .from("daily_recommendations")
              .insert({ user_id: p.id, for_date: todayLocal, recommendation: text });
            generated++;
          } catch (e) {
            console.error("Generation failed for", p.id, e);
            skipped++;
          }
        }



        return new Response(JSON.stringify({ ok: true, eligible: eligible.length, generated, skipped }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
