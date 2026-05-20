import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TIER_DAILY_LIMITS: Record<string, number> = {
  essentials: 3,
  pro: 15,
  elite: 50,
};

const SYSTEM_VISUAL = `You are a visual asset generator for Prima Donna AI™, an executive childcare business coach. Generate ONE clean, branded illustration that helps a childcare center owner understand a concept (e.g. a sample marketing flyer, a simple org chart, a tuition tier card, a classroom layout sketch, a workflow diagram).

Style rules:
- Polished, premium, brand-aligned. Soft rose / crimson accents, clean typography, lots of whitespace.
- Realistic and usable — NOT cartoonish or generic clipart.
- Any text in the image MUST be spelled correctly and legible.
- No real children's faces. No copyrighted logos.
- If the user asks for something off-topic (memes, unrelated art, people portraits), refuse by generating a plain card that says "Visual examples are limited to childcare business concepts."`;

async function getDailyImageUsage(supabase: any, userId: string): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "coach_image")
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

export const getImageQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = (sub?.tier as string) ?? "essentials";
    const limit = TIER_DAILY_LIMITS[tier] ?? TIER_DAILY_LIMITS.essentials;
    const used = await getDailyImageUsage(supabase, userId);
    return { tier, used, limit, remaining: Math.max(0, limit - used) };
  });

export const generateCoachImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      prompt: z.string().min(4).max(800),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { error: "Image service not configured." as const, image: null, remaining: 0 };

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = (sub?.tier as string) ?? "essentials";
    const limit = TIER_DAILY_LIMITS[tier] ?? TIER_DAILY_LIMITS.essentials;
    const used = await getDailyImageUsage(supabase, userId);
    if (used >= limit) {
      return {
        error: `Daily image limit reached (${limit}/day for ${tier}). Resets at midnight UTC.` as const,
        image: null,
        remaining: 0,
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "system", content: SYSTEM_VISUAL },
          { role: "user", content: data.prompt },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) return { error: "Rate limit reached. Try again shortly." as const, image: null, remaining: limit - used };
    if (res.status === 402) return { error: "AI credits exhausted." as const, image: null, remaining: limit - used };
    if (!res.ok) {
      const t = await res.text();
      console.error("Image gateway error", res.status, t);
      return { error: "Image generator temporarily unavailable." as const, image: null, remaining: limit - used };
    }

    const json = await res.json();
    const imageUrl: string | undefined =
      json.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      json.choices?.[0]?.message?.images?.[0]?.url;

    if (!imageUrl) {
      console.error("No image returned", JSON.stringify(json).slice(0, 500));
      return { error: "No image returned." as const, image: null, remaining: limit - used };
    }

    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "coach_image",
      metadata: { prompt_preview: data.prompt.slice(0, 120) },
    });

    return {
      error: null,
      image: imageUrl,
      remaining: Math.max(0, limit - used - 1),
    };
  });
