# Preschool Pro AI Complete Rebrand and Android Handoff

Updated: October 13, 2026

Android implementation follow-up: [Implementation and release review](android-implementation-review-2026-10-10.md). That report records subsequent Android changes and unresolved release gates; the source-state statements below remain the original cross-machine checkpoint.

## October 13 iOS feedback for the Windows session

The owner reported that Home appeared to show only one center despite four saved centers, Elite's conversation body placeholder was against its border, and voice playback failed. The requested customer-facing playback button is now **Speak Voice**. This changes the label, not the voice provider or protected backend action.

iOS source commit: `975edeb` (11 files). The Mac then merged the Windows commits through `2838785` without changing their Android or backend work. Fetch the latest `codex/android-native-migration` before editing; do not overwrite the other machine's changes or the published Android application.

- Home: the existing data model already includes all saved centers. Keep swiping, but make other centers discoverable with a named picker, previous/next buttons, and `Center 1 of 4` style count. The iOS snapshot now measures its content instead of forcing three cards into 310 points.
- Elite: added vertical inset to multiline fields and explicit leading alignment to the composer heading. Conversations and access checks are unchanged. Check Android's composer with the keyboard open and long text before deciding whether it needs an equivalent fix.
- Voice: iOS detail/history controls now say `Speak Voice`, observe playback state directly, and show backend errors inline in the sheet with `Retry voice`. Loading can be cancelled; late responses from cancelled or replaced requests are ignored. Starting speech input stops playback, and starting playback stops recording.
- No schema, secret, backend deployment, Android package identity, legal acceptance, or App Store submission changes were made in this iOS patch.

### Shared voice blocker

An authenticated production request was reproduced on October 13 UTC:

```text
POST https://ihiqixkufsjeplnkwkao.supabase.co/functions/v1/mobile-api
action: synthesize_raven_voice
HTTP: 200
ok: false
error: Raven voice is temporarily unavailable.
audio bytes: 0
```

The approved QA account signs in successfully. This failure occurs before iOS audio decoding and is not resolved by a new app binary. In the checked-in function, this message follows a non-success ElevenLabs response. The Mac's Supabase connector cannot access project logs, so the actual upstream cause is not confirmed. The Windows session should inspect the corresponding `ElevenLabs TTS error` log status and sanitized provider error, then verify server-side `ELEVENLABS_API_KEY`, configured voice access, and provider quota as indicated by that evidence. Do not rotate keys blindly, print secrets, or move provider credentials into either mobile client. Preserve compatibility with the published Android app and retest a short voice request plus a complete strategy after correcting the server issue.

### iOS candidate and verification

- Version/build: **1.1 (20261013)**. Debug simulator build, Release archive, distribution export, and signature verification passed.
- 10 XCTest checks passed on iPhone 17 Pro / iOS 26.5 Simulator: all four centers retained, empty-state fallback, valid/failed/empty/malformed voice payloads, backend error preservation, playback failure/retry state, cancellation identity, and layout rendering.
- Home/Elite fixture layouts rendered at 375, 430, and 768 points and were visually inspected. These are test-fixture images, not App Store screenshots or physical-device/keyboard verification.
- Hands-on simulator login succeeded and Home showed `Center 1 of 4`; a system password-save prompt temporarily blocked continued interaction. Center switching and keyboard checks remain pending at this checkpoint.
- No successful end-to-end live voice playback, new TestFlight upload, or final App Review submission is claimed. Current TestFlight owner build remains the previously uploaded **1.1 (20261010)** until another upload is confirmed.
- Mac artifacts: `/Users/nikkismith/Downloads/Preschool-Pro-AI-iOS-20261013/` contains the archive, IPA, test result bundle, logs, layout fixtures, and `BUILD-NOTES.txt`. These artifacts are local, not in Git.

The Windows session was not listed among this Mac's connected sessions, so this shared Git handoff is the cross-machine delivery path. Please cross-check the Android center selector, composer padding, voice button wording, and inline voice errors without assuming the iOS patch modifies Android.

## Read this first

This is the cross-machine handoff for everything recorded in the iOS/web session since the Prima Donna AI to Preschool Pro AI name change. It includes shared requirements, source changes, observed deployment results, and unresolved checks. It does not certify that the separate Android machine, currently published Android binary, every backend deployment, or every account already matches this source.

The user wants the Android session to inspect its actual application, cross-check every relevant change, fix discrepancies without breaking existing users, and prepare a signed candidate for review. Do not recreate the Android project, change its application identity, rotate credentials, or release to production merely because this document exists. Final production rollout and App Review submission remain subject to owner approval.

Status vocabulary used here:

- Source change: confirmed in the shared Git branch; not necessarily deployed or device-tested.
- Verified: the specific check described was actually observed in the iOS/web session.
- Pending: requires further work or confirmation. Do not convert it into a completed claim.

No passwords, signing material, private API keys, or reviewer credentials are included. Local Mac artifact paths below are informational; the other machine should obtain tracked source and assets from GitHub, not expect those paths to exist there.

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

The last shared checkpoint before this expanded handoff is `c64903b`. Fetch the latest branch to obtain this document's subsequent commit as well. The actual iOS Git checkout is `/Users/nikkismith/Documents/Codex/2026-06-13/files-mentioned-by-the-user-prima/work/reference-main`; other older copies of the Xcode project exist on the Mac and should not be used as source of truth. That checkout has a pre-existing unrelated modification to `src/routeTree.gen.ts`, intentionally left untouched and uncommitted by the build/handoff work.

## Chronology since the name change

| Commit | Recorded change | Scope / caution |
| --- | --- | --- |
| `d7297ef` | Initial native iOS rebrand | Visible app name, logo, icon sizes, user-facing strings, and related configuration; not a new app identity. |
| `2aeedde` | Shared brand and legal update | Android branding, website/app UI, legal ownership/contact copy, web icons/manifest, email/PDF/coaching brand references. |
| `43a8311` | Daily brief display rename | iOS Home titles, model fallback text, and supporting view-model strings; Raven coaching preserved. |
| `ede8c08` | Initial Android rebrand handoff | Guidance for updating the existing published application. |
| `18b0f61` | iOS 1.1 candidate | Version/build preparation, not a new bundle identifier. |
| `c4afded` | Web feature-copy correction | Personalized Daily Brief; Elite promises private conversations instead of live coaching sessions. |
| `a9dc0ab` | Refreshed iOS icon and legal controls | Padded icon assets, iOS legal-version bump, and backend-backed account-deletion request UI replacing mailto-only initiation. |
| `f95ce8a` | Mobile new-domain defaults | Android Gradle/legal URLs and iOS config/examples; inspect local/CI overrides too. |
| `8a29263` | Web new-domain links | Public metadata, email links, signup, privacy, and web billing redirect defaults. |
| `5ad321d` | Legacy handoff domain updates | Markdown handoffs updated; old PDF/DOCX handoffs are historical and may be stale. |
| `e26c00c` | New-domain email sender | Server mailer default; last observed corresponding main commit `8eab9ac`. |
| `ca15985` | iOS build 20261010 | Debug and Release build number bumped together. |
| `79fdfa4` | Expanded Android status handoff | Domain, legal discrepancy, QA and release state. |
| `e9b9f1f` | Android notification icon | Old crown drawable replaced with a white-tinted reference to the approved robot image. |
| `c64903b` | Successful upload recorded | Xcode sign-in blocker resolved; Apple accepted iOS build for processing. |

Scheduler removal, coaching behavior, Firebase integration, protected downloads, and Elite safety work partly predate the rebrand. They remain required regression checks; do not interpret all of them as newly implemented or freshly tested by these commits.

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

Legal content changed in source includes page titles/descriptions, the introductory contracting/operator identity, cookies ownership copy, support links, and intellectual-property wording. The Terms now refer to the Preschool Pro AI brand and proprietary coaching frameworks owned by Classroom Panda LLC rather than the former branded doctrine. Footer copyright/management copy also names Classroom Panda LLC.

Specific consent locations to compare:

- Android: `app/src/main/java/com/preschoolprimadonna/app/data/Models.kt`.
- Web: `src/lib/legal-consent.ts` and `src/lib/cookie-consent.functions.ts` (cookie version remains `2026-09-15.v1` in inspected source).
- iOS: `iOS/PrimaDonnaAI/PrimaDonnaAI/Config/AppConfig.swift`.
- Shared records: `legal_acceptances`; use the correct platform (`android` or `ios`) and genuine acceptance event. Validate backend/RLS access with separate user accounts, without altering existing users' consent silently.

The requested company management wording is a product/legal-copy requirement, not evidence that an external business registration, trademark, legal opinion, or every provider's business profile was reviewed or changed. Any claims of legal compliance need a separate review of actual documents, data handling, and fulfillment processes.

### Account deletion implementation detail

The iOS September 24 change replaced email-only initiation with authenticated reads/inserts in `account_deletion_requests`. It inserts the signed-in `user_id`, `platform: ios`, and `status: pending`; Settings shows a confirmation and requested state. It does not implement the operational deletion worker or prove requests are completed. Visible copy promises completion of accepted requests within 30 days, except legally retained records.

Android must verify its own deletion initiation, backend authorization, status/error handling, and actual fulfillment process. Do not simply duplicate a 30-day promise unless the business can fulfill it. Do not send a real deletion request from the owner's or reviewer account during QA. Use an approved disposable account when testing destructive lifecycle behavior.

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

### Hosting and account boundaries

- Existing Lovable project: `https://lovable.dev/projects/2deeab71-45bd-45e5-8dc0-4f218025b354`. The iOS/web session observed the site as published and up to date after the domain/email work.
- Production application URL is the `app.` subdomain, not an assumed apex-domain deployment. Apex/old-domain redirects and DNS record ownership were not comprehensively audited in the final build pass.
- No DNS record values or Resend API keys are included here. Read the actual provider configuration before changing records; do not infer a DNS target from the old host.
- A new Resend key was added server-side and `EMAIL_FROM` set to the approved sender. A send-only key returned success for sending, but did not permit querying the message afterward. The user's receipt confirmation is the delivery evidence.
- Google Play listing, Android signing/Play App Signing, Firebase project settings, OAuth verification domains, and provider business profiles have not all been verified by this session. Inspect those accounts directly on the Android machine.
- Update web payment return/cancel domains only within the existing web purchase flow; this does not authorize adding Stripe purchase UI to the iPhone app or changing a published Android billing integration.

## File map for the receiving session

Paths in this section are relative to the shared repository. Use `git diff 88f908d..HEAD -- <path>` and individual commits to distinguish the rebrand from unrelated work. The range's base is immediately before the first iOS rebrand commit.

### Android

| File / directory | What to cross-check |
| --- | --- |
| `app/build.gradle.kts` | New `WEB_APP_URL` default; existing application ID; release versionCode/versionName still need reconciliation. |
| `app/src/main/res/values/strings.xml` | Launcher label. |
| `app/src/main/java/com/preschoolprimadonna/app/MainActivity.kt` | Visible branding, logo references, legal links, consent and ownership text, Daily brief naming. |
| `app/src/main/java/com/preschoolprimadonna/app/data/Models.kt` | Legal versions; discrepancy with iOS. |
| `app/src/main/java/com/preschoolprimadonna/app/data/SupabaseRestClient.kt` | Branded user agent, protected endpoint compatibility, and use of new-domain configuration. |
| `app/src/main/java/com/preschoolprimadonna/app/push/PrimaDonnaMessagingService.kt` | Displayed channel name and notification icon resource. |
| `app/src/main/res/drawable-nodpi/preschool_pro_ai_logo.png` | New horizontal logo; former `prima_donna_logo.png` removed. |
| `app/src/main/res/drawable/ic_launcher_foreground.png` | Approved adaptive launcher foreground. |
| `app/src/main/res/drawable/ic_launcher_monochrome.xml` | New white-tinted robot reference used by notifications; visual device QA pending. |
| `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `ic_launcher_round.xml` | Existing adaptive-icon wiring; inspect safe-area clipping across launcher masks. |

### iOS

| File / directory | What changed |
| --- | --- |
| `iOS/PrimaDonnaAI/PrimaDonnaAI.xcodeproj/project.pbxproj` | Build/version settings and AppIcon wiring; existing bundle identity retained. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Info.plist` | Preschool Pro AI display/name and relevant branded permission copy. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Assets.xcassets/AppIcon.appiconset/` | All listed iPhone/iPad/App Store icon images replaced/refreshed. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Assets.xcassets/PreschoolProLogo.imageset/` | New horizontal logo, replacing the old logo set. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Config/` | AppConfig, BuildSettings, Secrets example, legal versions, and new-domain defaults. Real Secrets.xcconfig stays local/ignored. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Models/Models.swift` | Branded/fallback display strings. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Views/Components/PrimaComponents.swift` | Header logo presentation/accessibility. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Views/LoginView.swift`, `SettingsView.swift` | Product name, company ownership, legal/privacy controls, deletion request UI. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Views/HomeView.swift`, `ViewModels/HomeViewModel.swift`, `ViewModels/AppState.swift` | Daily brief labels and account-deletion state/actions. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/Services/SupabaseClient.swift` | Branded request identifier and authenticated deletion-request records. |
| `iOS/PrimaDonnaAI/PrimaDonnaAI/PrimaDonnaAIApp.swift` | Product-facing/legal presentation references. |

### Web and backend

| File / directory | What changed |
| --- | --- |
| `public/preschool-pro-ai-icon.png`, `public/preschool-pro-ai-logo.png`, `public/site.webmanifest` | New public icons/logo and installable-site identity; old crown SVG removed. |
| `src/assets/preschool-pro-ai-logo.png` | New imported logo; old imported logo removed. |
| `src/components/AppHeader.tsx`, `SiteFooter.tsx`, `LegalConsentGate.tsx` | Logo, product name, consent copy, and company ownership. |
| `src/routes/__root.tsx` | App-wide metadata and new-domain image/link references. |
| `src/routes/index.tsx` | Branding and feature promises: Daily Brief and private Elite conversations. |
| `src/routes/terms.tsx`, `privacy.tsx`, `cookies.tsx` | Product identity, company ownership/contact, legal metadata, and domain links. |
| `src/routes/login.tsx`, `signup.tsx`, `reset-password.tsx`, `admin-login.tsx`, `apply-elite.tsx` | Authentication/application branding and relevant redirect defaults. |
| `src/routes/_authenticated/` | Customer-visible brand/title updates across dashboard, coach, Vault/templates, Elite, settings, billing, and admin/Elite-gate pages. |
| `src/lib/legal-consent.ts`, `cookie-consent.functions.ts` | Shared legal-version metadata. |
| `src/lib/mailer.server.ts`, `billing.functions.ts` | Branded sending defaults and new-domain email/payment redirect URLs. |
| `src/lib/export-pdf.ts` | Exported-document branding. |
| `src/lib/coaching.functions.ts`, `coach-image.functions.ts` | Coaching/image brand references. |
| `src/routes/api/public/hooks/generate-daily-recommendations.ts` | Product name in recommendation-related source. |
| `supabase/functions/mobile-api/index.ts` | Rebrand string change; source presence does not prove a new deployed Edge Function version. |
| `scripts/configure-supabase-resend-smtp.ps1` | Sender display-name reference; inspect runtime email configuration separately. |
| `supabase/LEGAL_CONSENT_DEPLOYMENT.md`, `handoff/`, `handoff-ios/` | Updated Markdown guidance; historical attached PDF/DOCX documents can retain outdated content. |

## Android verification matrix

Run these checks against a candidate installed from the existing application's signed release lineage. Record device, Android version, app version/code, account tier, steps, result, and evidence. Do not call an entire row passed based only on a source search.

| Area | Required checks |
| --- | --- |
| Upgrade continuity | Install over published build without uninstalling; package/signature accepted; existing session and user data preserved; deep links continue working. |
| Brand | Launcher name, adaptive/round icon, notification icon, splash/sign-in/header, app switcher, settings, accessibility labels, exports and store assets use Preschool Pro AI. |
| Layout | Small and large phones, tablet where supported, portrait/landscape, font scaling, keyboard, loading/empty/error states; no clipped logo or unreadable icon. |
| Auth | Invalid credentials, visibility toggle, successful sign-in, cold start, expired-session refresh, sign-out and cross-user cache isolation; no bypass. |
| Legal | Current real policy versions, working terms/privacy/cookies links, authenticated consent persistence, correct platform, no entry before required acceptance. |
| Home | Current membership, center selection/swiping, enrollment, estimated revenue, facility goal, recommendations from live data. |
| Daily brief | In-app detail, remote MP4/MOV/HLS as supplied, source aspect ratio, play/pause, load/error/retry, no forced external browser. |
| Coaching | Broad, short, detailed, subjectless, nonsense, and unrelated nonempty input all reach the backend; genuine rejection/network failure preserves input without history or voice; blank-only input blocked. |
| Strategy/voice | Mode selection, speech input, Move, history/details, no Use button, protected voice endpoint, timeout/retry, interrupt/resume without frozen UI. |
| Vault | Live refresh on entry/pull, newly published record appears without rebuild, categories, tier badges, details, signed downloads and invalid-path errors. |
| Elite | Essentials and Pro denied independently; Elite can view/create/reply/attach; ownership-based deletion; reporting; server blocking/filtering, including after refresh/relogin. |
| Settings/deletion | Profile, centers, timezone default, current plan, legal/support links; real deletion request/status using disposable approved account and verified fulfillment handling. |
| Push | Initial permission, declined permission, token refresh, new-domain/backend registration, per-category preferences, foreground/background delivery and sign-out cleanup. |
| Privacy/security | No private server keys, no sensitive request logs, matching Firebase package, correct permissions/Data safety declarations, accessible RLS/storage only as intended. |
| Release | Unit/instrumented tests and lint, signed AAB, higher versionCode, native screenshots, Play internal-track installation, rollback/update plan. |

An iOS unit/UI test suite and a fresh full multi-device regression matrix were not run during the October 10 build-only pass. Debug/Release compilation and successful installation/upload are not substitutes for those tests. Do not inherit older claims of complete QA without evidence.

## Receiving session deliverables

1. Confirm the actual Android repository, branch, existing dirty files, latest integrated commits, package ID, signing lineage, live Play versionCode, and Firebase app before editing.
2. Produce a discrepancy checklist across every section of this handoff: already correct, changed now, unverified, or blocked. Include file/line evidence and actual runtime tests where applicable.
3. Implement scoped Android corrections while preserving published-app compatibility. Do not use legal-version changes or RLS rewrites as incidental cleanup.
4. Run the matrix, record failed/skipped tests honestly, and attach native screenshots showing the new brand.
5. Produce a signed release AAB with a valid incremented versionCode and report its exact location and checksum. Keep signing files/passwords out of Git and messages.
6. Prepare internal testing and listing updates under the existing Play application. Report which console fields have actually been saved versus merely proposed.
7. Commit/push scoped source and an updated QA report. State any changed backend deployment separately from client commits.
8. Stop before production release until the user reviews the build and approves rollout. Do not imply the Android build exists until the artifact has actually been produced.

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
- Initial upload failed because Xcode's Apple Accounts list was empty. The user signed in; retry succeeded at 22:50 CDT on October 10. Processing subsequently completed, the export-compliance questionnaire was saved, and build `1.1 (20261010)` now shows **Testing** in the internal `Owner Review` group. The owner's existing App Store Connect account shows **Invited**. Automatic distribution is off; only this build was assigned. No public test link or external beta group was created.
- The App Store distribution draft still needs its old `20260819` build replaced with the new build before final review. Enabling internal TestFlight testing is not an App Review submission.
- This binary retains `TARGETED_DEVICE_FAMILY = 1` (iPhone only). The user intends to test on iPad in iPhone compatibility mode; no dedicated iPad/universal-layout update or verified TestFlight iPad installation is claimed.
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
