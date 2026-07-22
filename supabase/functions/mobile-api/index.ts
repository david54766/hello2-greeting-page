import { createClient } from 'npm:@supabase/supabase-js@2.106.0';
import { assessCoachingPrompt } from '../_shared/coaching-input-quality.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SupabaseClient = ReturnType<typeof createClient>;
type MobileContext = { supabase: SupabaseClient; userId: string };
type StructuredResponse = {
  diagnosis: string;
  impact: string;
  strategic_move: string;
  elevation: string;
  action_steps: string[];
};

const MODE_PROMPTS: Record<string, string> = {
  ceo: 'CEO Strategist. Focus on leadership, owner leverage, decisions, time allocation, org design, and high-leverage moves. Tie every answer to what only the owner can do.',
  revenue: 'Revenue Strategist. Focus on tuition pricing, enrollment funnel math, waitlist conversion, retention, ancillary revenue, discount policy, and unit economics. Quantify the move when data is available.',
  marketing: 'Marketing Strategist. Focus on positioning, local SEO, Google Business Profile, paid social, referrals, tour-to-enroll conversion, reviews, and reputation.',
  compliance: 'Compliance and Licensing Advisor. Childcare licensing is state-specific. Name the state agency when possible and end with a reminder to verify current rules directly with the state licensing agency.',
  systems: 'Operations and Systems Strategist. Focus on SOPs, hiring, onboarding, scheduling, staff retention, classroom transitions, parent communication, and process design.',
};

const SYSTEM_BASE = `You are Prima Donna AI, the executive childcare business coach created by The Preschool Prima Donna. You provide strategic, structured, direct guidance to childcare center owners.

VOICE
- Confident. Direct. Professional. Strategic.
- No fluff, filler, apologies, or hedging.
- Do not use maybe, perhaps, or you might want to.

CORE PRINCIPLES
1. Systems over chaos.
2. Structure creates scale.
3. Profit must be controlled.
4. Leadership defines outcomes.
5. Excellence is non-negotiable.

DOMAIN DOCTRINE
- Enrollment is usually a conversion and follow-up problem, not only a lead problem. Tour follow-up must happen within 24 to 72 hours.
- Pricing must reflect operational cost. Never advise underpricing.
- Staff issues require standards, accountability, and systems.
- Operations require checklists, SOPs, and daily compliance rhythm.
- Expansion should wait until the first location runs without the owner.

Return only through the structured_response tool with diagnosis, impact, strategic_move, elevation, and 3 to 5 action_steps.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const context = await getContext(req);
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const data = isObject(body.data) ? body.data : {};

    if (action === 'run_coaching') return jsonResponse(await runCoaching(context, data));
    if (action === 'synthesize_raven_voice') return jsonResponse(await synthesizeRavenVoice(data));

    await requireEliteAccess(context);
    switch (action) {
      case 'list_elite_threads':
        return jsonResponse(await listEliteThreads(context));
      case 'create_elite_thread':
        return jsonResponse(await createEliteThread(context, data));
      case 'get_elite_thread':
        return jsonResponse(await getEliteThread(context, data));
      case 'reply_elite_thread':
        return jsonResponse(await replyEliteThread(context, data));
      case 'delete_elite_thread':
        return jsonResponse(await deleteEliteThread(context, data));
      case 'list_raven_slots':
        return jsonResponse({ slots: [], timezone: null, disabled: true });
      case 'list_raven_bookings':
        return jsonResponse({ bookings: [], disabled: true });
      case 'book_raven_slot':
      case 'cancel_raven_booking':
        return jsonResponse({ ok: false, message: 'Elite meeting scheduling has been removed.' }, 410);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const status = message === 'Unauthorized' ? 401 : message === 'Elite access required' ? 403 : 400;
    return jsonResponse({ error: message }, status);
  }
});

async function getContext(req: Request): Promise<MobileContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment is not configured');

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!token) throw new Error('Unauthorized');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) throw new Error('Unauthorized');
  return { supabase, userId: data.user.id };
}

async function requireEliteAccess({ supabase, userId }: MobileContext) {
  const [subscription, role] = await Promise.all([
    supabase.from('subscriptions').select('tier,status').eq('user_id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
  ]);
  const isElite = subscription.data?.tier === 'elite' && subscription.data?.status === 'active';
  const isAdmin = !!role.data;
  if (!isElite && !isAdmin) throw new Error('Elite access required');
}

async function runCoaching({ supabase, userId }: MobileContext, data: Record<string, unknown>) {
  const mode = readMode(data.mode);
  const prompt = readString(data.prompt, 'prompt', 3, 4000);
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return { ok: false, error: 'AI strategy key is not configured.' };

  let quality;
  try {
    quality = await assessCoachingPrompt(prompt, mode, apiKey);
  } catch (error) {
    console.error('OpenAI coaching quality check error', error);
    return {
      ok: false,
      code: 'prompt_quality_unavailable',
      error: 'Raven could not validate that question. Please add specific context and try again.',
    };
  }
  if (quality.status !== 'actionable') {
    return {
      ok: false,
      code: 'prompt_needs_clarification',
      error: quality.message ?? 'Raven needs more context before giving you a strategy.',
    };
  }

  const [{ data: profile }, { data: centers }, { data: revenueProfile }] = await Promise.all([
    supabase.from('profiles').select('full_name, business_name, state').eq('id', userId).maybeSingle(),
    supabase.from('centers').select('id, name, city, state, enrollment_size, capacity, tuition_range, staff_count, ages_served, notes').eq('user_id', userId).order('created_at', { ascending: true }),
    mode === 'revenue'
      ? supabase.from('revenue_profiles').select('*').eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ownerLine = profile
    ? `Owner: ${profile.full_name ?? '(unnamed)'}. Business: ${profile.business_name ?? '(unnamed)'}${profile.state ? ` (${profile.state})` : ''}.`
    : 'No owner profile on file yet.';
  const centerBlock = centers && centers.length
    ? centers.map((center: any, index: number) => `Center ${index + 1}: ${center.name}${center.city ? `, ${center.city}` : ''}${center.state ? `, ${center.state}` : ''}. Enrollment ${center.enrollment_size ?? 'n/a'}/${center.capacity ?? 'n/a'}. Tuition ${center.tuition_range ?? 'n/a'}. Staff ${center.staff_count ?? 'n/a'}. Ages ${center.ages_served ?? 'n/a'}.${center.notes ? ` Notes: ${center.notes}` : ''}`).join('\n')
    : 'No centers registered yet. Guidance will be general until the owner adds centers in Settings.';
  const revenueBlock = mode === 'revenue'
    ? (!revenueProfile || (revenueProfile as any).skipped
      ? '\n\nREVENUE CONTEXT: Owner has not completed the Revenue Mode setup wizard. Tell them to complete it, then provide general guidance from portfolio data.'
      : `\n\nREVENUE CONTEXT: ${JSON.stringify(revenueProfile)}`)
    : '';

  const messages = [
    { role: 'system', content: `${SYSTEM_BASE}\n\nMODE: ${MODE_PROMPTS[mode]}\n\nOWNER CONTEXT:\n${ownerLine}\n\nPORTFOLIO (${centers?.length ?? 0} center${centers?.length === 1 ? '' : 's'}):\n${centerBlock}${revenueBlock}` },
    { role: 'user', content: prompt },
  ];
  const tools = [{
    type: 'function',
    function: {
      name: 'structured_response',
      description: 'Return the structured executive coaching response.',
      parameters: {
        type: 'object',
        properties: {
          diagnosis: { type: 'string' },
          impact: { type: 'string' },
          strategic_move: { type: 'string' },
          elevation: { type: 'string' },
          action_steps: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
        },
        required: ['diagnosis', 'impact', 'strategic_move', 'elevation', 'action_steps'],
        additionalProperties: false,
      },
    },
  }];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: { type: 'function', function: { name: 'structured_response' } },
    }),
  });
  if (res.status === 429) return { ok: false, error: 'Rate limit reached. Try again in a moment.' };
  if (res.status === 402) return { ok: false, error: 'OpenAI credits exhausted. Check API billing.' };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('OpenAI coaching error', res.status, text);
    return { ok: false, error: 'Strategist temporarily unavailable.' };
  }

  const aiJson = await res.json();
  const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return { ok: false, error: 'No structured response returned.' };

  let parsed: StructuredResponse;
  try {
    parsed = JSON.parse(call.function.arguments);
  } catch {
    return { ok: false, error: 'Malformed strategy response.' };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('coaching_sessions')
    .insert({ user_id: userId, mode, prompt, response: parsed })
    .select('id, mode, prompt, response, created_at')
    .maybeSingle();
  if (insertError) return { ok: false, error: insertError.message };

  await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'coaching_session',
    metadata: { mode, source: 'mobile' },
  });
  return { ok: true, response: parsed, session: inserted };
}

async function synthesizeRavenVoice(data: Record<string, unknown>) {
  const text = readString(data.text, 'text', 1, 5000);
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) return { ok: false, error: 'Raven voice is not configured.' };

  const voiceId = Deno.env.get('ELEVENLABS_RAVEN_VOICE_ID') || 'EcNmy6NxONUCla9ZNPCn';
  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
      }),
    },
  );

  if (upstream.status === 429) return { ok: false, error: 'Raven voice rate limit reached. Try again shortly.' };
  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => '');
    console.error('ElevenLabs TTS error', upstream.status, errorText.slice(0, 300));
    return { ok: false, error: 'Raven voice is temporarily unavailable.' };
  }

  const audio = new Uint8Array(await upstream.arrayBuffer());
  return {
    ok: true,
    mime_type: 'audio/mpeg',
    audio_base64: bytesToBase64(audio),
  };
}

async function listEliteThreads({ supabase }: MobileContext) {
  const { data, error } = await supabase
    .from('elite_threads')
    .select('id, user_id, title, body, image_urls, pinned, created_at, updated_at')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((data ?? []).map((thread: any) => thread.user_id).filter(Boolean)));
  const names = await loadProfileNames(supabase, ids);
  const replyCounts = await countReplies(supabase);
  return { threads: (data ?? []).map((thread: any) => ({ ...thread, image_urls: thread.image_urls ?? [], author_name: names[thread.user_id] ?? 'Member', reply_count: replyCounts[thread.id] ?? 0 })) };
}

async function createEliteThread({ supabase, userId }: MobileContext, data: Record<string, unknown>) {
  const title = readString(data.title, 'title', 3, 200);
  const body = readString(data.body, 'body', 1, 10000);
  const imageUrls = readImageUrls(data.image_urls);
  const { data: row, error } = await supabase.from('elite_threads').insert({ user_id: userId, title, body, image_urls: imageUrls }).select('id').single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, id: row.id };
}

async function getEliteThread({ supabase }: MobileContext, data: Record<string, unknown>) {
  const id = readUuid(data.id, 'id');
  const { data: thread, error } = await supabase.from('elite_threads').select('id, user_id, title, body, image_urls, pinned, created_at, updated_at').eq('id', id).maybeSingle();
  if (error || !thread) throw new Error(error?.message ?? 'Not found');
  const { data: replies } = await supabase.from('elite_thread_replies').select('id, user_id, body, image_urls, created_at').eq('thread_id', id).order('created_at', { ascending: true });
  const ids = Array.from(new Set([thread.user_id, ...(replies ?? []).map((reply: any) => reply.user_id)].filter(Boolean)));
  const names = await loadProfileNames(supabase, ids);
  return {
    thread: { ...thread, image_urls: (thread as any).image_urls ?? [], author_name: names[(thread as any).user_id] ?? 'Member' },
    replies: (replies ?? []).map((reply: any) => ({ ...reply, image_urls: reply.image_urls ?? [], author_name: names[reply.user_id] ?? 'Member' })),
  };
}

async function replyEliteThread({ supabase, userId }: MobileContext, data: Record<string, unknown>) {
  const threadId = readUuid(data.thread_id, 'thread_id');
  const body = readString(data.body, 'body', 1, 10000);
  const imageUrls = readImageUrls(data.image_urls);
  const { error } = await supabase.from('elite_thread_replies').insert({ thread_id: threadId, user_id: userId, body, image_urls: imageUrls });
  if (error) return { ok: false, message: error.message };
  await supabase.from('elite_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  return { ok: true };
}

async function deleteEliteThread({ supabase, userId }: MobileContext, data: Record<string, unknown>) {
  const id = readUuid(data.id, 'id');
  const { error } = await supabase.from('elite_threads').delete().eq('id', id).eq('user_id', userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function loadProfileNames(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return {};
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  return Object.fromEntries((data ?? []).map((profile: any) => [profile.id, profile.full_name ?? 'Member']));
}

async function countReplies(supabase: SupabaseClient) {
  const { data } = await supabase.from('elite_thread_replies').select('thread_id');
  const tally: Record<string, number> = {};
  (data ?? []).forEach((reply: any) => { tally[reply.thread_id] = (tally[reply.thread_id] ?? 0) + 1; });
  return tally;
}

function readMode(value: unknown): string {
  const mode = String(value ?? 'ceo').trim().toLowerCase();
  if (mode === 'strategy') return 'ceo';
  if (mode in MODE_PROMPTS) return mode;
  throw new Error('mode is invalid');
}

function readString(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new Error(`${name} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new Error(`${name} is invalid`);
  return trimmed;
}

function readUuid(value: unknown, name: string): string {
  const uuid = readString(value, name, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) throw new Error(`${name} is invalid`);
  return uuid;
}

function readImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length <= 1000).filter((item) => {
    try { new URL(item); return true; } catch { return false; }
  }).slice(0, 8);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
