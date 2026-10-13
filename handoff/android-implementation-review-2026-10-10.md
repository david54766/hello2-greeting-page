# Preschool Pro AI: Android Implementation and Release Review

Started October 10, 2026; verification continued October 11 (America/Chicago). This supplements, rather than rewrites, the historical cross-machine handoff.

## Release decision

Candidate only. Do not submit to production based on compilation or mock-server tests. Live authenticated regression, backend access-policy checks, the highest Play versionCode, and Play signing continuity remain release gates.

No production rollout, Play Console edits, iOS submission, secret rotation, live SQL migration, or Edge Function deployment was performed in this pass.

## Source of truth

- Repository: `https://github.com/david54766/hello2-greeting-page`.
- Starting mobile ref: `origin/codex/android-native-migration`, `089301afde528f1639fb88e67bf5a7f70cc80a80`.
- Inspected web-main ref: `4a8d468c74a1a60f0dbb733e26cf5eb8cf6559f2`.
- Implementation checkout: `C:/Users/belad/Documents/Codex/2026-06-05/i-need-to-build-a-native-2/current-android`.
- The parent conversation directory contains stale source and historical artifacts. Do not build from it. Its ignored local configuration/signing files were reused without committing them.
- The original GitHub checkout and its local main branch were left unchanged. Do not merge the entire mobile branch into web main.

## Review findings

### Fixed in this candidate

1. Android reports previously wrote usage events instead of the moderation queue. They now call `report_elite_content` with authenticated thread/reply identity and Android platform. See `SupabaseRestClient.kt:440`.
2. Android lacked member blocking and account-deletion request/status controls. Added backend-backed block/unblock in conversation detail/Settings and confirmed deletion requests with loading/error/retry/status handling. See `SafetyControls.kt` and `SupabaseRestClient.kt:461`.
3. Legal metadata differed from iOS/current main. Android and mobile-branch web constants now use `2026-09-24.v1`; consent is required before protected dashboard fetches. The published Terms inspected in this pass identify September 24, 2026 and Classroom Panda LLC. Existing users are not silently re-consented. See `Models.kt:7` and `PrimaDonnaViewModel.kt:686`.
4. Account work and voice requests could outlive sign-out. Account jobs and OkHttp calls are now cancellable; sign-out clears session/voice cache, attempts scoped token unregistration, and invalidates the Firebase token with a bounded wait. Concurrent token refresh is serialized. See `PrimaDonnaViewModel.kt:246`, `:762`, and `SupabaseRestClient.kt:877`.
5. Strategy/conversation writes could be replayed when the following data refresh failed with expired auth. These writes are separated from refresh retries. Failed post submissions retain their draft; drafts clear only after confirmed writes.
6. Missing or failed Elite requests looked like an empty conversation list. Errors are now shown with retry; backend block-lookup failure no longer silently disables filtering.
7. The strategy entry flow now enforces only blank/4,000-character constraints, not a semantic/nonsense guard. API errors do not trigger a successful result popup. The backend validates the generated JSON shape before saving; it does not reject legitimate prompts based on subject/context. Tests include HTTP-200 error envelopes and non-replay of validation failures.
8. An explicitly saved New York timezone was replaced by device timezone. Any nonblank saved timezone is now preserved; detection is only a default.
9. Daily Brief video uses reported source aspect ratio, handles playback failure/retry, renews signed URLs on retry, pauses on background, and releases the player. Added the matching Media3 HLS module. Codec/source support still requires device tests.
10. Small/landscape/large-font Home and Coach views can scroll when fixed-height content would otherwise be clipped. Normal tall layouts remain fixed. See `MainActivity.kt:2184`.
11. Vault downloads now lock according to active tier/admin status, including Elite-only records; the download action rechecks the loaded entitlement. Storage URL construction encodes filename segments so `#`/`?` cannot alter the request. These client checks do not replace storage RLS.
12. Push notification defaults and themed launcher icons reference the new robot artwork. The foreground notification handler suppresses messages for signed-out/locally disabled accounts. Backend notification payload delivery and category preferences still require live testing.
13. Native testing exposed login fields being removed during a request and text scrolling behind the status bar. The initial-session loading gate is now separate from subsequent sign-in requests, preserving the form on failure, and the login scroll region respects system safe areas.
14. The login action now grows vertically for larger fonts instead of clipping its second line. Verified at 150% font scale on a compact emulator viewport.
15. A failed notification-preference read no longer replaces an existing opt-out with default opt-in values; the fetch failure propagates instead.

### Unresolved release risks

- **High: live backend authorization and deployment are not verified.** The connected Supabase account denied project-management access to `ihiqixkufsjeplnkwkao`. Anonymous empty-result probes are not RLS evidence. Review live templates/storage tier policies, Elite tier/ownership/blocking policies, report visibility, and deletion-request ownership using separate accounts before release.
- **High: authenticated regression is partial.** All three supplied accounts passed live login, refresh and role/plan/center reads. The exact app conversation endpoint denied Essentials/Pro and returned three threads for Elite. Native Essentials login reached the legal gate. All three accounts have no current consent record; terms were not accepted on their behalf. A disposable deletion account remains outstanding. Voice, playback, posting, moderation and notification delivery are not yet end-to-end verified.
- **High: deletion fulfillment is outside this UI.** The client submits/status-checks requests; it does not erase accounts itself. Confirm operational ownership, processing, and retention rules. Do not promise an unverified completion SLA.
- **High: backend changes are source only.** Deploy the complete `mobile-api` function directory, including new `strategy-validation.ts`, to the correct project through its authorized owner. Do not copy a service-role or provider key into the app.
- **Medium: signed candidate versionCode needs Play confirmation.** Candidate defaults to `20261010`, name `1.1`. Confirm it exceeds the highest uploaded code, not merely the active release. Override with `-PreleaseVersionCode=<higher-code>` when needed.
- **Medium: upload signing is not proof of Play-installed upgrade compatibility.** Compare the candidate certificate to the existing upload certificate and test the Play-delivered build through the existing internal track. Play App Signing may use a different distribution certificate.
- **Medium: background push behavior needs server verification.** Firebase notification payloads can be displayed by the OS without `onMessageReceived`; category preferences must be enforced by the sender. Offline token deregistration cannot guarantee immediate server cleanup.
- **Medium: web main and mobile branch differ.** Main has newer schema/migrations and a different coaching implementation. Do not deploy the mobile branch as the entire website or assume web behavior was updated by this Android patch.
- **Medium: encrypted preference APIs are deprecated.** Existing storage is preserved for upgrades; replacing encryption/storage requires a separately tested migration. Dependency-update lint warnings were not resolved with broad upgrades in this release patch.

## Handoff discrepancy matrix

| Area | Status | Evidence / next check |
| --- | --- | --- |
| Name/logo/icon/domain | Already present; resource wiring improved | No customer-facing old-name, Temp sign in, Zoom or Book with Raven string found by source search in Android main. Native visual checks recorded below. |
| Published identity | Preserved | `com.preschoolprimadonna.app`, `preschoolprimadonna://auth-callback`, `prima_donna_updates`, existing encrypted preferences. |
| Supabase/Firebase | Configuration checked; live behavior pending | Local URL is `https://ihiqixkufsjeplnkwkao.supabase.co`. No server secrets in BuildConfig; existing Firebase package retained. |
| Legal / ownership | Changed now | Sep 24 version gate; existing rose legal UI and Classroom Panda LLC/contact retained. Policy/legal certification not performed. |
| Deletion | Changed now; fulfillment blocked | Same request contract as iOS/web; no destructive live test. Main migration is `supabase/migrations/20260722120000_create_account_deletion_requests.sql`; do not blindly replay production migrations. |
| Authentication / upgrade | Source fixed; partial runtime evidence | Signed APK Essentials login reached legal gate; Essentials/Pro REST login and refresh passed. Invalid login retains form. Full post-consent regression remains open. |
| Home / centers | Existing behavior retained; live reads checked | Each supplied Essentials/Pro account exposes its one expected sample center. Screen-level metric calculations and video playback remain unverified. |
| Coach / Raven | Changed now; contract tests | Prompt limits only; errors retained; structured output validation; ordered 650-character voice chunks. Actual generated speech/interrupt behavior requires live test. |
| Video | Changed now | Native player and HLS support; real signed MP4/MOV/HLS playback unverified. |
| Vault | Changed now | Refresh on entry, tier locks, signed path encoding. Newly published record/download and server security need live QA. |
| Elite | Changed now; live conversation access checks passed | Deployed mobile-api list_elite_threads returned HTTP 403 for Essentials/Pro and HTTP 200 with three threads for Elite. Block-list read succeeded for Elite. Native post-consent rendering, writes and moderation still require testing. |
| Settings | Changed now | Timezone preservation, deletion and blocked list; profile/center changes retained. Live CRUD not exercised. |
| Push | Changed now; live delivery pending | Token cleanup, local opt-out guard, default icon. No test notification sent. |
| Store listing / distribution | Not changed | No console fields saved, no internal-track upload, no production submission. |
| iOS | Reference reviewed only | No Xcode build on Windows. Historical iOS handoff status is not a fresh iOS test result. |

## Verification record

- Baseline debug build succeeded from the current mobile checkout.
- Intermediate Android contract suite: 12 tests passed, zero skipped/failures/errors. Final suite adds tier coverage; final result recorded below.
- Backend pure-contract suite: 4 tests passed using `node --test supabase/functions/mobile-api/strategy-validation.test.mjs`.
- Intermediate Android lint: zero errors. Warnings concerned dependency/SDK updates, redundant API guards and icon-resource guidance. Final count recorded below.
- An intermediate debug upgrade installed over the existing emulator app without uninstalling and retained its session, then showed the new consent gate. This is **debug lineage evidence only**, not published-release upgrade certification.
- Final artifact, certificate, emulator and test results: pending final build at document creation; see completion section added after verification.

## Reproduction and deployment

Use JDK 21 and the existing Gradle wrapper. Configure ignored `local.properties` with the correct Supabase URL/public anon key and SDK path. `WEB_APP_URL` defaults to `https://app.preschoolproai.com`; preserve the Android callback.

Signing uses process environment only: `ANDROID_UPLOAD_STORE_FILE`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`. Do not paste values into this document or commit signing material.

```powershell
.\gradlew.bat testDebugUnitTest assembleDebug lintDebug assembleRelease bundleRelease --console=plain --max-workers=2
node --test supabase/functions/mobile-api/strategy-validation.test.mjs
```

For the backend owner: confirm project `ihiqixkufsjeplnkwkao`; verify canonical `OPENAI_API_KEY` (existing `OPEN_API_KEY`/`AI_STRATEGY_KEY` aliases remain supported) and `ELEVENLABS_API_KEY` without exposing values. Deploy the function plus helper together. Validate the existing block/report migrations and the main-branch deletion schema against the deployed database before applying anything. Then test active Essentials, Pro, Elite, and a disposable deletion account on the candidate.

Required final smoke tests: genuine legal acceptance; auth errors/refresh/relogin; center-specific Home data; signed Daily Brief video; valid short and broad strategy inputs; Raven playback/cancel/retry; tier-appropriate Vault download; blocked member filtering after relogin; report arrival in admin queue; preference-specific foreground/background push; deletion request/status and fulfillment using a disposable account.

## Completed build verification

- Final combined Gradle command succeeded: debug tests/APK/lint, release APK and release AAB, including release vital lint.
- Android contract tests: **13 passed, 0 failed, 0 errors, 0 skipped**.
- Backend helper tests: **4 passed, 0 failed**. These are pure-function tests, not a deployed Edge Function integration test.
- Final debug lint: **0 errors, 15 warnings, 2 hints**. Remaining warnings concern SDK/dependency versions, redundant minimum-API configuration and bitmap resource location; hints suggest primitive Compose state containers.
- `apksigner verify` passed for the release APK (v2 signing). Its certificate matches the historical July 24 signed APK.
- AAB: `jarsigner -verify` returned `jar verified`; it also emitted self-signed/no-timestamp and ZIP streaming-order warnings. `bundletool 1.18.3 validate` passed. Play Console acceptance is not yet tested.
- APK and AAB certificate SHA-256: `807e72f4ae8d67a524bb0a0180b2c2f371f6b126a1397eb84238c4a70ae8036f`.
- Bundle manifest independently inspected: package `com.preschoolprimadonna.app`, versionCode `20261010`.
- Shared branch advanced during work to `4c5b8ca77cb7850691573af6428fb422a105cb95`. That commit only records active internal TestFlight owner testing; it contains no Android source changes. Preserve it when integrating this patch.

Artifacts are in this checkout's ignored `release/` directory; signing files are not included:

| File | SHA-256 |
| --- | --- |
| `Preschool-Pro-AI-1.1-20261010-DEBUG.apk` | `2E53B220C6589092A516C8E8E4A6D211B5B5C4041A7CD07E99A7E27B3C64C736` |
| `Preschool-Pro-AI-1.1-20261010-CANDIDATE.apk` | `87C21201F68E267BD3FEFDF3D51B527BB10C5F7E2FEEE7815B3CED5D43D26FA2` |
| `Preschool-Pro-AI-1.1-20261010-CANDIDATE.aab` | `5594E5A7188C7DE310F9F67338321467AE2B1CF12DE8C5BBA09124A12A9ECD27` |

These are testing candidates, not approved store submissions. The prior handoff's `versionCode = 1` statement describes the starting source and is superseded by the candidate above.

## October 11 live QA

- Accounts: supplied Essentials, Pro and Elite testers, active expected tiers, role `user` (not admin). Passwords and tokens are deliberately excluded from source and this report. The user confirmed the Elite password, and its login/refresh passed subsequently.
- Both accounts successfully authenticated and refreshed tokens against `ihiqixkufsjeplnkwkao`. REST test sessions were locally revoked after the read-only checks.
- Essentials center: `[QA] Little Steps - Raleigh`; Pro center: `[QA] Bright Futures - Austin`. Each account returned one center through its own-user query. This is not a cross-user RLS penetration test.
- Both returned the current `TESTING` Essentials template and four published video records. Notification-preference and deletion-request reads succeeded with no rows. Record visibility does not prove signed download or video playback.
- Initial lower-tier probes used `list_threads`, which is not the app's action name; their rejection alone did not verify the conversation route. Corrected and repeated using the actual `list_elite_threads` action for all three accounts: Essentials and Pro returned HTTP 403 (`Elite access required`); Elite returned HTTP 200 with three threads and no error. Elite `list_elite_blocks` also succeeded with an empty list. These are backend integration checks, not native UI or full RLS certification.
- Elite center: `[QA] Harbor Kids - Tampa`, one returned center. Its current legal-acceptance query returned no rows. Test sessions were signed out, and no content, consent or deletion records were created.
- Signed candidate installed successfully over the earlier same-certificate candidate. Native Essentials login reached the current legal gate. No legal-acceptance row, deletion request, conversation, report or sample content was created by these checks.
- Native invalid-password errors, password visibility, form retention, safe-area scrolling, portrait branding and compact 150% font-size login layout were checked. No claim of full tablet/multi-manufacturer coverage is made.
- The Android 36 emulator experienced OS/SystemUI/keyboard ANRs under host memory pressure. Captured logs did not show an app-specific crash/ANR, but this does not establish app-wide stability. Repeat the full matrix on physical devices and a less constrained emulator host.
- Screenshots: [large-font login](screenshots/android-20261011-login-font150.png), [Essentials legal gate](screenshots/android-20261011-essentials-legal.png).
- Final combined rebuild completed successfully in 3m 11s with one worker and in-process Kotlin. Final artifact hashes above supersede earlier candidates from this pass.
