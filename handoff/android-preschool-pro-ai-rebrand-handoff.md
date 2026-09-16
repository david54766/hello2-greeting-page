# Preschool Pro AI Android Rebrand Handoff

Updated: September 16, 2026

## Repository and source state

- Repository: `https://github.com/david54766/hello2-greeting-page`
- Working branch: `codex/android-native-migration`
- Shared rebrand commit: `2aeedde` (`Complete Preschool Pro AI brand and legal update`)
- iOS daily-brief naming commit: `43a8311` (`Rename Raven daily brief display`)
- Android is an existing published application. Update the existing listing and release; do not create a new Play Console application.

## Approved customer-facing identity

- Product name: **Preschool Pro AI**
- Owner/operator/manager: **Classroom Panda LLC**
- Approved ownership sentence: **Preschool Pro AI is owned, operated, and managed by Classroom Panda LLC.**
- Support and privacy email: `info@classroompanda.com`
- Home recommendation feature title: **Daily brief**
- Raven remains the name of the AI coach and voice experience. Do not remove Raven from coaching or voice features.

## Legal configuration

- Terms version: `2026-09-15.v1`
- Privacy version: `2026-09-15.v1`
- Platform recorded with acceptance: `android`
- Terms: `https://app.thepreschoolprimadonna.com/terms`
- Privacy: `https://app.thepreschoolprimadonna.com/privacy`
- Cookies: `https://app.thepreschoolprimadonna.com/cookies`

The legacy domain remains the live legal and authentication domain. A product-name change does not require changing these URLs until replacement routes are deployed and verified.

## Android changes already in source

- Launcher/app label is `Preschool Pro AI` in `app/src/main/res/values/strings.xml`.
- Sign-in, legal consent, settings ownership text, header branding, and accessibility descriptions use Preschool Pro AI.
- Push notification channel display name is `Preschool Pro AI updates`.
- Android network user agent is `Preschool Pro AI Android/<version>`.
- Horizontal logo asset is `app/src/main/res/drawable-nodpi/preschool_pro_ai_logo.png`.
- Launcher foreground artwork is updated in `app/src/main/res/drawable/ic_launcher_foreground.png`.
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
