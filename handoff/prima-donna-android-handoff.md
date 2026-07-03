# Prima Donna AI Android App Handoff

Prepared: June 13, 2026  
Repository: `https://github.com/david54766/hello2-greeting-page.git`  
Branch: `codex/android-native-migration`  
Current commit at handoff: `3f84e6e`  
Current debug APK: `G:\My Drive\Prima Donna AI - Android Debug - 2026-06-13.apk`

## 1. Original Build Prompt

The initial request that started this Android build was:

> I need to build a native android mobile app for this site please review and scope out how we can do this.
>
> Here is the elite client login so you can view the full layout.
>
> URL: https://app.thepreschoolprimadonna.com/login  
> Email: info@easyfill.ai  
> Temp password: [REDACTED FOR HANDOFF]

Security note: do not paste live passwords, OpenAI keys, ElevenLabs keys, Supabase service role keys, or Stripe secrets into the repo or this document. Keep credentials in the Mac machine's secure password store or environment/secret manager.

## 2. Current Product State

This repository now contains a native Android implementation for Prima Donna AI. The Android app is a Kotlin Jetpack Compose application inside the existing Lovable/TanStack web repo. The native app talks directly to Supabase REST/Auth plus a Supabase Edge Function named `mobile-api` for mobile-safe server operations.

Stripe billing is intentionally excluded from the Android build for now. The app only displays current plan status in Settings.

Current confirmed native screens:

- Sign in with centered brand, email/password, forgot password, and debug-only temp sign-in.
- Home dashboard locked around center snapshot, facility goal, and Raven daily brief card.
- Coaching Engine with fixed strategy prompt, mode chips, strategy-ready popup, previous strategy history, and Raven voice playback.
- Template Vault with one-line horizontal category filters and resource cards.
- Elite Circle defaulting to conversations only. Raven/Zoom meeting scheduling is retired.
- Settings with profile, centers, notification preferences, current plan, and add/edit center flows.

## 3. Mac Setup Instructions

1. Clone the repo:

```bash
git clone https://github.com/david54766/hello2-greeting-page.git
cd hello2-greeting-page
git checkout codex/android-native-migration
```

2. Open the project in Android Studio.

3. Create or update `local.properties` at the repo root. Do not commit it.

```properties
SUPABASE_URL=https://owjhaoiqiujpdndcwccl.supabase.co
SUPABASE_ANON_KEY=<publishable or anon Supabase key>
QA_EMAIL=<debug temp-login email>
QA_PASSWORD=<debug temp-login password>
WEB_APP_URL=https://app.thepreschoolprimadonna.com
AUTH_REDIRECT_URL=preschoolprimadonna://auth-callback
```

4. Build from Android Studio or terminal:

```bash
./gradlew :app:assembleDebug
```

5. Debug APK location:

```text
app/build/outputs/apk/debug/app-debug.apk
```

6. For a release build, add proper Android signing config first. The current APK is a debug build intended for device testing only.

## 4. Required Backend Secrets

Set these in Supabase Function Secrets for project `owjhaoiqiujpdndcwccl`:

| Secret | Required | Purpose |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | Powers Coaching Engine strategy generation through `mobile-api/run_coaching`. |
| `ELEVENLABS_API_KEY` | Yes for Raven voice | Powers Raven voice playback through `mobile-api/synthesize_raven_voice`. |
| `ELEVENLABS_RAVEN_VOICE_ID` | Optional | Defaults to `EcNmy6NxONUCla9ZNPCn` if not set. |
| `SUPABASE_URL` | Yes | Automatically present for Supabase functions. |
| `SUPABASE_ANON_KEY` | Yes | Automatically present for Supabase functions. |

The Android client must never receive OpenAI, ElevenLabs, Stripe, Resend, or Supabase service role secrets.

## 5. Android App Architecture

Main Android files:

| File | Responsibility |
|---|---|
| `app/src/main/java/com/preschoolprimadonna/app/MainActivity.kt` | Compose UI, screen routing, navigation, dialogs, and screen layout. |
| `app/src/main/java/com/preschoolprimadonna/app/PrimaDonnaViewModel.kt` | App state, auth/session lifecycle, data loading, save actions, coaching, voice playback, and Elite workflows. |
| `app/src/main/java/com/preschoolprimadonna/app/data/SupabaseRestClient.kt` | Supabase Auth/REST calls, mobile Edge Function calls, storage signed URLs, and server function fallback calls. |
| `app/src/main/java/com/preschoolprimadonna/app/data/Models.kt` | Kotlin serializable data models. |
| `app/src/main/java/com/preschoolprimadonna/app/ui/Theme.kt` | Brand colors and Material theme. |
| `supabase/functions/mobile-api/index.ts` | Supabase Edge Function for AI, Raven voice, Elite board, and Raven scheduling. |

## 6. Key Native Functions

### Auth and Session

- `PrimaDonnaViewModel.signIn(email, password)` signs in through Supabase Auth, stores the session, then loads all dashboard data.
- `PrimaDonnaViewModel.signUp(fullName, email, password)` creates a Supabase Auth account and saves `full_name` as metadata.
- `PrimaDonnaViewModel.requestPasswordReset(email)` sends a Supabase password recovery email using the native app redirect URL.
- `PrimaDonnaViewModel.handleAuthRedirect(uri)` handles `preschoolprimadonna://auth-callback` for login/recovery links.
- `SessionStore` persists auth sessions locally.
- Debug temp sign-in is controlled by `BuildConfig.DEBUG`, `QA_EMAIL`, and `QA_PASSWORD`.

### Data Loading

- `PrimaDonnaViewModel.loadData(session)` loads profile, subscription, centers, templates, videos, coaching sessions, Elite threads, Raven slots, and Raven bookings in parallel.
- `PrimaDonnaViewModel.withRefreshRetry(...)` retries requests after token refresh when a session expires.

### Centers and Profile

- `saveProfile(...)` updates business profile details.
- `addCenter(center)`, `updateCenter(center)`, and `deleteCenter(centerId)` manage the user's center portfolio.
- Home reads center data to display enrollment, estimated revenue, and facility goal/capacity.

### Coaching Engine

- `submitCoachingPrompt(mode, prompt)` sends a strategy request to `mobile-api` action `run_coaching`.
- `StrategyReadyDialog(...)` shows the generated recommendation immediately after a new coaching session returns.
- `CoachingHistoryDrawer(...)` shows previous sessions.
- `playRavenVoice(session)` turns saved strategy text into an MP3 using `mobile-api` action `synthesize_raven_voice`, saves the MP3 to cache, and plays it through Android `MediaPlayer`.
- `stopRavenVoice()` releases playback state.

### Template Vault

- `VaultScreen(...)` filters templates by category using a one-line horizontal chip row.
- Template downloads use signed storage URLs through `viewModel.signedUrl("templates", path)`.

### Elite Circle

- `EliteScreen(...)` defaults to Conversations.
- `createEliteThread`, `openEliteThread`, `replyEliteThread`, and `deleteEliteThread` call `mobile-api` Elite thread actions.
- Do not include Zoom links, Raven meeting scheduling, booking slots, booking cancellation, or a `Book with Raven` CTA.

## 7. Supabase Edge Function: `mobile-api`

File: `supabase/functions/mobile-api/index.ts`

Actions:

| Action | Access | Purpose |
|---|---|---|
| `run_coaching` | Authenticated user | Uses OpenAI `gpt-4o-mini` and stores a structured coaching response in `coaching_sessions`. |
| `synthesize_raven_voice` | Authenticated user | Uses ElevenLabs and returns base64 MP3 audio for Android playback. |
| `list_elite_threads` | Elite/admin | Returns Elite board threads with author names and reply counts. |
| `create_elite_thread` | Elite/admin | Creates a conversation. |
| `get_elite_thread` | Elite/admin | Returns a thread with replies. |
| `reply_elite_thread` | Elite/admin | Adds a reply. |
| `delete_elite_thread` | Elite/admin | Deletes a thread. |
| `list_raven_slots` | Elite/admin | Legacy compatibility only; returns an empty disabled scheduler response. |
| `list_raven_bookings` | Elite/admin | Legacy compatibility only; returns an empty disabled scheduler response. |
| `book_raven_slot` | Elite/admin | Legacy compatibility only; returns `410` because meeting scheduling is retired. |
| `cancel_raven_booking` | Elite/admin | Legacy compatibility only; returns `410` because meeting scheduling is retired. |

Access rule: all Elite board actions require an active `elite` subscription or admin role. Coaching and voice are authenticated-user actions.

## 8. Visual and Layout System

Theme tokens are in `Theme.kt`:

| Token | Value | Usage |
|---|---|---|
| `PrimaPink` | `#F000A8` | Primary brand action/accent. |
| `PrimaInk` | `#171016` | Body/heading ink. |
| `PrimaSurface` | `#FFF7FA` | Rose off-white app background. |
| `PrimaSoft` | `#FFEEF6` | Bottom bar and soft selected states. |
| `PrimaGold` | `#C49A48` | Elite/pro badges. |
| Outline | `#EBD9E3` | Card and field borders. |

Layout conventions:

- Screen background should remain rose off-white, not pure white.
- Cards should be white, bordered, and use `AppCardShape = RoundedCornerShape(8.dp)` unless explicitly a pill.
- Screen headings use serif typography and large scale.
- Badges use uppercase text, pill radius, subtle fill, and light border.
- Bottom navigation has five tabs: Home, Coach, Vault, Elite, Settings.
- Billing is intentionally removed from the app.
- Elite icon uses a crown drawable and pink outline when selected.
- Horizontal chip rows should stay one line and scroll sideways instead of wrapping.
- Avoid nested decorative cards. Use simple cards only for repeated items, dialogs, and data surfaces.

## 9. Screen Layout Instructions

### Sign In

- Center logo at top.
- White elevated card with large serif "Sign in" heading.
- Fields: Email, Password.
- Actions: Forgot password, Enter Command Center, Temp sign in.
- Temp sign-in is debug-only and should not appear in release builds unless intentionally enabled.

### Home

- Locked snapshot view; avoid vertical content sprawl.
- Header row: "Center snapshot" left, `Elite` or `Pro` badge right, badge slightly lower than heading baseline.
- Center name badge appears under title.
- Snapshot cards: Enrollment, Est. Monthly Revenue, Facility Goal.
- If multiple centers exist, snapshot cards scroll sideways.
- Strategic recommendation card sits below snapshot.

### Coach

- Fixed coaching session layout.
- One-line horizontal mode chips: CEO, Revenue, Marketing, Compliance, Systems.
- Prompt box must be white.
- Primary action row: Speak and Move.
- Previous strategies button sits below Speak/Move, centered and tightened.
- Strategy-ready dialog uses rose off-white background.
- Previous strategies drawer uses compact white cards with Details and Play on the same row.

### Vault

- One-line horizontal category filters.
- Template cards use category/tier badges, title, description, Details, Download.
- Keep cards white with light border and no heavy decoration.

### Elite

- Default tab is Conversations.
- Do not show a `Book with Raven` button or a Schedule tab.
- Raven/Zoom meeting scheduling is retired; Elite should focus on private conversations.
- Current bottom nav icon is a centered crown with selected pink outline.

### Settings

- Business profile card.
- Notification preferences card.
- Centers list with edit/delete.
- Add center opens a polished white dialog with consistent field shapes.
- Membership card displays only current plan/status/current period.
- Do not reintroduce billing plan comparison cards in Android.

## 10. Build and Verification Checklist

Before handing another APK to a tester:

```bash
./gradlew :app:assembleDebug :app:lintDebug :app:testDebugUnitTest
```

Then copy:

```text
app/build/outputs/apk/debug/app-debug.apk
```

to:

```text
G:\My Drive\Prima Donna AI - Android Debug - YYYY-MM-DD.apk
```

Latest successful Android checks passed on this branch:

- `:app:assembleDebug`
- `:app:lintDebug`
- `:app:testDebugUnitTest`

## 11. Known Constraints and Follow-Ups

- Current APK is a debug APK, not a signed release build.
- Stripe billing is intentionally ignored for Android at this stage.
- iPhone/iOS implementation has not been built yet.
- Native app still depends on Supabase schema and seed/content data already existing.
- For production, remove or gate debug temp sign-in.
- For Play Store, add release signing, versioning, app icon validation, privacy policy, and production QA.

## 12. Current Visual References

The attached screenshots are the target state for visual continuity:

1. Login screen: centered brand, sign-in card, temp sign-in.
2. Elite Circle: conversations default, latest conversations.
3. Template Vault: one-line filters, template cards.
4. Coaching Engine: white prompt box, Speak/Move row, tightened previous strategies.
5. Home: center snapshot, Elite badge, center metrics, strategic recommendation.

See the embedded screenshots in the Word version of this handoff for layout reference.
