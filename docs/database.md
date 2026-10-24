# Database

The real database is Supabase PostgreSQL. Flyway V1–V13 are applied; matching versioned PostgreSQL and H2 scripts are in `backend/src/main/resources/db/migration/`. PostgreSQL migration history lives in the separate `finsight` schema; application tables live in `public`. Existing migrations must not be edited after deployment. Hibernate uses `ddl-auto=validate`.

| Version | Main records |
| --- | --- |
| V1 | User profiles |
| V2 | Virtual financial accounts |
| V3 | Default and owner categories |
| V4 | Income and expense transactions |
| V5 | Private transaction receipt bytes |
| V6 | Monthly total and category budgets |
| V7 | Transfers between owned accounts |
| V8 | Recurring rules and processed occurrences |
| V9 | Savings goals |
| V10 | Account reconciliation snapshots |
| V11 | Owner-scoped merchants and transaction merchant links |
| V12 | Statement import row provenance and duplicate guard |
| V13 | Manually estimated assets and liabilities |

Every private table enables PostgreSQL row level security and revokes direct table access from `anon` and `authenticated`; the API uses a private database credential and performs its own owner checks. Owner foreign keys reference Supabase `auth.users`. Composite foreign keys and application checks bind related account, transaction and merchant records to one owner where needed. Amounts are `NUMERIC(19,2)` and Java uses `BigDecimal`. Transfers are separate from income and expense transactions. Statement imports use an owner/file digest/row uniqueness constraint. Receipt images are stored privately in PostgreSQL; no Supabase Storage bucket is required for the implemented flow.

The local profile uses in-memory H2 with placeholder JWKS settings. It validates migrations and most behavior but does not prove the real Supabase login path. For connection and migration checks, follow [setup](setup.md) and run the read-only [smoke script](../scripts/smoke-supabase-api.ps1). Never run Hibernate schema creation or update against real data.
