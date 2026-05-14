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
  ceo: "You are a CEO-level strategic advisor for childcare center owners. Focus on vision, leadership decisions, time allocation, and high-leverage moves.",
  revenue: "You are a revenue strategist for childcare centers. Focus on pricing, enrollment funnels, retention, ancillary revenue, and unit economics.",
  marketing: "You are a marketing strategist for childcare centers. Focus on brand, local marketing, parent acquisition funnels, conversion, and reputation.",
  compliance: "You are a compliance and licensing advisor for childcare centers. Focus on state regulations, ratios, documentation, audits, and policies. Always note that responses are guidance, not legal advice, and the owner should verify with their state agency.",
  systems: "You are an operations strategist for childcare centers. Focus on SOPs, hiring, scheduling, staff retention, and process design.",
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, state, enrollment_size, tuition_range, staff_count")
      .eq("id", userId)
      .maybeSingle();

    const memory = profile
      ? `Center: ${profile.business_name ?? "(unnamed)"}, State: ${profile.state ?? "n/a"}, Enrollment: ${profile.enrollment_size ?? "n/a"}, Tuition range: ${profile.tuition_range ?? "n/a"}, Staff: ${profile.staff_count ?? "n/a"}.`
      : "No business profile on file yet.";

    const messages = [
      { role: "system", content: `${SYSTEM_BASE}\n\nMODE: ${MODE_PROMPTS[data.mode]}\n\nOWNER CONTEXT: ${memory}` },
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

export const getDailyRecommendation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { recommendation: "Connect AI to receive today's strategic move." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, state, enrollment_size, tuition_range, staff_count")
      .eq("id", userId)
      .maybeSingle();

    const memory = profile
      ? `Center: ${profile.business_name ?? "(unnamed)"}, State: ${profile.state ?? "n/a"}, Enrollment: ${profile.enrollment_size ?? "n/a"}, Tuition: ${profile.tuition_range ?? "n/a"}, Staff: ${profile.staff_count ?? "n/a"}.`
      : "No business profile yet.";

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
    if (!res.ok) return { recommendation: "Audit your top 3 enrollment leads from the past 7 days. Which one have you not yet personally called?" };
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim() ?? "Make one decision today that your future self will thank you for.";
    return { recommendation: text };
  });
