import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIREBASE_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const pushInput = z.object({
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(3).max(240),
  audience: z.enum(["all", "essentials", "pro", "elite"]).default("all"),
  preferenceKey: z.enum(["push_alerts", "email_brief", "elite_reminders", "ai_product_updates"]).default("push_alerts"),
  link: z.string().trim().max(300).optional(),
});

type PreferenceKey = z.infer<typeof pushInput>["preferenceKey"];
type Audience = z.infer<typeof pushInput>["audience"];

type PushTokenRow = {
  token: string;
  user_id: string;
};

type PreferenceRow = {
  user_id: string;
  email_brief: boolean | null;
  elite_reminders: boolean | null;
  ai_product_updates: boolean | null;
  push_alerts: boolean | null;
};

type SubscriptionRow = {
  user_id: string;
  tier: string | null;
};

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

function firebaseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      projectId: parsed.project_id as string,
      clientEmail: parsed.client_email as string,
      privateKey: parsed.private_key as string,
    };
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  };
}

function base64Url(input: string | Uint8Array | ArrayBuffer) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);

  let base64: string;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    base64 = btoa(binary);
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToBytes(pem: string) {
  const normalized = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(normalized, "base64"));
  }

  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signJwt(privateKey: string, clientEmail: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: FIREBASE_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  const encoded = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(encoded),
  );
  return `${encoded}.${base64Url(signature)}`;
}

async function firebaseAccessToken() {
  const config = firebaseServiceAccount();
  if (!config.projectId || !config.clientEmail || !config.privateKey) {
    throw new Error("Firebase service account is not configured.");
  }

  const assertion = await signJwt(config.privateKey, config.clientEmail);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await response.json() as { access_token?: string; error_description?: string; error?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Firebase authorization failed.");
  }

  return { accessToken: json.access_token, projectId: config.projectId };
}

function allowedByPreference(row: PreferenceRow | undefined, key: PreferenceKey) {
  const pushAlerts = row?.push_alerts ?? true;
  if (!pushAlerts) return false;
  if (key === "push_alerts") return true;
  if (key === "email_brief") return row?.email_brief ?? true;
  if (key === "elite_reminders") return row?.elite_reminders ?? true;
  return row?.ai_product_updates ?? false;
}

function allowedByAudience(tier: string | undefined | null, audience: Audience, key: PreferenceKey) {
  if (key === "elite_reminders" && tier !== "elite") return false;
  if (audience === "all") return true;
  return tier === audience;
}

async function sendFcmMessage(args: {
  accessToken: string;
  projectId: string;
  token: string;
  title: string;
  body: string;
  preferenceKey: PreferenceKey;
  link?: string;
}) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${args.projectId}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: args.token,
        notification: {
          title: args.title,
          body: args.body,
        },
        data: {
          category: args.preferenceKey,
          link: args.link ?? "",
        },
        android: {
          priority: "NORMAL",
          notification: {
            channel_id: "prima_donna_updates",
            color: "#E6008D",
          },
        },
      },
    }),
  });

  if (response.ok) return { ok: true, error: null as string | null };
  const text = await response.text();
  return { ok: false, error: text.slice(0, 500) };
}

export const sendPushNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => pushInput.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await assertAdmin(context.userId))) {
      return { ok: false, message: "Forbidden", sent: 0, failed: 0, skipped: 0 };
    }

    const db = supabaseAdmin as any;
    const { data: tokens, error: tokenError } = await db
      .from("push_tokens")
      .select("token,user_id")
      .eq("enabled", true)
      .eq("platform", "android");

    if (tokenError) {
      return { ok: false, message: tokenError.message, sent: 0, failed: 0, skipped: 0 };
    }

    const tokenRows = (tokens ?? []) as PushTokenRow[];
    if (tokenRows.length === 0) {
      return { ok: false, message: "No registered Android push tokens found.", sent: 0, failed: 0, skipped: 0 };
    }

    const userIds = Array.from(new Set(tokenRows.map((row) => row.user_id)));
    const [{ data: prefs }, { data: subs }] = await Promise.all([
      db.from("notification_preferences").select("user_id,email_brief,elite_reminders,ai_product_updates,push_alerts").in("user_id", userIds),
      db.from("subscriptions").select("user_id,tier").in("user_id", userIds),
    ]);

    const prefMap = new Map((prefs ?? []).map((row: PreferenceRow) => [row.user_id, row]));
    const tierMap = new Map((subs ?? []).map((row: SubscriptionRow) => [row.user_id, row.tier]));
    const targets = tokenRows.filter((row) =>
      allowedByPreference(prefMap.get(row.user_id), data.preferenceKey) &&
      allowedByAudience(tierMap.get(row.user_id), data.audience, data.preferenceKey)
    );
    const skipped = tokenRows.length - targets.length;

    if (targets.length === 0) {
      await db.from("push_notification_deliveries").insert({
        admin_user_id: context.userId,
        title: data.title,
        body: data.body,
        audience: data.audience,
        preference_key: data.preferenceKey,
        sent_count: 0,
        failed_count: 0,
        skipped_count: skipped,
        error_summary: "No tokens matched the selected audience/preferences.",
      });
      return { ok: false, message: "No users matched that audience and notification preference.", sent: 0, failed: 0, skipped };
    }

    try {
      const { accessToken, projectId } = await firebaseAccessToken();
      const results = await Promise.all(targets.map((target) =>
        sendFcmMessage({
          accessToken,
          projectId,
          token: target.token,
          title: data.title,
          body: data.body,
          preferenceKey: data.preferenceKey,
          link: data.link,
        })
      ));
      const sent = results.filter((result) => result.ok).length;
      const failed = results.length - sent;
      const errorSummary = results.find((result) => !result.ok)?.error ?? null;

      await db.from("push_notification_deliveries").insert({
        admin_user_id: context.userId,
        title: data.title,
        body: data.body,
        audience: data.audience,
        preference_key: data.preferenceKey,
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped,
        error_summary: errorSummary,
      });

      return {
        ok: failed === 0,
        message: failed === 0 ? "Push notification sent." : "Push sent to some devices; a few failed.",
        sent,
        failed,
        skipped,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Push send failed.";
      await db.from("push_notification_deliveries").insert({
        admin_user_id: context.userId,
        title: data.title,
        body: data.body,
        audience: data.audience,
        preference_key: data.preferenceKey,
        sent_count: 0,
        failed_count: targets.length,
        skipped_count: skipped,
        error_summary: message,
      });
      return { ok: false, message, sent: 0, failed: targets.length, skipped };
    }
  });
