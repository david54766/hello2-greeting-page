import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-consent";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Prima Donna AI™" },
      {
        name: "description",
        content: "How Prima Donna AI™ collects, uses, and protects your information.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 px-6 py-16">
        <article className="mx-auto max-w-3xl prose prose-neutral">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Legal</p>
          <h1 className="font-display text-5xl mt-3 mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>

          <section className="mt-10 space-y-4 text-[15px] leading-relaxed">
            <h2 className="font-display text-2xl">1. Who we are</h2>
            <p>
              Prima Donna AI™ ("we," "us," "our") provides an AI-powered executive coaching platform
              for childcare center owners at{" "}
              <a href="https://app.thepreschoolprimadonna.com" className="text-primary">
                app.thepreschoolprimadonna.com
              </a>
              .
            </p>

            <h2 className="font-display text-2xl">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account data:</strong> name, email, password hash, tier, role.
              </li>
              <li>
                <strong>Business context:</strong> center names, locations, enrollment, tuition,
                staff counts you choose to share so Raven can give grounded answers.
              </li>
              <li>
                <strong>Coaching content:</strong> the prompts you send and the responses Raven
                generates.
              </li>
              <li>
                <strong>Voice input:</strong> audio you record for speech-to-text is sent to
                ElevenLabs for transcription and is not retained by us after processing.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, modes used, timestamps, device/browser
                metadata, IP.
              </li>
              <li>
                <strong>Device and notification data:</strong> app platform, app version,
                push-notification token, notification preferences, and consent records.
              </li>
              <li>
                <strong>Community content:</strong> Elite Circle posts, replies, images, reports,
                and moderation records.
              </li>
              <li>
                <strong>Billing data:</strong> handled by Stripe. We never see or store your full
                card number.
              </li>
            </ul>

            <h2 className="font-display text-2xl">3. How we use it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate, personalize, and improve the coaching experience.</li>
              <li>Generate daily strategic recommendations tailored to your portfolio.</li>
              <li>Authenticate you, prevent abuse, and enforce tier access.</li>
              <li>Send transactional email (password resets, Elite Circle decisions, receipts).</li>
              <li>Comply with legal obligations.</li>
            </ul>

            <h2 className="font-display text-2xl">4. Sharing</h2>
            <p>
              We share only what is needed with the vendors that run the platform: Supabase
              (database, auth, storage), Stripe (billing), Resend (email delivery), ElevenLabs
              (voice synthesis and transcription), and our LLM providers (coaching responses and
              visual examples). We do not sell your data.
            </p>

            <h2 className="font-display text-2xl">5. Retention</h2>
            <p>
              We retain account, business, and coaching data while your account is active and only
              as long afterward as reasonably needed for legal, security, dispute, and backup
              purposes. Legal consent records may be retained as evidence of agreement. You may
              request deletion at{" "}
              <a href="mailto:privacy@thepreschoolprimadonna.com" className="text-primary">
                privacy@thepreschoolprimadonna.com
              </a>
              . Mobile app settings will also provide the account-deletion path required by the
              applicable app store before public release.
            </p>

            <h2 className="font-display text-2xl">6. Your rights</h2>
            <p>
              Depending on where you live (e.g., GDPR, CCPA), you may have the right to access,
              correct, export, or delete your personal data, and to object to certain processing.
              Contact us to exercise these rights.
            </p>

            <h2 className="font-display text-2xl">7. Security</h2>
            <p>
              We use encryption in transit (TLS), encryption at rest, row-level security on every
              customer table, and short-lived authenticated sessions. No system is perfectly secure;
              we will notify affected users in the event of a breach.
            </p>

            <h2 className="font-display text-2xl">8. Children</h2>
            <p>
              The service is built for childcare business owners, not children. We do not knowingly
              collect personal information from anyone under 16.
            </p>

            <h2 className="font-display text-2xl">9. Changes</h2>
            <p>We may update this policy. Material changes will be announced in-app or by email.</p>

            <h2 className="font-display text-2xl">9A. Consent choices</h2>
            <p>
              Required account processing is described in this policy and the Terms of Service.
              Optional website analytics can be declined through the cookie banner and reset from
              the Cookie Policy page. Device permissions, including microphone, photos, and
              notifications, can be changed in Android or iOS system settings.
            </p>

            <h2 className="font-display text-2xl">10. Contact</h2>
            <p>
              <a href="mailto:privacy@thepreschoolprimadonna.com" className="text-primary">
                privacy@thepreschoolprimadonna.com
              </a>
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
