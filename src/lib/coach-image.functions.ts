import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_VISUAL = `You are a visual asset generator for Prima Donna AI™, an executive childcare business coach. Generate ONE clean, branded illustration that helps a childcare center owner understand a concept (e.g. a sample marketing flyer, a simple org chart, a tuition tier card, a classroom layout sketch, a workflow diagram).

Style rules:
- Polished, premium, brand-aligned. Soft rose / crimson accents, clean typography, lots of whitespace.
- Realistic and usable — NOT cartoonish or generic clipart.
- Any text in the image MUST be spelled correctly and legible.
- No real children's faces. No copyrighted logos.
- Only generate when the concept is genuinely clarified by a visual (flyer, layout, chart, diagram, card). If the request is off-topic or doesn't benefit from a visual, generate a plain card that says "Visual examples are reserved for concepts that benefit from a diagram or sample asset."`;

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
    if (!apiKey) return { error: "Image service not configured." as const, image: null };

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

    if (res.status === 429) return { error: "Rate limit reached. Try again shortly." as const, image: null };
    if (res.status === 402) return { error: "AI credits exhausted." as const, image: null };
    if (!res.ok) {
      const t = await res.text();
      console.error("Image gateway error", res.status, t);
      return { error: "Image generator temporarily unavailable." as const, image: null };
    }

    const json = await res.json();
    const imageUrl: string | undefined =
      json.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      json.choices?.[0]?.message?.images?.[0]?.url;

    if (!imageUrl) {
      console.error("No image returned", JSON.stringify(json).slice(0, 500));
      return { error: "No image returned." as const, image: null };
    }

    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "coach_image",
      metadata: { prompt_preview: data.prompt.slice(0, 120) },
    });

    return { error: null, image: imageUrl };
  });
