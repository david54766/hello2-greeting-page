# Backend hardening follow-up (release blockers)

- [ ] 1. Harden `report_ai_strategy`: NULL arg validation, verify reporter_id AND session_id on id reuse (incl. unique-violation path)
- [ ] 2. Elite direct-REST moderation: server-enforced approval path (moderation_status), reply UPDATE trigger, image_urls canonical check in DB guard
- [ ] 3. Moderation fail-closed: malformed/empty results, missing flagged/categories, decode timeouts, chunk + validate all text up to 10000 chars (web + mobile-api)
- [ ] 4. Image validation: ownership (userId path segment), storage object existence, canonical path (web + mobile-api)
- [ ] 5. Reply visibility respects blocked parent thread authors; admins/moderators keep access to blocked content (RLS + app layer)
- [ ] 6. Regression tests (live, reproducible) + run them
- [ ] 7. Verify owner-authorized iOS QA AI report (196c9081-6f13-4783-961e-a9b8e5bc74f3) reaches moderator queue — do not delete/act on it
- [ ] 8. Explain unrelated dependency changes in c6db0c5 (drizzle-kit/drizzle-orm/postgres, vite-tanstack-config bump)

Constraints: no breaking Android/iOS contracts, no account deletion/tier changes/frontend/legal changes, keep center focus + voice + API contracts. List any un completable protection as a release blocker.
