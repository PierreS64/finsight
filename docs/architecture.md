# Architecture

FinSight is a modular monolith: React/Vite web and Expo Android clients sign in through Supabase Auth, then call the Spring Boot API with a bearer JWT. The API validates the configured Supabase issuer, JWKS signature and `authenticated` audience. Controllers derive the owner UUID from the verified token, apply ownership checks and use a private PostgreSQL connection. Only the health endpoint is public. There is no bank connection or bank credential collection.

```text
React web ────┐
              ├─ Supabase Auth → signed JWT → Spring Boot API → Supabase PostgreSQL
Expo Android ─┘                           │
                                         ├─ local Tesseract OCR
                                         └─ optional OpenAI Responses (aggregate facts + question only)
```

The API owns money calculations, budgets, dashboards, insights, forecasts, category suggestions and financial health. It uses `BigDecimal` and returns monetary decimal strings. Transfers affect account balances but not income, expense or budget spend. Receipt bytes are private PostgreSQL records; OCR runs locally and only proposes fields for user review. AI chat is optional, server-side only, and explains backend-calculated current-month facts without writing financial data. Each transaction, merchant, goal, budget and related record is scoped to the authenticated owner.

Feature packages under `backend/src/main/java/com/finsight/` contain controllers and stores for auth, accounts, categories, transactions, transfers, merchants, budgets, goals, reconciliation, overview, intelligence and AI. The web and Android apps share the FinSight navy/emerald visual language but have separate client implementations. The supplied design-reference folders are user-owned, untracked inputs.

Flyway owns schema changes. PostgreSQL migrations live under `db/migration/postgresql/`; matching H2 migrations allow local tests. The real Supabase profile uses `finsight` for Flyway history and `public` for application tables. Hibernate validates the schema and never creates or updates it. See [database](database.md), [API](api.md) and [integration conventions](api-conventions.md).
