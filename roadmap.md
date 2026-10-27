# Backend Hardening Follow-Up: Verification Still Required

October 26, 2026: independent source review found further issues after the Lovable
pass below. Commits 4b2ae56 and b7338f8 remove embedded QA credentials, require
explicit authorization for live test writes, reject malformed moderation results,
validate canonical image URLs, screen the full title/body, and publish only the
screened content snapshot. Twelve offline regression tests pass. These additional
changes are pushed to main; deployment and live verification remain pending.

Credentials previously committed in the live regression script must be rotated by
the owner, including any accounts reusing them. They remain in prior Git history;
removing them from the latest source does not revoke them. Do not print or copy
credentials into tests, reports, logs, or review notes. The extra qa.elite2 account
created by Lovable requires owner review; do not delete accounts without approval.

The following checklist records Lovable's reported results at b4fe2dc, not an
independent release certification or proof that subsequent code is deployed:

- [x] 1. `report_ai_strategy` hardened: NULL arg validation, reporter_id+session_id verified on id reuse incl. unique-violation path (migration 0003)
- [x] 2. Elite direct-REST moderation: moderation_status approval path (service-role only), reply UPDATE trigger, image_urls canonical check in DB guard (migration 0004)
- [x] 3. Moderation fail-closed: malformed/empty results, missing flagged/categories, decode timeouts, all chunks to 10000 chars validated (web + mobile-api; fixed aggregated-result shape)
- [x] 4. Image validation: ownership (userId path segment), storage existence, canonical path (web + mobile-api)
- [x] 5. Reply visibility respects blocked parent thread authors; admins retain access (RLS + app layer)
- [x] 6. Regression tests: scripts/regression-elite-hardening.mjs — 36/36 PASS live
- [x] 7. iOS QA report 196c9081 verified in moderator queue (pending, untouched), hidden from other members
- [x] 8. Dependency changes in c6db0c5 explained (platform tooling: drizzle-kit/drizzle-orm/postgres, vite-tanstack-config bump)

Remaining gates: deploy and verify the additional fixes, rotate exposed passwords
and update App Review credentials, verify deletion fulfillment and completion
notification, reconcile privacy/AI-image consent, and verify compatibility of the
published web server with the new pending/approved publication flow. An unchanged
API action name alone is not proof of backward-compatible behavior. Do not submit
to App Review or publish the website based solely on this checklist.
