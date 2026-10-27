// @ts-ignore -- bun's built-in test runner types are not part of the app tsconfig
import { describe, expect, test } from "bun:test";
import { performWebsiteSignup, ADULT_ATTESTATION_VERSION, type SignupDeps } from "./adult-attestation";

const base = {
  email: "x@example.com",
  password: "longpassword1",
  fullName: "A",
  businessName: "B",
  tier: "pro",
  termsVersion: "2026-09-24.v1",
  privacyVersion: "2026-09-24.v1",
  redirectTo: "https://app.preschoolproai.com/dashboard",
};

function mockDeps(overrides: Partial<{ isNew: boolean }> = {}) {
  const calls = { signUp: [] as any[], attest: [] as any[] };
  const deps: SignupDeps = {
    signUp: async (a) => {
      calls.signUp.push(a);
      return { userId: "u1", isNewIdentity: overrides.isNew ?? true, session: null, error: null };
    },
    recordAttestation: async (r) => {
      calls.attest.push(r);
      return { error: null };
    },
    updateProfile: async () => {},
  };
  return { deps, calls };
}

describe("website adult attestation", () => {
  for (const [label, value] of [
    ["false", false],
    ["missing", undefined],
    ["string 'true'", "true"],
    ["number 1", 1],
  ] as const) {
    test(`rejects ${label} before account creation`, async () => {
      const { deps, calls } = mockDeps();
      const input: any = { ...base };
      if (value !== undefined) input.adultAttestation = value;
      const r = await performWebsiteSignup(input, deps);
      expect(r.ok).toBe(false);
      expect(calls.signUp.length).toBe(0);
      expect(calls.attest.length).toBe(0);
    });
  }

  test("accepts literal true and records version without client timestamp", async () => {
    const { deps, calls } = mockDeps();
    const r = await performWebsiteSignup({ ...base, adultAttestation: true, attested_at: "1999-01-01" }, deps);
    expect(r.ok).toBe(true);
    expect(calls.attest).toEqual([
      expect.objectContaining({ user_id: "u1", attestation_version: "2026-10-26.v1", platform: "web" }),
    ]);
    expect(ADULT_ATTESTATION_VERSION).toBe("2026-10-26.v1");
    expect("attested_at" in calls.attest[0]).toBe(false);
  });

  test("no role/tier escalation: elite and extra metadata rejected or dropped", async () => {
    const { deps, calls } = mockDeps();
    const elite = await performWebsiteSignup({ ...base, tier: "elite", adultAttestation: true }, deps);
    expect(elite.ok).toBe(false);
    expect(calls.signUp.length).toBe(0);
    await performWebsiteSignup(
      { ...base, adultAttestation: true, elite_invited: "true", role: "admin" },
      deps,
    );
    const md = calls.signUp[0].metadata;
    expect(Object.keys(md).sort()).toEqual(["full_name", "intended_tier", "privacy_version", "terms_version"]);
    expect(md.intended_tier).toBe("pro");
  });

  test("existing email does not get an attestation recorded", async () => {
    const { deps, calls } = mockDeps({ isNew: false });
    const r = await performWebsiteSignup({ ...base, adultAttestation: true }, deps);
    expect(r.ok).toBe(true);
    expect(calls.attest.length).toBe(0);
  });
});
