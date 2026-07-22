# Prima Donna AI iOS Xcode Update Prompt

You are Codex working on the native iOS/Xcode version of Prima Donna AI. Update the iPhone app so it matches the latest approved Android behavior and styling.

Use the Android app as the source of truth for recent product decisions, but implement natively in SwiftUI/UIKit according to the existing iOS project patterns. Do not expose Supabase, OpenAI, ElevenLabs, Firebase, Resend, or service-role secrets in client code. Use existing server/API routes for AI, voice, vault downloads, push registration, and protected data.

## Required Product Updates

1. Auth and cold start
- Remove any temp sign-in/test bypass button from production UI.
- Sign-in screen should show the larger Prima Donna logo centered at top with “AI” to the right.
- Keep the sign-in card polished like Android: off-white rose background, white card, soft border/shadow, large serif “Sign in”, email/password fields, forgot password link, and a disabled “Enter Command Center” button until email/password are present.
- Add a password eye toggle.
- Show a user-facing invalid-password/auth-failure notice, not silent failure.
- Cold start should restore a valid saved session, refresh expired sessions, or land on sign-in without hanging.

2. Responsive layout
- Keep iPhone as the priority, but prevent iPad/large landscape layouts from stretching cards edge-to-edge.
- Cap main content width around the Android equivalent of `760dp`, center content on wide screens, and keep bottom tabs full width.
- Verify no text/button clipping on iPhone SE, iPhone 15/16 size, iPhone Pro Max, and iPad landscape.

3. Main navigation
- Bottom tabs only: Home, Coach, Vault, Elite, Settings.
- Remove Billing/Plan as a standalone tab/page.
- Keep Settings as the place where current plan is displayed.
- Keep top bar/logo consistent with Android: larger logo, refresh action, sign-out action.

4. Home / Command Center
- Home opens directly to Center snapshot.
- Use the off-white rose background.
- Show center snapshot cards: Enrollment, Est. Monthly Revenue, Facility Goal.
- Replace “children per staff” with “Facility Goal”.
- If there are multiple centers, allow horizontal paging/side scroll between center snapshots.
- Show Pro or Elite badge near the Center snapshot title only for Pro/Elite users. Essentials does not need a badge.
- Include Today’s strategic recommendation with Raven daily brief and playable strategic recommendation video when available.
- Ensure Home data comes from the same live Supabase/server sources as web/Android.

5. Coaching Engine / Strategy
- Match Android layout: “Coaching Engine”, “Open a strategic session.”, mode chips for CEO, Revenue, Marketing, Compliance, Systems, white “What’s the situation?” input box, Speak button, Move button, and polished Previous strategies button below the action row.
- Remove any “Use” button for previous prompts.
- Previous strategies should open a polished history sheet/sidebar/list.
- Session details should allow playing the Raven voice response.
- Use the existing server-side AI/voice endpoints. Do not call OpenAI or ElevenLabs directly from the iOS app.
- Handle Raven voice generation timeouts gracefully. If the server supports chunked output, consume/play chunks or show progressive loading instead of leaving the UI stuck.

6. Vault
- Vault data must load dynamically from the live backend, not from bundled/static test data.
- Show the latest vault files, including newly added test files.
- Use badge-style category/tier labels, not plain text.
- Category tabs should be a single horizontal row with side scroll if needed: All, Enrollment, Hiring, Operations.
- Details and Download actions should work from the same signed/private download flow as Android/web.
- Validate storage paths before requesting downloads and show a clear error if a path is invalid.

7. Elite Circle
- Essentials/Pro users must see Elite locked with current plan messaging.
- Elite users should default to Elite conversations, not an overview/scheduler.
- Remove Zoom links, Raven scheduler, “Book with Raven”, and meeting scheduling UI completely.
- Elite conversations must load from live backend.
- Elite users can add images to conversation posts/replies.
- Users can delete only their own posts/replies. Do not show delete controls on other users’ content.
- Add a Report button/action on conversation content for compliance review.

8. Settings and onboarding
- Onboarding should match the polished sign-in styling: rose background, white card, aligned fields, clean spacing.
- Autodetect timezone using the device timezone and prefill it unless the backend profile already has a meaningful value.
- Settings should show current membership plan/status, business profile fields, timezone, and notification preferences.
- Remove any billing-management CTA while Stripe billing is intentionally ignored.

9. Push notifications
- Wire iOS push registration according to the current backend/admin push system.
- Respect user notification settings from Settings.
- Persist push token with the signed-in user and remove/invalidate it on sign out if the backend supports that.
- Admin-sent push notifications should be receivable on device once APNs/Firebase configuration is present.

10. Branding assets
- Use the latest Prima Donna logo and app icon.
- App icon needs extra white/safe padding so it is not clipped by iOS icon masks.
- Top logo should be larger than the older build and span farther across the top bar, but must not collide with “AI”, refresh, or sign-out actions.

11. Legal consent, privacy, and cookies
- Use these exact current versions so acceptance is shared across web, Android, and iOS:
  - Terms: `2026-07-21.v1`
  - Privacy: `2026-07-21.v1`
- After restoring or creating a Supabase session, query `public.legal_acceptances` for the signed-in user and both current versions. Do not expose the main workspace until a matching row exists.
- If acceptance is missing, show a polished rose/white full-screen legal gate with links to:
  - `https://app.thepreschoolprimadonna.com/terms`
  - `https://app.thepreschoolprimadonna.com/privacy`
  - `https://app.thepreschoolprimadonna.com/cookies`
- Require an unchecked-by-default control reading: “I agree to the Terms of Service and acknowledge the Privacy Policy.” Enable “Agree and continue” only after that affirmative action. Provide “Decline and sign out.”
- On acceptance, insert into `legal_acceptances`: `user_id`, `terms_version`, `privacy_version`, `platform = 'ios'`, the iOS app version/build, a short device/app user-agent value, and server-generated `accepted_at`. Use the unique conflict key `(user_id,terms_version,privacy_version)` with ignore-duplicate behavior.
- Require the same Terms/Privacy checkbox before in-app account creation. Auth metadata may include the versions, but metadata is not the authoritative acceptance record; the database row is.
- Add a Legal and Privacy section in Settings showing the accepted versions and links to Terms, Privacy, and Cookies.
- Do not display a browser cookie banner over native SwiftUI screens. The Cookie Policy should explain that native screens use secure local storage rather than ordinary browser cookies. Any embedded `WKWebView` content still follows the website cookie choice.
- Do not request notification, microphone, photo-library, camera, or tracking permission before legal acceptance. Ask at the point where the related feature is used and explain why.
- Do not add App Tracking Transparency unless the app actually tracks users across other companies' apps or websites. If tracking is later added, implement Apple ATT and do not initialize tracking before authorization.
- The Supabase migration `20260721090000_create_legal_acceptances.sql` must be applied before distributing this iOS build.

12. Coaching prompt quality gate
- Treat `mobile-api` as authoritative for prompt quality. A coaching response with `ok = false` and `code = 'prompt_needs_clarification'` is not a generated strategy and must never open or save a strategy result.
- Show the returned `error` as a concise inline notice near the prompt. Preserve the user's text so they can add the missing situation, goal, constraint, or metric and resubmit.
- Reject only obvious empty, subjectless, or keyboard-smash prompts locally before making the network request. Allow coherent childcare-business questions even when they are broad or do not include metrics. Do not duplicate the full semantic classifier in Swift.
- Do not add rejected prompts to previous strategies, trigger Raven voice, or show a success confirmation.

## QA Acceptance

- Build succeeds in Xcode with no new warnings that indicate broken assets or missing config.
- Sign-in works with a real Essentials account and shows a visible error for a wrong password.
- Essentials account cannot access Elite conversations.
- Elite account can access conversations, add images, and report content.
- Vault reflects live backend updates.
- Strategy session creation works and previous strategies load.
- Raven voice playback works or shows a graceful timeout/progress state.
- Push permission prompt appears once and Settings preferences are respected.
- Existing and newly created accounts cannot enter the workspace until the current Terms and Privacy versions are accepted, and acceptance remains valid after reinstall/sign-in on another device.
- Subjectless, incoherent, nonsense, and out-of-scope coaching prompts return a clarification notice, create no strategy session, and trigger no Raven voice playback. Broad but coherent childcare-business questions must still generate a strategy.
- Terms, Privacy, and Cookie links open successfully from the legal gate and Settings.
- Screenshots are checked on small iPhone, standard iPhone, large iPhone, and iPad landscape for overlap, clipping, and excessive edge-to-edge stretching.

## App Store Compliance Checks Still Required

- Add an in-app account deletion path and a public web deletion-request URL before App Store submission.
- Elite Circle user-generated content must support reporting content/users, blocking abusive users, filtering/moderation, and timely admin review.
- Raven AI output must include an in-app “Report response” action for offensive or unsafe generated content.
- Complete App Store Connect App Privacy answers, include the public Privacy Policy URL, and provide a working reviewer demo account.
- Confirm all permission usage descriptions are present and match real behavior. Avoid requesting permissions on launch.
- Have qualified counsel review the Terms, Privacy Policy, retention language, subscription language, and applicable U.S./international privacy requirements before release.
