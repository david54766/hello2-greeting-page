# Preschool Pro AI Android Rebrand Handoff

Updated: October 10, 2026

## Repository and source state

- Repository: `https://github.com/david54766/hello2-greeting-page`
- Working branch: `codex/android-native-migration`
- Shared rebrand commit: `2aeedde` (`Complete Preschool Pro AI brand and legal update`)
- iOS daily-brief naming commit: `43a8311` (`Rename Raven daily brief display`)
- Latest iOS review-build commit: `ca15985` (`Prepare Preschool Pro AI iOS build 20261010`).
- Domain changes: `f95ce8a` (mobile clients), `8a29263` (web links), `5ad321d` (legacy handoffs).
- Email sender change: `e26c00c` on the mobile branch; last verified web-main equivalent was `8eab9ac`. Fetch current refs before working; these are checkpoints, not a claim that remote main cannot have advanced.
- Android is an existing published application. Update the existing listing and release; do not create a new Play Console application.
- Inspect the Android session's own repository and dirty state first. Do not reset local changes or merge the entire mobile branch into web main. Reconcile overlapping changes carefully.

## Approved customer-facing identity

- Product name: **Preschool Pro AI**
- Owner/operator/manager: **Classroom Panda LLC**
- Approved ownership sentence: **Preschool Pro AI is owned, operated, and managed by Classroom Panda LLC.**
- Support and privacy email: `info@classroompanda.com`
- Home recommendation feature title: **Daily brief**
- Raven remains the name of the AI coach and voice experience. Do not remove Raven from coaching or voice features.

## Legal configuration

- Android and web source currently declare Terms and Privacy version `2026-09-15.v1`.
- iOS currently declares both versions as `2026-09-24.v1`. This discrepancy is unresolved: compare the published legal documents and shared backend acceptance policy before aligning versions. Do not silently mark users as having accepted a new version or change production acceptance requirements without evaluating the published Android app.
- Platform recorded with acceptance: `android`
- Terms: `https://app.preschoolproai.com/terms`
- Privacy: `https://app.preschoolproai.com/privacy`
- Cookies: `https://app.preschoolproai.com/cookies`

The new production website is now `https://app.preschoolproai.com`; DNS/TLS and publication were verified in the iOS/web session. The old statement that the legacy domain is the primary domain is obsolete. Verify new-domain legal pages, password-reset links, auth redirect allowlists, and backward-compatible old links before the Android release. Keep the published Android callback scheme unchanged.

## Android changes already in source

- Launcher/app label is `Preschool Pro AI` in `app/src/main/res/values/strings.xml`.
- Sign-in, legal consent, settings ownership text, header branding, and accessibility descriptions use Preschool Pro AI.
- Push notification channel display name is `Preschool Pro AI updates`.
- Android network user agent is `Preschool Pro AI Android/<version>`.
- Horizontal logo asset is `app/src/main/res/drawable-nodpi/preschool_pro_ai_logo.png`.
- Launcher foreground artwork is updated in `app/src/main/res/drawable/ic_launcher_foreground.png`.
- Notification small icon `app/src/main/res/drawable/ic_launcher_monochrome.xml` now reuses that approved robot artwork with a white tint instead of the old crown. XML validation passed; Android resource compilation and notification rendering still need verification on the Android build machine (this Mac has no Android SDK/JDK at the standard paths).
- The former `prima_donna_logo.png` asset was removed.
- Home and detail headings now display `Daily brief`, matching iOS.

## Technical identifiers that must remain unchanged

These identifiers preserve upgrades, authentication callbacks, Firebase registration, stored sessions, and notification continuity for the published app:

- Application ID: `com.preschoolprimadonna.app`
- Kotlin package/namespace: `com.preschoolprimadonna.app`
- Auth callback scheme: `preschoolprimadonna://auth-callback`
- Notification channel ID: `prima_donna_updates`
- Existing session-storage keys and internal Kotlin class names such as `PrimaDonnaViewModel`, `PrimaDonnaTheme`, and `PrimaDonnaMessagingService`
- Existing Supabase project, database names, storage paths, Edge Function action names, and bundle-independent backend identifiers

Do not rename these as cosmetic cleanup. Changing the application ID would create a different Play Store app and break upgrades for current users.

## Secrets and backend rules

- The Android client may contain only the Supabase URL and publishable/anon key through the existing local/build configuration.
- Never bundle Supabase service-role, OpenAI, ElevenLabs, Resend, Firebase service-account JSON, or other server secrets.
- Coaching AI, Raven voice, protected Vault downloads, and protected server operations must continue through Supabase Edge Functions/mobile API.
- Keep the existing `google-services.json` only if its Android client package is exactly `com.preschoolprimadonna.app`.
- Do not include credentials, demo passwords, signing passwords, keystores, or local property files in Git.

## Play Console listing updates

Update customer-facing metadata without changing the existing Play application identity:

- App name: Preschool Pro AI
- Short and full descriptions: replace Prima Donna/Preschool Prima Donna branding with Preschool Pro AI.
- Developer/business references: Classroom Panda LLC.
- Support/privacy contact: `info@classroompanda.com`.
- App icon, feature graphic, phone/tablet screenshots, and promotional graphics: use Preschool Pro AI artwork and show only current Android UI.
- Privacy policy URL: keep the live URL above unless a tested replacement is deployed.
- Data safety answers: recheck against actual Supabase, Firebase Messaging, image upload, microphone, and notification behavior; do not change answers based only on the rebrand.

## Required release steps

1. Pull the latest `codex/android-native-migration` branch.
2. Confirm `git status` is clean and inspect any local signing/configuration changes before building.
3. Set `versionCode` higher than the highest version already uploaded to Play Console. Do not assume the repository's current `versionCode = 1` is uploadable.
4. Choose an appropriate public `versionName` for the rebranded release.
5. Build the signed release Android App Bundle (`.aab`) with the existing production upload key.
6. Run unit/instrumented tests and test login, legal consent, Home/Daily brief, coaching, Raven voice, Vault downloads, Elite gating/conversations, push registration, settings, account deletion, and sign-out.
7. Test an upgrade over the currently published build to verify sessions, deep links, Firebase Messaging, and local data continue working.
8. Upload to an internal testing track first and verify install/update behavior from Google Play.
9. Replace Play Store screenshots and listing graphics with the new brand.
10. Review the staged rollout and release notes, then obtain business-owner approval before production rollout.

## Shared product behavior to preserve

- Navigation: Home, Coach, Vault, Elite, Settings. No separate Billing/Plan page or external membership-purchase link in the native iOS experience; preserve the published Android purchase architecture unless a separately approved Android change is required.
- Home: live center snapshots, membership badge, multiple centers, recommendations, and native inline Daily brief video. The user removed the Daily Brief screenshot from store marketing, not the feature itself.
- Coaching: permit every nonempty, non-whitespace prompt. No local prompt-quality checks or special `prompt_needs_clarification` handling. Show genuine backend errors inline, retain the editable prompt, and do not save/open a failed strategy or trigger voice for it. Keep Speak, Move, Previous Strategies, details, and Raven voice. No previous-prompt Use button.
- Vault: fetch current backend records on entry and refresh; preserve category/tier access and signed/private downloads. Do not bundle old records. Validate storage paths and test a real download against current backend behavior.
- Elite: open directly to Conversations. No Zoom, meeting links, slots, booking sheets/cards, or scheduler. Never call `list_raven_slots`, `list_raven_bookings`, `book_raven_slot`, or `cancel_raven_booking`.
- Enforce Elite access using live subscription data; Essentials and Pro stay locked out. Support images and reporting, expose delete only for the author's own content, and verify server-backed blocking/filtering. iOS source uses `block_elite_user` and `unblock_elite_user`; inspect the current backend contract instead of assuming Android parity. Missing or ineffective server enforcement is a release blocker.
- Authentication: no test bypass; password visibility, useful invalid-password errors, session restore/refresh, legal consent before authenticated content, cache reset on user change, account-deletion initiation, and sign-out cleanup.
- Notifications: Android retains Firebase FCM, existing package identity, and matching `google-services.json`. Verify token registration/removal, preferences, upgrades, and background delivery. iOS source also integrates Firebase Messaging over APNs; a display-name/domain change is not a reason to rotate app identity or credentials.
- Request microphone, photos, and notification permissions only as needed. Keep privacy disclosures consistent with actual collection and SDK behavior.

## New domain, email, and protected endpoints

- Website hosting/publishing was managed through the existing Lovable project. Do not assume Cloudflare hosts the application merely because DNS may be managed separately.
- Server-side Resend configuration was updated. Sender: `Preschool Pro AI <noreply@preschoolproai.com>`. A single test to `info@easyfill.ai` was sent successfully and the user confirmed receipt. This verifies that test, not every transactional email workflow.
- Support/privacy remains `info@classroompanda.com`, not the test recipient or sending-only address.
- Supabase project remains `ihiqixkufsjeplnkwkao` with URL `https://ihiqixkufsjeplnkwkao.supabase.co`.
- Never copy server credentials into Android, Git, handoff notes, or chat. Keep AI, voice, private files, and privileged operations server-side.
- Existing Android source also references protected web routes `/api/tts-stream` and `/_serverFn/...` using `WEB_APP_URL`. Verify these integrations on the new domain against deployed contracts; do not blindly replace working routes or hardcode new function hashes.
- Review local/CI `WEB_APP_URL` overrides: a correct Gradle default does not override an old value in local properties.

## Assets and presentation

- Use the approved Preschool Pro AI robot/graduation-cap logo and padded icon; remove the former woman image and all customer-visible Prima Donna branding.
- Original user artwork on this Mac: `/Users/nikkismith/Downloads/PRESCHOOL PRO AI - 3.png` (horizontal), `PRESCHOOL PRO AI - 4.png` (stacked), and `PRESCHOOL PRO AI - 1.png` (icon).
- Reusable tracked iOS reference assets: `iOS/PrimaDonnaAI/PrimaDonnaAI/Assets.xcassets/PreschoolProLogo.imageset/preschool_pro_ai_horizontal.png` and `AppIcon.appiconset/Icon-1024.png` under the same asset catalog. Use platform-appropriate Android adaptive-icon padding, not iOS rounding baked into artwork.
- Confirmed iOS app icon: magenta robot face wearing a graduation cap, small AI sparkle mark at upper right, padded rose/off-white background. The 1024px App Store asset is opaque; Debug and Release both use the `AppIcon` catalog. This is the icon included in iOS build `20261010`.
- Preserve rose/off-white backgrounds, serif editorial headings, white cards, pink active states, centered logo, and crown Elite navigation. Respect Android safe areas and accessibility.
- Produce authentic Android screenshots for Google Play. Do not reuse iOS screenshots or status bars. Apple previously rejected screenshots with non-iOS status bars; each platform must show its actual native UI.

## iOS and submission status at handoff

- iOS version `1.1`, build `20261010`, installed and launched on Nikki Smith's iPhone 16 Pro Max.
- Signed Debug device build, signed Release archive, App Store distribution export, and local code-signature verification passed. These are build checks, not full end-to-end QA.
- Archive/IPA/logs: `/Users/nikkismith/Downloads/Preschool-Pro-AI-iOS-20261010/`.
- Source build bump committed/pushed as `ca15985`; iOS bundle ID intentionally remains `com.preschoolprimadonna.PrimaDonnaAI`.
- App Store Connect application `6802986904`, version 1.1 draft remains Rejected from the previous submission; new review has NOT been sent.
- Five uploaded native iOS screenshots were visually checked: Coaching Engine, Strategy Detail, Previous Strategies, Settings, Sign In. Daily Brief is excluded. Local set: `/Users/nikkismith/Downloads/Preschool-Pro-AI-App-Store-Screenshots-2026-09-24-FINAL/`.
- Support/marketing URLs were saved with the new domain. Privacy URL change was staged but not saved, awaiting approval. Do not report it completed without verification.
- Upload of the new binary failed because Xcode's Apple Accounts list was empty. Archive export succeeded using installed signing assets, but upload needs a signed-in account with Classroom Panda LLC App Store Connect access. The draft still attaches old build `20260819` until replacement upload/processing/selection completes.
- Final App Review submission and production Play rollout require user review/approval. This handoff is information transfer, not authorization to publish.

## Outstanding shared checks

- Reconcile the legal-version mismatch above with deployed policy; this handoff is not legal certification.
- Live backend security quick-scan previously flagged broad read policies on `raven_availability`, `raven_meeting_settings`, and `templates`, a storage ownership warning, and dependency advisories. These were not resolved or independently re-audited in the build pass. Assess actual exposure before promotion; do not tighten production policies blindly and break the published Android app.
- Re-test auth redirects and emails, coaching, Raven voice, Vault downloads, Elite authorization/blocking/reporting/filtering, legal acceptance, account deletion, and notifications on the Android candidate.
- No Android build, Play Console changes, Android device QA, or production release was performed by the iOS session during this handoff update. Existing source-level changes are not proof of live Android behavior.
- No passwords, API keys, keystores, or reviewer credentials are included. Obtain approved test accounts through the existing secure configuration, not hardcoded source.

## Verification searches

Use these checks before release:

```bash
rg -n -i "Prima Donna|Preschool Prima Donna|Raven daily brief" app/src/main
rg -n "applicationId|namespace|versionCode|versionName" app/build.gradle.kts
./gradlew test lint bundleRelease
```

Results containing old terms in package names, callback schemes, notification IDs, class names, or storage keys are expected technical compatibility references. Any customer-visible old brand string is a release blocker.

## Known release requirements

- The repository currently declares `versionCode = 1` and `versionName = "0.1.0"`; these must be reconciled with the live Play Console before upload.
- This Mac previously lacked a working Java runtime, so Android compilation was not completed here. Install/use the Android Studio JDK or set `JAVA_HOME` to a compatible JDK before running Gradle.
- Source changes alone do not alter the currently published Android binary. The published app changes only after a newly signed bundle is uploaded and released through Play Console.
