import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCoachingHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("coaching_sessions")
      .select("id, mode, prompt, response, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { sessions: [], error: error.message };
    return { sessions: data ?? [], error: null as string | null };
  });

const MODE_PROMPTS: Record<string, string> = {
  ceo: "ROLE: CEO Strategist. SCOPE: vision, leadership, executive decision-making, time allocation, org design, and high-leverage owner moves. STAY IN LANE: do not produce marketing copy, pricing tables, licensing citations, or SOP checklists — redirect the owner to the correct mode if they ask. Speak as a peer to a multi-site CEO. Tie every recommendation to owner leverage (what only they can do).",
  revenue: "ROLE: Revenue Strategist. SCOPE: tuition pricing, enrollment funnel math, waitlist conversion, family retention, ancillary revenue (registration fees, late fees, summer camps, extended care), discounting policy, and unit economics per classroom. STAY IN LANE: no brand or creative work, no compliance interpretation. Always quantify: cite enrollment %, ARPU, LTV, or revenue per seat where possible using the owner's portfolio data.",
  marketing: "ROLE: Marketing Strategist. SCOPE: brand positioning, local SEO, Google Business Profile, paid social, referral programs, tour-to-enroll conversion, parent reviews, and reputation management. STAY IN LANE: no pricing decisions, no licensing guidance, no staffing SOPs. Tailor tactics to the center's city/state market when known.",
  compliance: "ROLE: Compliance & Licensing Advisor. SCOPE: state-specific licensing rules, staff-to-child ratios, group sizes, square-footage requirements, background check and training requirements, ratio violations, inspection prep, incident reporting, and policy documentation. CRITICAL: Childcare licensing is regulated at the STATE level — rules vary materially between states (e.g., infant ratios in CA vs TX vs NY). For EACH center in the owner's portfolio, address it BY STATE and cite the licensing body by name (e.g., 'California CDSS Community Care Licensing', 'Texas HHSC Child Care Regulation', 'NY OCFS'). When you state a specific ratio, square footage, or training hour requirement, name the state and the rule source. If multiple centers span multiple states, give per-state guidance side-by-side — never a generic answer. If the owner's state is unknown for a given center, ASK before answering. Always end with: 'Verify current rules directly with your state licensing agency — regulations change and this is guidance, not legal advice.'",
  systems: "ROLE: Operations & Systems Strategist. SCOPE: SOPs, hiring funnels, onboarding, scheduling, staff retention, classroom transitions, parent communication systems, and process design. STAY IN LANE: no licensing rulings, no marketing copy. Output should be implementable this week by a director without the owner present.",
};

const SYSTEM_BASE = `You are Prima Donna AI™, an elite executive business coach. You speak with authority, precision, and zero fluff. You do not use filler, apologies, or chat-like phrasing. You respond ONLY by calling the structured_response tool with three fields: insight (a sharp diagnostic observation), recommendation (the strategic move), and action_steps (3-5 concrete actions the owner can take this week).`;

const Input = z.object({
  mode: z.enum(["ceo", "revenue", "marketing", "compliance", "systems"]),
  prompt: z.string().min(3).max(4000),
});

export const runCoaching = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const [{ data: profile }, { data: centers }] = await Promise.all([
      supabase.from("profiles").select("full_name, business_name, state, enrollment_size, tuition_range, staff_count").eq("id", userId).maybeSingle(),
      supabase.from("centers").select("name, city, state, enrollment_size, capacity, tuition_range, staff_count, ages_served, notes").eq("user_id", userId).order("created_at", { ascending: true }),
    ]);

    const ownerLine = profile
      ? `Owner: ${profile.full_name ?? "(unnamed)"}. Primary center on file: ${profile.business_name ?? "(unnamed)"}.`
      : "No owner profile on file yet.";

    const centerBlock = centers && centers.length
      ? centers.map((c, i) => `Center ${i + 1}: ${c.name}${c.city ? `, ${c.city}` : ""}${c.state ? `, ${c.state}` : ""}. Enrollment ${c.enrollment_size ?? "n/a"}/${c.capacity ?? "n/a"} capacity. Tuition ${c.tuition_range ?? "n/a"}. Staff ${c.staff_count ?? "n/a"}. Ages ${c.ages_served ?? "n/a"}.${c.notes ? ` Notes: ${c.notes}` : ""}`).join("\n")
      : "No centers registered yet — guidance will be general until the owner adds centers in Settings.";

    const memory = `${ownerLine}\n\nPORTFOLIO (${centers?.length ?? 0} center${centers?.length === 1 ? "" : "s"}):\n${centerBlock}`;

    const messages = [
      { role: "system", content: `${SYSTEM_BASE}\n\nMODE: ${MODE_PROMPTS[data.mode]}\n\nOWNER CONTEXT:\n${memory}\n\nWhen the owner runs multiple centers, tailor your insight, recommendation, and action steps to the specific center(s) implicated by their question. If unclear, address the portfolio as a whole and call out which center each step applies to.` },
      { role: "user", content: data.prompt },
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "structured_response",
          description: "Return the structured executive coaching response.",
          parameters: {
            type: "object",
            properties: {
              insight: { type: "string", description: "Sharp diagnostic observation, 1-3 sentences." },
              recommendation: { type: "string", description: "The strategic move, decisive and specific." },
              action_steps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
            },
            required: ["insight", "recommendation", "action_steps"],
            additionalProperties: false,
          },
        },
      },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        tools,
        tool_choice: { type: "function", function: { name: "structured_response" } },
      }),
    });

    if (res.status === 429) return { error: "Rate limit reached. Try again in a moment." as const, response: null };
    if (res.status === 402) return { error: "AI credits exhausted. Add funds in workspace settings." as const, response: null };
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      return { error: "Strategist temporarily unavailable." as const, response: null };
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return { error: "No structured response returned." as const, response: null };

    let parsed: { insight: string; recommendation: string; action_steps: string[] };
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return { error: "Malformed response." as const, response: null };
    }

    await supabase.from("coaching_sessions").insert({
      user_id: userId,
      mode: data.mode,
      prompt: data.prompt,
      response: parsed,
    });
    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "coaching_session",
      metadata: { mode: data.mode },
    });

    return { error: null, response: parsed };
  });

async function generateRecommendationText(memory: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are Prima Donna AI™. Generate ONE crisp strategic recommendation (1-2 sentences max) that a childcare center owner could act on today. No fluff, no greetings. Speak with authority." },
        { role: "user", content: `Owner context: ${memory}\n\nGive me today's strategic move.` },
      ],
    }),
  });
  if (!res.ok) return "Audit your top 3 enrollment leads from the past 7 days. Which one have you not yet personally called?";
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "Make one decision today that your future self will thank you for.";
}

function buildOwnerMemory(profile: any, centers: any[] | null): string {
  return centers && centers.length
    ? `Owner runs ${centers.length} center(s): ${centers.map((c) => `${c.name} (${c.state ?? "?"}, ${c.enrollment_size ?? "?"}/${c.capacity ?? "?"} enrolled, tuition ${c.tuition_range ?? "?"})`).join("; ")}.`
    : profile
    ? `Single center: ${profile.business_name ?? "(unnamed)"}, ${profile.state ?? "n/a"}.`
    : "No business profile yet.";
}

export const getTodayRecommendation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, state, timezone")
      .eq("id", userId)
      .maybeSingle();
    const tz = profile?.timezone ?? "America/New_York";
    const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

    // Try cached row
    const { data: existing } = await supabase
      .from("daily_recommendations")
      .select("recommendation, created_at, for_date")
      .eq("user_id", userId)
      .eq("for_date", todayLocal)
      .maybeSingle();
    if (existing) return { recommendation: existing.recommendation, created_at: existing.created_at, for_date: existing.for_date };

    // Generate now
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { recommendation: "Connect AI to receive today's strategic move.", created_at: new Date().toISOString(), for_date: todayLocal };

    const { data: centers } = await supabase
      .from("centers")
      .select("name, state, enrollment_size, capacity, tuition_range, staff_count")
      .eq("user_id", userId);

    const text = await generateRecommendationText(buildOwnerMemory(profile, centers), apiKey);

    const { data: inserted } = await supabase
      .from("daily_recommendations")
      .insert({ user_id: userId, for_date: todayLocal, recommendation: text })
      .select("recommendation, created_at, for_date")
      .maybeSingle();

    return inserted ?? { recommendation: text, created_at: new Date().toISOString(), for_date: todayLocal };
  });
