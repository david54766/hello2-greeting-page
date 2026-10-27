import { z } from "zod";

// Website-only adult self-attestation. Separate from TERMS_VERSION / PRIVACY_VERSION,
// which native clients rely on and must not change here.
export const ADULT_ATTESTATION_VERSION = "2026-10-26.v1";
export const ADULT_ATTESTATION_STATEMENT =
  "I am 18 or older and authorized to represent this business.";

export const WebsiteSignupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(200),
  businessName: z.string().trim().min(1).max(200),
  // Only self-serve tiers; Elite stays invitation-only.
  tier: z.enum(["essentials", "pro"]),
  termsVersion: z.string().min(1).max(64),
  privacyVersion: z.string().min(1).max(64),
  // Literal boolean true only — false, missing, "true", 1 are all rejected.
  adultAttestation: z.literal(true),
  redirectTo: z.string().url().max(500),
});

export type WebsiteSignupInput = z.infer<typeof WebsiteSignupSchema>;

export type SignupDeps = {
  signUp: (args: {
    email: string;
    password: string;
    metadata: Record<string, string>;
    redirectTo: string;
  }) => Promise<{
    userId: string | null;
    isNewIdentity: boolean;
    session: { access_token: string; refresh_token: string } | null;
    error: string | null;
  }>;
  recordAttestation: (row: {
    user_id: string;
    attestation_version: string;
    statement: string;
    platform: "web";
  }) => Promise<{ error: string | null }>;
  updateProfile: (userId: string, p: { full_name: string; business_name: string }) => Promise<void>;
};

export type SignupResult =
  | { ok: true; session: { access_token: string; refresh_token: string } | null }
  | { ok: false; message: string };

export async function performWebsiteSignup(raw: unknown, deps: SignupDeps): Promise<SignupResult> {
  const parsed = WebsiteSignupSchema.safeParse(raw);
  if (!parsed.success) {
    const attest = parsed.error.issues.some((i) => i.path[0] === "adultAttestation");
    return {
      ok: false,
      message: attest
        ? "Confirm you are 18 or older and authorized to represent this business."
        : "Please check your details and try again.",
    };
  }
  const d = parsed.data;
  const res = await deps.signUp({
    email: d.email,
    password: d.password,
    redirectTo: d.redirectTo,
    // No role/tier escalation: tier limited to essentials|pro, no elite_invited flag.
    metadata: {
      full_name: d.fullName,
      intended_tier: d.tier,
      terms_version: d.termsVersion,
      privacy_version: d.privacyVersion,
    },
  });
  if (res.error) return { ok: false, message: res.error };
  // Existing email (obfuscated response): never record an attestation for it.
  if (!res.userId || !res.isNewIdentity) return { ok: true, session: null };

  // Server timestamp comes from the column default (now()).
  const att = await deps.recordAttestation({
    user_id: res.userId,
    attestation_version: ADULT_ATTESTATION_VERSION,
    statement: ADULT_ATTESTATION_STATEMENT,
    platform: "web",
  });
  if (att.error) {
    return {
      ok: false,
      message: "Your account was created but we could not save your confirmation. Contact info@classroompanda.com.",
    };
  }
  await deps.updateProfile(res.userId, { full_name: d.fullName, business_name: d.businessName });
  return { ok: true, session: res.session };
}
