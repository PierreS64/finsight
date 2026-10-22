# FinSight API and integration conventions

This records the behavior implemented on `develop` as of 2026-10-21. Use it when adding or reviewing a feature.

## Modules and authentication

- Put code under `com.finsight.<feature>` and expose application endpoints below `/api/v1/`. `GET /actuator/health` is public; every other request requires a bearer token.
- Supabase Auth signs the user's JWT. Spring Security validates issuer, JWKS signature (ES256), and the `authenticated` audience before the controller runs. Use the verified JWT subject as the owner UUID. Never accept an owner ID from request JSON or query parameters.
- Scope each read, update, and delete to that owner. An ID belonging to someone else must not reveal its record; current item endpoints return 404. Validate referenced account and category ownership before writes. Database foreign keys bind transactions and transfers to accounts of the same owner.
- The backend connects with its private database credential. Web and Android use only the Supabase publishable key and the signed user token. Do not put service-role credentials in clients or logs.

## Endpoints and responses

- Use `GET` for reads, `POST` to create or calculate a temporary scenario, `PUT` to replace a saved resource, and `DELETE` to remove it. The What-if `POST /api/v1/what-if` is explicitly read-only and never persists a scenario.
- JSON uses camelCase. Return `201` after creation, `204` for successful deletion or receipt replacement, `400` for invalid input, `401` for missing/invalid authentication, `404` for missing or other-owner records, and `409` when a referenced category cannot be deleted. Current error bodies are Spring-generated; clients should branch on HTTP status, not parse a fixed error schema.
- Month parameters are ISO `YYYY-MM`; dates are ISO `YYYY-MM-DD`. Monthly queries use an inclusive first day and exclusive first day of the next month. Reports that depend on today's date use Asia/Bangkok.
- `GET /api/v1/transactions/history` is the paged transaction endpoint: zero-based `page`, `size` from 1 to 50 (default 10), `sort=asc|desc`, and stable order by occurrence date, creation time, then ID. It returns `items`, `page`, `size`, `totalElements`, and `totalPages`. The basic transaction list is unpaged and intended for existing small-screen flows; use history for large lists.
- `POST /api/v1/receipts/recognize` accepts an authenticated multipart image and returns OCR suggestions without creating a transaction. `GET/POST /api/v1/goals` and `PUT/DELETE /api/v1/goals/{id}` manage owner-scoped savings goals.
- `GET/POST /api/v1/accounts/{accountId}/reconciliations` and `DELETE /api/v1/accounts/{accountId}/reconciliations/{id}` record and manage owner-scoped balance snapshots. Each snapshot returns its expected, observed and signed difference amounts.
- `GET/POST /api/v1/merchants` and `PUT/DELETE /api/v1/merchants/{id}` manage names scoped to the authenticated user. A transaction may include a nullable `merchantId`; both the API ownership check and composite database foreign key require the same owner. History search includes merchant names. A referenced merchant cannot be deleted.
- `POST /api/v1/statements/preview?accountId=...` accepts an authenticated multipart CSV UTF-8 or XLSX file, returns parsed rows and duplicate hints, and writes nothing. `POST /api/v1/statements/import` accepts reviewed rows with category IDs and creates them atomically. File digest and row number prevent reimporting the same file row for the same owner. See `docs/decisions/0005-statement-import.md`.
- `GET /api/v1/net-worth` returns current account balances, manually estimated assets/liabilities and exact totals. `POST /api/v1/net-worth/items` and `PUT/DELETE /api/v1/net-worth/items/{id}` manage owner-scoped current estimates. Negative account balances count as liabilities; savings goals are excluded.
- `GET /api/v1/financial-health` returns a current-month score, each available/missing component and data coverage. A null score means there is no usable input. See `docs/decisions/0007-financial-health-score.md` for exact thresholds.
- `GET /api/v1/subscription-suggestions` returns read-only possible monthly expense patterns from owner-scoped transactions. It never schedules or writes a transaction. See `docs/decisions/0008-subscription-suggestions.md` for the heuristic and limits.

## Money and calculations

- Accept money as JSON decimal strings or JSON numbers with at most two fractional digits and up to 17 integer digits. Use Java `BigDecimal` and database `NUMERIC(19,2)`; return decimal strings to avoid JavaScript floating-point rounding. Web and Android format decimal strings for display.
- Income and expense affect cash flow and budgets. Transfers move value between two owned accounts and must not change total balance, income, expense, or budgets. Account current balance is opening balance plus income minus expense plus incoming transfers minus outgoing transfers.
- Keep reporting formulas and missing-data behavior visible in the API and UI. Do not infer a savings rate without income or a trend without a comparison base. Hypothetical values never become stored transactions or budgets.
- Savings goals store a manually reported saved amount as planning data. Their progress and remaining amount use decimal arithmetic; goal edits do not move account funds or change cash flow.
- Reconciliation difference is observed minus the account's computed balance at recording time. It is an audit value and never changes account balances or transactions.
- Net worth equals positive account balances plus manually entered assets, minus absolute negative account balances and manually entered liabilities. These current estimates do not change transactions or account balances.

## Schema and review

- Flyway owns schema changes. Add matching versioned scripts under `db/migration/postgresql/` and `db/migration/h2/` for the same new version; do not edit migrations already applied to Supabase. Production history lives in the `finsight` schema while tables live in `public`.
- Keep `spring.jpa.hibernate.ddl-auto=validate`. PostgreSQL tables are protected from `anon` and `authenticated` grants and have RLS enabled; owner checks in Spring remain mandatory because the API uses a private database connection.
- For each Jira feature, commit separately on `develop` or a feature branch, run the relevant backend, web, and Android checks, and record the commands actually run in `docs/progress.md`. Before marking Done, review the diff for owner scoping, money precision, migration safety, secrets, and mobile/web behavior. A green H2 test with mocked JWT does not prove a real Supabase sign-in flow.
- Do not merge into `main` or force-push automatically. Pull requests, when present, need review and CI evidence before integration; as of this document, no project PR has been created.
