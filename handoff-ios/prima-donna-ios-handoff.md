# Prima Donna AI iOS App Handoff

Prepared: June 14, 2026  
Target platform: Native iPhone app  
Recommended implementation: SwiftUI, MVVM, Supabase Auth/REST, Supabase Edge Functions  
Reference repository: `https://github.com/david54766/hello2-greeting-page.git`  
Reference branch: `codex/android-native-migration`

## 1. Initial Prompt For The Mac Build

Use this prompt to start the iOS implementation on the Mac:

```text
Build a native iOS iPhone app for Prima Donna AI. Use SwiftUI and Xcode. Match the attached five screenshots as the visual styling guide: rose off-white background, serif editorial headlines, magenta accent, rounded white cards, fixed bottom tab bar, crown Elite tab, and compact operator workflows.

Recreate the current mobile feature set natively for iPhone: login, temp sign-in for debug builds, Home center snapshot, Coaching Engine with Raven strategy responses and voice playback, Template Vault, Elite Circle conversations/schedule, Settings with current plan only, and Supabase-backed data.

Do not include Stripe billing. Do not expose OpenAI, ElevenLabs, Supabase service-role, Resend, or Stripe secrets in the app. The iPhone app may use the Supabase publishable/anon key only. All AI, Raven voice, protected downloads, and server operations must go through Supabase Edge Functions.

Use the attached screenshots as the styling source of truth. If there is a conflict between generic iOS defaults and the screenshots, follow the screenshots.
```

Security note: do not paste live passwords, OpenAI keys, ElevenLabs keys, Supabase service-role keys, Resend keys, or Stripe secrets into the repo, Xcode project, screenshots, or this document. Keep credentials in the Mac keychain, local `.xcconfig`, or Supabase secrets.

## 2. Product Goal

Create a native iPhone version of Prima Donna AI that feels like the mobile screenshots, not like a web view. The app should share the same backend and product behavior as the current mobile build, while using native SwiftUI controls, native navigation, native audio playback, and iOS-safe credential handling.

Stripe billing is intentionally excluded. The app should only show the current membership tier/status in Settings.

## 3. Styling Source Of Truth

The five attached screenshots are the visual guide:

- `01-login.jpg`: sign-in layout and brand treatment.
- `02-elite.jpg`: Elite Circle conversations and bottom tab styling.
- `03-vault.jpg`: Template Vault filters, cards, badges, and download actions.
- `04-coach.jpg`: Coaching Engine prompt layout and previous strategies entry.
- `05-home.jpg`: Home dashboard center snapshot and strategic recommendation card.

Use these screenshots to match spacing, hierarchy, color, typography, tab behavior, and card geometry.

## 4. iOS Architecture

Use a straightforward native structure:

- `PrimaDonnaAIApp`: app entry point and environment injection.
- `AppState`: global auth/session/user/tier state.
- `AuthStore`: sign-in, sign-out, password reset, temp sign-in for debug builds.
- `SupabaseClient`: typed wrapper around Supabase Auth and REST calls.
- `MobileApiClient`: typed wrapper around Supabase Edge Function `mobile-api`.
- `AudioPlaybackService`: plays Raven voice responses from returned audio bytes or URLs.
- `SpeechInputService`: optional iOS speech-to-text support for the Speak button.
- `DownloadService`: opens or downloads protected Vault assets.
- `ViewModels`: one view model per screen for loading, submitting, and error state.
- `Views`: SwiftUI screens/components.

Recommended folder shape:

```text
iOS/PrimaDonnaAI/
  PrimaDonnaAIApp.swift
  Config/
    AppConfig.swift
    Secrets.xcconfig.example
  Models/
    UserProfile.swift
    Center.swift
    Subscription.swift
    VaultItem.swift
    StrategySession.swift
    EliteConversation.swift
  Services/
    AuthStore.swift
    SupabaseClient.swift
    MobileApiClient.swift
    AudioPlaybackService.swift
    SpeechInputService.swift
    DownloadService.swift
  ViewModels/
    LoginViewModel.swift
    HomeViewModel.swift
    CoachViewModel.swift
    VaultViewModel.swift
    EliteViewModel.swift
    SettingsViewModel.swift
  Views/
    LoginView.swift
    MainTabView.swift
    HomeView.swift
    CoachView.swift
    VaultView.swift
    EliteView.swift
    SettingsView.swift
    Components/
```

Do not directly port Jetpack Compose code. Use the Android app as a behavior reference and the screenshots as the visual reference.

## 5. Local Mac Setup

1. Clone the GitHub repo:

```bash
git clone https://github.com/david54766/hello2-greeting-page.git
cd hello2-greeting-page
git checkout codex/android-native-migration
```

2. Create a new native iOS Xcode project or workspace under `iOS/PrimaDonnaAI`.

3. Add local configuration through an uncommitted `.xcconfig` file:

```text
SUPABASE_URL=https://owjhaoiqiujpdndcwccl.supabase.co
SUPABASE_ANON_KEY=<publishable-or-anon-key>
WEB_APP_URL=https://app.thepreschoolprimadonna.com
AUTH_REDIRECT_URL=preschoolprimadonna://auth-callback
QA_EMAIL=<debug-temp-login-email>
QA_PASSWORD=<debug-temp-login-password>
```

4. Add `Secrets.xcconfig` to `.gitignore`.

5. Keep server secrets only in Supabase:

```text
OPENAI_API_KEY
ELEVENLABS_API_KEY
RAVEN_VOICE_ID
RESEND_API_KEY
RESEND_FROM_EMAIL
```

The Raven voice ID is already known by the backend and should not be hardcoded in UI code unless the backend contract specifically requires it.

## 6. Backend Contract

The iOS app should call Supabase directly only for safe client operations:

- Supabase Auth sign-in, sign-out, password reset.
- Read/write rows allowed by RLS using the publishable/anon key.
- Fetch current profile, centers, subscription status, visible Vault records, and visible Elite conversations.

The iOS app should call Supabase Edge Function `mobile-api` for protected or server-side work:

| Action | Client Input | Result |
|---|---|---|
| `run_coaching` | mode, prompt, selected center | strategy title, strategy body, session id, created date |
| `synthesize_raven_voice` | strategy text or session id | playable audio payload or audio URL |
| `generate_daily_recommendation` | center id | daily recommendation card data |
| `get_secure_vault_asset` | vault item id | signed download URL or safe open URL |
| `book_with_raven` | user/profile context | booking URL or schedule route |

OpenAI and ElevenLabs must never be called directly from the iPhone app.

## 7. Core Models

Define typed Swift models that mirror backend rows and API responses.

```swift
struct UserProfile: Identifiable, Codable {
    let id: UUID
    var displayName: String
    var email: String
    var tier: MembershipTier
}

enum MembershipTier: String, Codable {
    case essentials
    case pro
    case elite
}

struct Center: Identifiable, Codable {
    let id: UUID
    var name: String
    var city: String?
    var state: String?
    var enrollment: Int?
    var monthlyRevenue: Decimal?
    var facilityGoal: Int?
}

struct StrategySession: Identifiable, Codable {
    let id: UUID
    var mode: String
    var prompt: String
    var response: String?
    var createdAt: Date
}

struct VaultItem: Identifiable, Codable {
    let id: UUID
    var title: String
    var summary: String
    var category: String
    var tier: MembershipTier
}
```

Use `Decimal` for currency internally and format with `NumberFormatter` or Swift's currency formatting.

## 8. Shared Layout Tokens

Match the screenshots with these tokens:

| Token | Value |
|---|---|
| Screen background | Rose off-white, approximately `#FFF7FA` |
| Card background | White, `#FFFFFF` |
| Primary accent | Logo magenta, approximately `#E90092` |
| Selected chip fill | Soft lavender, approximately `#EFE2FF` |
| Selected nav fill | Soft pink, approximately `#FFD7EE` |
| Gold badge fill | Cream/gold, approximately `#F8F0E3` |
| Gold badge text | Muted gold, approximately `#B58B44` |
| Border | Warm gray/pink, approximately `#E6DDE2` |
| Primary text | Near black, approximately `#161316` |
| Secondary text | Warm gray, approximately `#5F5860` |
| Horizontal page margin | 24 pt on standard iPhone width |
| Card radius | 8 to 14 pt for content cards; 28 to 32 pt only for login card |
| Button radius | Capsule |
| Bottom tab height | Respect safe area, fixed bottom surface |

Typography guidance:

- Large page titles should feel editorial and serif. Use a bundled brand font if available. Otherwise use `Font.system(.largeTitle, design: .serif)` with a light/regular weight.
- Labels, chips, buttons, and card content should use system sans-serif.
- Section eyebrows are uppercase, magenta, bold, and tightly spaced.
- Avoid shrinking text with viewport width. Prefer wrapping or horizontal chip scrolling.

## 9. Navigation

Use a native `TabView` with five tabs:

| Tab | Label | Icon |
|---|---|---|
| Home | Home | house |
| Coach | Coach | text bubble |
| Vault | Vault | folder |
| Elite | Elite | crown |
| Settings | Settings | gear |

Do not include Billing or Plan as a tab. Billing should be removed from the app surface. Current plan belongs in Settings only.

Top bar:

- Center the Prima Donna logo with `AI` text beside it.
- Use a logout icon on the right.
- On screens that still need refresh, keep it subtle. The current screenshot set shows only logout on most iPhone views.
- Keep top content inside the iOS safe area.

## 10. Screen Instructions

### Login

Match `01-login.jpg`.

Requirements:

- Rose off-white full-screen background.
- Centered brand logo and `AI` at top.
- White rounded sign-in card with soft shadow.
- Title: `Sign in`.
- Subtitle: `Access your private AI command center.`
- Email and password fields in rounded white inputs with soft borders.
- `Forgot password?` magenta text aligned right.
- Primary button text: `Enter Command Center`; disabled state is pale gray.
- Debug-only secondary button: `Temp sign in`.
- Footer text: `Prima Donna AI`.

Remove the old Sign in/Create toggle buttons. The form is the sign-in screen.

### Home

Match `05-home.jpg`.

Requirements:

- Background remains rose off-white.
- Show `Center snapshot` title.
- Place membership badge on the upper-right, aligned with the title baseline area.
- Center pill below title, for example `PRIMA DONNA ACADEMY - MIAMI`.
- Snapshot cards:
  - Enrollment
  - Est. monthly revenue
  - Facility goal
- If there are multiple centers, use side swipe between center snapshots. Do not stack all centers vertically.
- Keep the first viewport focused on the snapshot and recommendation. Avoid unnecessary vertical scrolling when data fits.
- Recommendation section:
  - Title `Today's strategic recommendation`.
  - White card: `Raven daily brief`.
  - Copy: `Open the latest published Raven insight from...` or actual current insight summary.

### Coaching Engine

Match `04-coach.jpg`.

Requirements:

- Eyebrow: `COACHING ENGINE`.
- Large serif title: `Open a strategic session.`
- Horizontal mode chips:
  - CEO
  - Revenue
  - Marketing
  - Compliance
  - Systems
- Selected chip uses soft lavender fill.
- Under chips show the selected mode subtitle, for example `Vision - Leadership - Decisions`.
- White prompt box with placeholder `What's the situation?`.
- Prompt box must be white, not rose.
- Buttons:
  - `Speak` with microphone icon.
  - `Move` with paper-plane/send icon; disabled until prompt exists.
  - `Previous strategies` below those buttons, tightened and polished as a compact capsule button.
- Previous strategy drawer/sheet:
  - Should open as native sheet or bottom sheet.
  - Show previous sessions as compact cards.
  - Include Details and Play.
  - Remove any Use/reuse prompt button.
- Strategy result modal:
  - Rose off-white modal background.
  - Badge for mode.
  - Title `Strategy ready`.
  - Body text from OpenAI response.
  - Date pill.
  - Buttons: Close and Open strategy.
- Raven voice playback:
  - Strategy result and previous sessions must be playable in Raven voice.
  - Use backend `synthesize_raven_voice`; play with `AVAudioPlayer`.

### Template Vault

Match `03-vault.jpg`.

Requirements:

- Eyebrow: `TEMPLATE VAULT`.
- Large serif title: `The systems behind the strategy.`
- One-line horizontal category filter. Do not wrap chips to a second row.
- Categories:
  - All
  - Enrollment
  - Hiring
  - Operations
- Cards:
  - White card background.
  - Pink/gold rounded badges instead of plain text labels.
  - Bold title.
  - Summary body.
  - Details button.
  - Download action with download icon and magenta text.
- Respect tier access. Pro and Elite badges should display as badges.

### Elite Circle

Match `02-elite.jpg`.

Requirements:

- Default tab is Conversations, not Overview.
- Eyebrow: `ELITE CIRCLE`.
- Large serif title: `Welcome to the room.`
- Conversation access only. Do not include a Schedule chip, Zoom links, meeting slots, or a `Book with Raven` CTA.
- Latest conversations list:
  - White cards.
  - Title, author/team/date, message excerpt.
  - Replies count.
  - Open button with icon.
  - Delete icon where allowed.
- Raven/Zoom meeting scheduling is retired for Elite members.

### Settings

Requirements:

- Show profile information.
- Show current membership tier/status.
- Show centers and allow add/edit center.
- Show notification preferences if implemented.
- No Billing page, no Plan tab, and no Stripe checkout surface.

Add center form:

- Use the same card/input styling as login and settings cards.
- Fields:
  - Center name
  - City
  - State
  - Ages served
  - Enrollment
  - Capacity or facility goal
  - Tuition range
  - Staff
  - Notes/context for AI
- Use clean two-column rows only where iPhone width supports them without cramped labels. Otherwise stack.

## 11. Function Checklist

Build or verify these functions on iOS:

| Area | Function |
|---|---|
| Auth | Email/password sign-in |
| Auth | Forgot password |
| Auth | Sign out |
| Auth | Debug temp sign-in, excluded or disabled for release |
| Home | Fetch profile, tier, centers, center snapshot |
| Home | Swipe between centers |
| Home | Fetch or open Raven daily brief |
| Coach | Select strategy mode |
| Coach | Capture typed prompt |
| Coach | Optional speech-to-text into prompt |
| Coach | Submit prompt to `run_coaching` |
| Coach | Save returned session |
| Coach | Open result modal |
| Coach | Fetch previous strategies |
| Coach | Play Raven voice for strategy response |
| Vault | Fetch visible Vault items |
| Vault | Filter by category |
| Vault | Show category and tier badges |
| Vault | Open details |
| Vault | Download/open protected asset |
| Elite | Fetch conversations |
| Elite | Open conversation |
| Elite | Delete conversation where allowed |
| Settings | Read current plan |
| Settings | Read/add/edit centers |

## 12. Native iOS Services

Use these Apple frameworks:

- SwiftUI for screens/components.
- Combine or Swift concurrency for state and async loading.
- URLSession for Supabase REST and Edge Function calls.
- AVFoundation for Raven audio playback.
- Speech framework only if the Speak button will transcribe user voice into the prompt.
- SafariServices or ASWebAuthenticationSession for external booking/auth flows if needed.

Use Swift Package Manager for third-party dependencies only when they reduce real work. Keep the dependency surface small.

## 13. Error And Loading States

Every screen should handle:

- First load skeleton or quiet progress state.
- Empty state with useful next action.
- Network failure.
- Expired session.
- Permission/RLS denial.
- Disabled action state.
- Audio loading and playback failure.

Do not show raw backend errors to end users. Log the technical detail in debug builds and show short, human text in UI.

## 14. QA Checklist

Run on a small and large iPhone simulator plus one real iPhone if available.

Check:

- Cold start lands correctly based on session state.
- Login card matches screenshot spacing and centered logo.
- Bottom tab bar respects safe area.
- No text overlaps on smaller iPhone widths.
- Vault chips remain one-line horizontal scroll.
- Coaching prompt box is white.
- Previous strategies button is compact and below Speak/Move.
- Home snapshot does not unnecessarily scroll when content fits.
- Multiple centers swipe horizontally.
- Elite defaults to Conversations.
- Billing/Plan tab is absent.
- Current plan appears only in Settings.
- Raven voice plays from strategy result and previous strategies.
- No OpenAI, ElevenLabs, service-role, or Stripe secret is present in the iOS app bundle.

## 15. Release Notes For The Mac Builder

- Treat this as a native iPhone app build, not a web wrapper.
- Use the Android implementation only as behavior reference.
- The attached images are the visual contract.
- Keep Stripe out for now.
- All server-side AI and voice work goes through Supabase Edge Functions.
- Store local dev credentials in an ignored `.xcconfig` file.
- Before TestFlight or App Store release, remove or gate temp sign-in behind debug-only compilation.

## 16. Handoff Assets

The Word/PDF version of this document embeds all five sample screens. The raw images are also included in `handoff-ios/assets`:

- `01-login.jpg`
- `02-elite.jpg`
- `03-vault.jpg`
- `04-coach.jpg`
- `05-home.jpg`
