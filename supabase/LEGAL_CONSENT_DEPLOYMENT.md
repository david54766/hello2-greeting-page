# Legal Consent Migration Deployment

The website and Android app currently use the Lovable-managed Supabase project
`ihiqixkufsjeplnkwkao`. Apply this repository migration to that exact project before
publishing a build that contains the legal consent gate:

`supabase/migrations/20260721090000_create_legal_acceptances.sql`

## Lovable Chat Prompt

```text
Apply the repository migration
supabase/migrations/20260721090000_create_legal_acceptances.sql to the Supabase
project connected to this Lovable application. Do not change the table, version
values, row-level security policies, grants, or unique constraint. Confirm that
public.legal_acceptances exists, RLS is enabled, authenticated users can select
and insert only their own rows, anon has no access, and the unique constraint is
(user_id, terms_version, privacy_version). Do not apply it to a different
Supabase project.
```

After deployment, verify with an existing account that:

1. Signing in displays the consent gate once.
2. Accepting creates a row with terms and privacy version `2026-07-21.v1`.
3. Signing out and back in does not display the gate again.
4. Another user cannot read or create acceptance rows for that account.

The live Lovable page also injects its own analytics script before the React app
starts. Disable that analytics integration in Lovable or configure it to wait for
optional analytics consent; the React cookie banner cannot prevent an already
injected script from starting.
