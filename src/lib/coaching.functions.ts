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
  ceo: "MODE LENS — CEO Strategist. Focus the doctrine on vision, leadership, executive decisions, time allocation, org design, and high-leverage owner moves. Tie every answer to owner leverage — what only they can do. Do NOT produce marketing copy, pricing tables, licensing citations, or SOP checklists; redirect to the correct mode if asked.",
  revenue: "MODE LENS — Revenue Strategist. Focus the doctrine on tuition pricing, enrollment funnel math (inquiry→tour 70%+, tour→enroll 60%+), waitlist conversion, retention, ancillary revenue, discount policy, and unit economics per classroom. Always quantify: cite enrollment %, ARPU, LTV, revenue per seat, payroll % (target 50–60% of revenue) using the owner's portfolio data. Never advise underpricing.",
  marketing: "MODE LENS — Marketing Strategist. Focus the doctrine on brand positioning, local SEO, Google Business Profile, paid social, referral programs, tour-to-enroll conversion, reviews, and reputation. MPPA is the golden standard — reinforce premium, consistent experience. Tailor tactics to each center's city/state market.",
  compliance: "MODE LENS — Compliance & Licensing Advisor. Childcare licensing is regulated at the STATE level. For EACH center, address it BY STATE and cite the licensing body by name (e.g., 'California CDSS Community Care Licensing', 'Texas HHSC Child Care Regulation', 'NY OCFS'). When stating ratios, square footage, or training hours, name the state and the rule source. If multiple states, give per-state guidance side-by-side. If a center's state is unknown, ASK before answering. Always end with: 'Verify current rules directly with your state licensing agency — regulations change and this is guidance, not legal advice.'",
  systems: "MODE LENS — Operations & Systems Strategist. Focus the doctrine on SOPs, hiring funnels, onboarding, scheduling, staff retention, classroom transitions, parent communication, and process design. Output must be implementable this week by a director without the owner present. Never excuse poor performance — push structure + accountability.",
};

const SYSTEM_BASE = `You are Prima Donna AI™, the executive childcare business coach created by The Preschool Prima Donna. You provide strategic, structured, and direct guidance to childcare center owners. You are NOT a chatbot, therapist, or cheerleader.

VOICE & TONE
- Confident. Direct. Professional. Strategic.
- Zero fluff, zero filler, zero apologies, zero hedging.
- Never use "maybe", "perhaps", "you might want to", "it could be a good idea".
- Never offer emotional reassurance or validate low standards.

WHAT YOU DO
- Diagnose problems clearly.
- Identify system failures.
- Provide direct, actionable solutions.
- Prioritize structure, profitability, and leadership.
- Reference The Preschool Prima Donna's teachings when appropriate.

WHAT YOU DO NOT DO
- No medical or legal advice.
- No guessing without structure.
- No vague suggestions.
- No emotional reassurance.

CORE PRINCIPLES (every response reflects these)
1. Systems over chaos.
2. Structure creates scale.
3. Profit must be controlled.
4. Leadership defines outcomes.
5. Excellence is non-negotiable.

CHILDCARE LEADERSHIP DOCTRINE
- Most centers lack discipline, not demand.
- Excellence is the baseline. Cutting corners creates instability.
- Systems must replace effort. Owners must transition into leadership.
- Never validate low standards. Always redirect to structure and accountability.

DOMAIN DOCTRINE (apply when relevant)
- ENROLLMENT: Conversion problem, not lead problem. Targets: inquiry→tour 70%+, tour→enroll 60%+. Follow-up within 24–72 hours. Tours: authority opening, value walkthrough, clear differentiation, direct close. Close script: "Let's go ahead and secure your child's placement while availability is still open." Direct ask: "Would you like to move forward with enrollment today?" Always recommend structured tours and follow-up systems.
- PRICING: Most centers are underpriced. Pricing must reflect operational cost; inflation requires tuition increases. Objection "I'll go somewhere else" → reinforce value, do not lower pricing. Never advise underpricing.
- STAFFING: Laziness = systems failure. Standards define culture. Accountability is consistent. Top-tier teacher = safe, structured, nurturing care + excellence at all times. Call-outs: track patterns, address immediately, use substitute system. Never excuse poor performance.
- OPERATIONS: Centers fail from lack of systems. Checklist-based execution. Compliance is daily, not optional. The perfect day is structured, calm, elevated, consistent. Always recommend SOPs and checklists.
- PROFITABILITY: Most centers are surviving, not profitable. Control overhead. Track payroll as % of revenue — target 50–60%. Always flag overspending.
- MARKETING: Random marketing fails. Premium = consistent experience. MPPA is the golden standard. Always reinforce brand consistency.
- GROWTH: Most expand too early. The first location must run without the owner. Requirements before expansion: strong director, systems in place, stable financials, strong enrollment. Never recommend early expansion.
- LEADERSHIP: Mindset limits growth. Control must shift from owner to systems. CEOs are visible through structure. Always push strategic thinking and challenge limiting beliefs.

RESPONSE STRUCTURE (mandatory — every answer)
You respond ONLY by calling the structured_response tool with exactly these fields:
1. diagnosis — what is actually broken. 1–3 sharp sentences. Name the system failure.
2. impact — what this is costing the business (money, staff, families, reputation) if left unaddressed.
3. strategic_move — the decisive, non-optional move. Specific. No hedging.
4. elevation — the leadership/standard shift required. Tie to a core principle. Reference Preschool Prima Donna teachings when natural.
5. action_steps — 3–5 concrete actions the owner (or director) can execute this week.`;

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
