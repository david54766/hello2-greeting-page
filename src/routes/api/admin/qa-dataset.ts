import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import type { Database, Json } from "@/integrations/supabase/types";

type Tier = Database["public"]["Enums"]["subscription_tier"];
type CoachingMode = Database["public"]["Enums"]["coaching_mode"];

type CenterSeed = {
  name: string;
  city: string;
  state: string;
  enrollment: number;
  capacity: number;
  weeklyTuition: number;
  staff: number;
};

type Persona = {
  slug: string;
  displayName: string;
  businessName: string;
  tier: Tier;
  purpose: string;
  timezone: string;
  centers: CenterSeed[];
};

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("seed"),
    batchKey: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9_-]{5,47}$/),
    password: z.string().min(12).max(128),
  }),
  z.object({
    action: z.literal("cleanup"),
    batchKey: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9_-]{5,47}$/),
  }),
]);

const PERSONAS: Persona[] = [
  {
    slug: "qa.essentials",
    displayName: "Avery Essentials",
    businessName: "[QA] Little Steps Learning Center",
    tier: "essentials",
    purpose: "Essentials feature and access-control testing",
    timezone: "America/New_York",
    centers: [
      {
        name: "[QA] Little Steps - Raleigh",
        city: "Raleigh",
        state: "NC",
        enrollment: 58,
        capacity: 72,
        weeklyTuition: 285,
        staff: 14,
      },
    ],
  },
  {
    slug: "qa.pro",
    displayName: "Parker Pro",
    businessName: "[QA] Bright Futures Academy",
    tier: "pro",
    purpose: "Pro coaching, vault, and revenue workflow testing",
    timezone: "America/Chicago",
    centers: [
      {
        name: "[QA] Bright Futures - Austin",
        city: "Austin",
        state: "TX",
        enrollment: 91,
        capacity: 115,
        weeklyTuition: 325,
        staff: 21,
      },
    ],
  },
  {
    slug: "qa.elite",
    displayName: "Emerson Elite",
    businessName: "[QA] Magnolia Early Learning",
    tier: "elite",
    purpose: "Elite Circle conversation and full-feature testing",
    timezone: "America/New_York",
    centers: [
      {
        name: "[QA] Magnolia - Atlanta",
        city: "Atlanta",
        state: "GA",
        enrollment: 104,
        capacity: 132,
        weeklyTuition: 310,
        staff: 24,
      },
    ],
  },
  {
    slug: "qa.multicenter",
    displayName: "Morgan Multi-Center",
    businessName: "[QA] Growing Minds Group",
    tier: "pro",
    purpose: "Multi-center carousel, center switching, and portfolio testing",
    timezone: "America/Chicago",
    centers: [
      {
        name: "[QA] Growing Minds - Dallas",
        city: "Dallas",
        state: "TX",
        enrollment: 87,
        capacity: 104,
        weeklyTuition: 300,
        staff: 19,
      },
      {
        name: "[QA] Growing Minds - Plano",
        city: "Plano",
        state: "TX",
        enrollment: 76,
        capacity: 96,
        weeklyTuition: 315,
        staff: 17,
      },
    ],
  },
  {
    slug: "appreview",
    displayName: "App Review Tester",
    businessName: "[QA] Prima Donna App Review Center",
    tier: "elite",
    purpose: "Store reviewer account with complete product access",
    timezone: "America/Los_Angeles",
    centers: [
      {
        name: "[QA] App Review Center",
        city: "Cupertino",
        state: "CA",
        enrollment: 86,
        capacity: 110,
        weeklyTuition: 390,
        staff: 20,
      },
    ],
  },
];

function json(value: unknown): Json {
  return value as Json;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function qaEmail(persona: Persona, batchKey: string): string {
  return `${persona.slug}.${batchKey}@thepreschoolprimadonna.com`;
}

function fail(message: string): never {
  throw new Error(message);
}

async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: adminRole, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !adminRole) return null;
  return data.user;
}

async function logRecord(
  batchId: string,
  accountId: string,
  tableName: string,
  recordId: string | null,
  summary: Record<string, Json | undefined>,
) {
  const cleanSummary = Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== undefined),
  ) as Json;
  const { error } = await supabaseAdmin.from("qa_seed_records").insert({
    batch_id: batchId,
    account_id: accountId,
    table_name: tableName,
    record_id: recordId,
    summary: cleanSummary,
  });
  if (error) fail(`Could not log ${tableName}: ${error.message}`);
}

function coachingSeeds(persona: Persona): Array<{
  mode: CoachingMode;
  prompt: string;
  response: Json;
  created_at: string;
}> {
  const firstCenter = persona.centers[0];
  const openSeats = firstCenter.capacity - firstCenter.enrollment;
  return [
    {
      mode: "ceo",
      prompt: "How can I build a tighter weekly leadership scorecard for my director?",
      response: json({
        diagnosis:
          "The center is reviewing outcomes after problems appear instead of using a short weekly operating rhythm to spot risk early.",
        impact:
          "Without a consistent scorecard, open seats, staffing pressure, collections, and family concerns compete for attention and corrective action is delayed.",
        strategic_move:
          "Install a 30-minute Monday scorecard meeting with one owner for each metric and a written recovery action for every missed target.",
        elevation:
          "Lead from visible standards. A metric only creates accountability when it has an owner, a target, and a due date.",
        action_steps: [
          "Track enrollment, tours, conversion rate, attendance, staffing gaps, past-due tuition, and family escalations.",
          "Set a weekly target and named owner for every metric.",
          "Require a one-sentence recovery plan for each red metric.",
          "Review unresolved actions before opening the next scorecard meeting.",
        ],
      }),
      created_at: daysAgo(8),
    },
    {
      mode: "revenue",
      prompt: `We have ${openSeats} open seats. What should we prioritize to improve enrollment this month?`,
      response: json({
        diagnosis:
          "The immediate constraint is not licensed capacity; it is a weak conversion system between inquiry, tour, and completed enrollment.",
        impact: `At roughly $${firstCenter.weeklyTuition} per child per week, each unfilled seat represents recurring revenue that cannot be recovered later.`,
        strategic_move:
          "Run a 14-day enrollment sprint focused on response speed, scheduled tours, and same-day follow-up.",
        elevation:
          "Treat every inquiry as an operating workflow with a service-level standard, not as an informal sales task.",
        action_steps: [
          "Respond to every new inquiry within 10 minutes during business hours.",
          "Offer two specific tour times in the first response.",
          "Use a same-day tour follow-up script with a clear enrollment deadline.",
          "Review inquiry-to-tour and tour-to-enrollment conversion every Friday.",
        ],
      }),
      created_at: daysAgo(3),
    },
  ];
}

async function seedAccount(
  batchId: string,
  batchKey: string,
  password: string,
  persona: Persona,
  onAuthUserCreated: (userId: string) => void,
) {
  const email = qaEmail(persona, batchKey);
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: persona.displayName,
      intended_tier: persona.tier,
      elite_invited: persona.tier === "elite" ? "true" : "false",
      qa_batch: batchKey,
    },
  });
  if (createError || !created.user) {
    fail(`Could not create ${email}: ${createError?.message ?? "unknown Auth error"}`);
  }

  const userId = created.user.id;
  onAuthUserCreated(userId);
  const { data: account, error: accountError } = await supabaseAdmin
    .from("qa_seed_accounts")
    .insert({
      batch_id: batchId,
      auth_user_id: userId,
      email,
      display_name: persona.displayName,
      tier: persona.tier,
      purpose: persona.purpose,
    })
    .select("id")
    .single();
  if (accountError || !account) {
    fail(`Could not log account ${email}: ${accountError?.message ?? "unknown error"}`);
  }
  const accountId = account.id;

  await logRecord(batchId, accountId, "auth.users", userId, {
    email,
    confirmed: true,
    qa_batch: batchKey,
  });

  const firstCenter = persona.centers[0];
  const totalEnrollment = persona.centers.reduce((sum, center) => sum + center.enrollment, 0);
  const totalStaff = persona.centers.reduce((sum, center) => sum + center.staff, 0);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: persona.displayName,
      business_name: persona.businessName,
      state: firstCenter.state,
      enrollment_size: totalEnrollment,
      tuition_range: `$${firstCenter.weeklyTuition}/week`,
      staff_count: totalStaff,
      timezone: persona.timezone,
    })
    .eq("id", userId)
    .select("id")
    .single();
  if (profileError || !profile) fail(`Could not update ${email} profile: ${profileError?.message}`);
  await logRecord(batchId, accountId, "profiles", userId, {
    business_name: persona.businessName,
    timezone: persona.timezone,
  });

  const periodEnd = new Date(Date.now() + 90 * 86_400_000).toISOString();
  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      tier: persona.tier,
      status: "active",
      current_period_end: periodEnd,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    })
    .eq("user_id", userId)
    .select("id")
    .single();
  if (subscriptionError || !subscription) {
    fail(`Could not update ${email} subscription: ${subscriptionError?.message}`);
  }
  await logRecord(batchId, accountId, "subscriptions", subscription.id, {
    tier: persona.tier,
    status: "active",
    current_period_end: periodEnd,
  });

  const centerRows = persona.centers.map((center) => ({
    user_id: userId,
    name: center.name,
    city: center.city,
    state: center.state,
    enrollment_size: center.enrollment,
    capacity: center.capacity,
    tuition_range: `$${center.weeklyTuition}/week`,
    staff_count: center.staff,
    ages_served: "6 weeks through Pre-K",
    notes: `[QA:${batchKey}] Mock center for tester workflows. Safe to remove with the QA cleanup action.`,
  }));
  const { data: centers, error: centerError } = await supabaseAdmin
    .from("centers")
    .insert(centerRows)
    .select("id,name");
  if (centerError || !centers?.length)
    fail(`Could not create ${email} centers: ${centerError?.message}`);
  for (const center of centers) {
    await logRecord(batchId, accountId, "centers", center.id, { name: center.name });
  }

  const totalCapacity = persona.centers.reduce((sum, center) => sum + center.capacity, 0);
  const weightedTuition = Math.round(
    persona.centers.reduce((sum, center) => sum + center.weeklyTuition * center.enrollment, 0) /
      totalEnrollment,
  );
  const { data: revenueProfile, error: revenueError } = await supabaseAdmin
    .from("revenue_profiles")
    .insert({
      user_id: userId,
      scope_mode: persona.centers.length > 1 ? "portfolio" : "center",
      active_center_id: persona.centers.length > 1 ? null : centers[0].id,
      snapshot: json({
        capacity: totalCapacity,
        enrollment: totalEnrollment,
        waitlist: persona.centers.length > 1 ? 18 : 9,
        avg_weekly_tuition: weightedTuition,
        tuition_range: `$${weightedTuition - 35}-$${weightedTuition + 45}/week`,
        collection_rate: 96,
        past_due_ar: persona.centers.length > 1 ? 7800 : 3200,
      }),
      model: json({
        tuition_structure: "weekly",
        sibling_discount: "10% for the second enrolled child",
        registration_fee: "$175 non-refundable",
        subsidy_pct: 18,
        ancillary: "Summer camp, late pickup fees, and enrichment clubs",
      }),
      goals: json({
        revenue_goal: "Increase monthly recurring revenue by 15% in six months",
        raise_tuition: "maybe",
        staffing_constraints: "Lead teacher recruiting remains the primary constraint",
        target_margin: 18,
      }),
      skipped: false,
    })
    .select("id")
    .single();
  if (revenueError || !revenueProfile) {
    fail(`Could not create ${email} revenue profile: ${revenueError?.message}`);
  }
  await logRecord(batchId, accountId, "revenue_profiles", revenueProfile.id, {
    scope_mode: persona.centers.length > 1 ? "portfolio" : "center",
  });

  const { data: recommendation, error: recommendationError } = await supabaseAdmin
    .from("daily_recommendations")
    .insert({
      user_id: userId,
      for_date: dateOnly(new Date()),
      recommendation:
        "Review every open enrollment lead today. Assign an owner, a next contact time, and one specific obstacle to resolve before close of business.",
    })
    .select("id")
    .single();
  if (recommendationError || !recommendation) {
    fail(`Could not create ${email} daily recommendation: ${recommendationError?.message}`);
  }
  await logRecord(batchId, accountId, "daily_recommendations", recommendation.id, {
    for_date: dateOnly(new Date()),
  });

  const { data: coaching, error: coachingError } = await supabaseAdmin
    .from("coaching_sessions")
    .insert(coachingSeeds(persona).map((session) => ({ ...session, user_id: userId })))
    .select("id,mode");
  if (coachingError || !coaching?.length) {
    fail(`Could not create ${email} coaching sessions: ${coachingError?.message}`);
  }
  for (const session of coaching) {
    await logRecord(batchId, accountId, "coaching_sessions", session.id, { mode: session.mode });
  }

  const { data: legalAcceptance, error: legalError } = await supabaseAdmin
    .from("legal_acceptances")
    .insert({
      user_id: userId,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      platform: "android",
      app_version: `qa-seed-${batchKey}`,
      user_agent: "QA dataset provisioning endpoint",
    })
    .select("id")
    .single();
  if (legalError || !legalAcceptance) {
    fail(`Could not create ${email} legal acceptance: ${legalError?.message}`);
  }
  await logRecord(batchId, accountId, "legal_acceptances", legalAcceptance.id, {
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
  });

  const { data: cookieConsent, error: cookieError } = await supabaseAdmin
    .from("cookie_consents")
    .insert({
      user_id: userId,
      choice: "essential",
      policy_version: PRIVACY_VERSION,
      user_agent: "QA dataset provisioning endpoint",
      session_id: `qa-${batchKey}-${persona.slug}`,
    })
    .select("id")
    .single();
  if (cookieError || !cookieConsent) {
    fail(`Could not create ${email} cookie consent: ${cookieError?.message}`);
  }
  await logRecord(batchId, accountId, "cookie_consents", cookieConsent.id, {
    choice: "essential",
    policy_version: PRIVACY_VERSION,
  });

  const { data: preferences, error: preferenceError } = await supabaseAdmin
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        daily_brief: true,
        coaching_replies: true,
        elite_activity: persona.tier === "elite",
        marketing: false,
        quiet_hours_start: 21,
        quiet_hours_end: 7,
        timezone: persona.timezone,
        email_brief: true,
        elite_reminders: persona.tier === "elite",
        ai_product_updates: false,
        push_alerts: true,
      },
      { onConflict: "user_id" },
    )
    .select("user_id")
    .single();
  if (preferenceError || !preferences) {
    fail(`Could not create ${email} notification preferences: ${preferenceError?.message}`);
  }
  await logRecord(batchId, accountId, "notification_preferences", userId, {
    push_alerts: true,
    timezone: persona.timezone,
  });

  return {
    accountId,
    userId,
    email,
    displayName: persona.displayName,
    tier: persona.tier,
    purpose: persona.purpose,
  };
}

async function seedEliteConversations(
  batchId: string,
  batchKey: string,
  accounts: Awaited<ReturnType<typeof seedAccount>>[],
) {
  const elite = accounts.filter((account) => account.tier === "elite");
  if (elite.length < 2) fail("The QA dataset requires two Elite accounts.");

  const { data: threads, error: threadError } = await supabaseAdmin
    .from("elite_threads")
    .insert([
      {
        user_id: elite[0].userId,
        title: "[QA] Director weekly scorecard",
        body: "I want a tighter weekly scorecard for enrollment, family issues, staffing, and classroom quality. What should I track first?",
        image_urls: [],
        pinned: false,
        created_at: daysAgo(5),
      },
      {
        user_id: elite[1].userId,
        title: "[QA] Tour follow-up for hesitant families",
        body: "Our tours are strong, but families wait several days before deciding. What follow-up cadence is working for your centers?",
        image_urls: [],
        pinned: false,
        created_at: daysAgo(2),
      },
    ])
    .select("id,user_id,title");
  if (threadError || !threads?.length) {
    fail(`Could not create Elite conversations: ${threadError?.message}`);
  }

  for (const thread of threads) {
    const owner = accounts.find((account) => account.userId === thread.user_id);
    if (!owner) continue;
    await logRecord(batchId, owner.accountId, "elite_threads", thread.id, {
      title: thread.title,
      qa_batch: batchKey,
    });
  }

  const replies = [
    {
      thread_id: threads[0].id,
      user_id: elite[1].userId,
      body: "We use seven numbers: inquiries, tours booked, tour conversion, enrollment, staffing gaps, past-due tuition, and unresolved family concerns.",
      image_urls: [],
      created_at: daysAgo(4),
    },
    {
      thread_id: threads[1].id,
      user_id: elite[0].userId,
      body: "Our strongest sequence is a same-day recap, a next-day question, and a 72-hour enrollment deadline with one clear next step.",
      image_urls: [],
      created_at: daysAgo(1),
    },
  ];
  const { data: insertedReplies, error: replyError } = await supabaseAdmin
    .from("elite_thread_replies")
    .insert(replies)
    .select("id,user_id");
  if (replyError || !insertedReplies?.length) {
    fail(`Could not create Elite replies: ${replyError?.message}`);
  }
  for (const reply of insertedReplies) {
    const owner = accounts.find((account) => account.userId === reply.user_id);
    if (!owner) continue;
    await logRecord(batchId, owner.accountId, "elite_thread_replies", reply.id, {
      qa_batch: batchKey,
    });
  }
}

async function seedDataset(batchKey: string, password: string, adminUserId: string) {
  const { data: existingBatch, error: existingBatchError } = await supabaseAdmin
    .from("qa_seed_batches")
    .select("id,status")
    .eq("batch_key", batchKey)
    .maybeSingle();
  if (existingBatchError) fail(`Could not check QA batch: ${existingBatchError.message}`);
  if (existingBatch)
    fail(`QA batch "${batchKey}" already exists with status ${existingBatch.status}.`);

  const targetEmails = PERSONAS.map((persona) => qaEmail(persona, batchKey));
  const { data: listedUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) fail(`Could not check Auth users: ${listError.message}`);
  const conflictingEmail = listedUsers.users.find(
    (user) => user.email && targetEmails.includes(user.email.toLowerCase()),
  )?.email;
  if (conflictingEmail) fail(`Auth user ${conflictingEmail} already exists; no data was changed.`);

  const { data: batch, error: batchError } = await supabaseAdmin
    .from("qa_seed_batches")
    .insert({
      batch_key: batchKey,
      description: "Five removable QA personas for Android, iOS, and web store-review testing.",
      created_by: adminUserId,
    })
    .select("id")
    .single();
  if (batchError || !batch) fail(`Could not create QA batch: ${batchError?.message}`);

  const createdUserIds: string[] = [];
  try {
    const accounts = [];
    for (const persona of PERSONAS) {
      const account = await seedAccount(batch.id, batchKey, password, persona, (userId) => {
        createdUserIds.push(userId);
      });
      accounts.push(account);
    }
    await seedEliteConversations(batch.id, batchKey, accounts);

    const { count: recordCount, error: countError } = await supabaseAdmin
      .from("qa_seed_records")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batch.id);
    if (countError) fail(`Could not count QA records: ${countError.message}`);

    return {
      ok: true,
      action: "seed" as const,
      batchId: batch.id,
      batchKey,
      status: "active",
      accountCount: accounts.length,
      recordCount: recordCount ?? 0,
      accounts: accounts.map(({ userId: _userId, accountId: _accountId, ...account }) => account),
      passwordStored: false,
    };
  } catch (error) {
    for (const userId of createdUserIds.reverse()) {
      await supabaseAdmin.auth.admin.deleteUser(userId, false);
    }
    await supabaseAdmin.from("qa_seed_batches").update({ status: "failed" }).eq("id", batch.id);
    throw error;
  }
}

async function cleanupDataset(batchKey: string) {
  const { data: batch, error: batchError } = await supabaseAdmin
    .from("qa_seed_batches")
    .select("id,status")
    .eq("batch_key", batchKey)
    .maybeSingle();
  if (batchError) fail(`Could not load QA batch: ${batchError.message}`);
  if (!batch) fail(`QA batch "${batchKey}" was not found.`);
  if (batch.status === "removed") fail(`QA batch "${batchKey}" was already removed.`);

  const { data: accounts, error: accountError } = await supabaseAdmin
    .from("qa_seed_accounts")
    .select("id,auth_user_id,email")
    .eq("batch_id", batch.id);
  if (accountError) fail(`Could not load QA accounts: ${accountError.message}`);

  const removedAt = new Date().toISOString();
  const failures: string[] = [];
  for (const account of accounts ?? []) {
    if (!account.auth_user_id) continue;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(account.auth_user_id, false);
    if (error) failures.push(`${account.email}: ${error.message}`);
  }
  if (failures.length) {
    fail(`Cleanup stopped because Auth deletion failed: ${failures.join("; ")}`);
  }

  const { error: recordsError } = await supabaseAdmin
    .from("qa_seed_records")
    .update({ status: "removed", removed_at: removedAt })
    .eq("batch_id", batch.id);
  if (recordsError) fail(`Could not close QA record log: ${recordsError.message}`);

  const { error: accountsError } = await supabaseAdmin
    .from("qa_seed_accounts")
    .update({ status: "removed", removed_at: removedAt })
    .eq("batch_id", batch.id);
  if (accountsError) fail(`Could not close QA account log: ${accountsError.message}`);

  const { error: closeBatchError } = await supabaseAdmin
    .from("qa_seed_batches")
    .update({ status: "removed", removed_at: removedAt })
    .eq("id", batch.id);
  if (closeBatchError) fail(`Could not close QA batch: ${closeBatchError.message}`);

  return {
    ok: true,
    action: "cleanup" as const,
    batchId: batch.id,
    batchKey,
    status: "removed",
    removedAccountCount: accounts?.length ?? 0,
    removedAt,
  };
}

export const Route = createFileRoute("/api/admin/qa-dataset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await requireAdmin(request);
        if (!admin) {
          return Response.json({ ok: false, message: "Forbidden" }, { status: 403 });
        }

        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
        }
        const parsed = RequestSchema.safeParse(input);
        if (!parsed.success) {
          return Response.json(
            { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request" },
            { status: 400 },
          );
        }

        try {
          const result =
            parsed.data.action === "seed"
              ? await seedDataset(parsed.data.batchKey, parsed.data.password, admin.id)
              : await cleanupDataset(parsed.data.batchKey);
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "QA dataset operation failed";
          console.error(
            `[QA dataset] ${parsed.data.action} failed for ${parsed.data.batchKey}:`,
            message,
          );
          return Response.json({ ok: false, message }, { status: 409 });
        }
      },
    },
  },
});
