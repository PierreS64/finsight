# FinSight Jira backlog seed

Target: a new Jira Software Scrum project named **FinSight**, key **FIN**. This file is a preparation artifact; no issue is claimed to exist in Jira until it is created there. Use the project's own generated issue keys after import.

## Epics

| Epic | Outcome |
| --- | --- |
| Authentication & User | Secure registration, sign-in, sign-out, and owner-scoped profile |
| Financial Accounts | User-maintained cash, bank, and wallet records with exact balances |
| Transaction Management | Income, expense, transfer, category, search, and filter workflows |
| Budget & Planning | Budgets, goals, recurring entries, alerts, and reconciliation |
| Financial Overview | Dashboard, charts, and explainable totals |
| Financial Intelligence | Forecast, safe-to-spend, insights, simulations, and health score |
| Automation | Statement import, OCR, merchants, categorization, subscriptions |
| AI Interaction | Assistant grounded in FinSight's own financial calculations |
| DevOps & Infrastructure | Repository, CI, database, deployment, and observability |

## First sprint candidate

| Task | Epic | Acceptance criteria | Depends on |
| --- | --- | --- | --- |
| Protect Git branches and document review flow | DevOps & Infrastructure | `main` requires review and passing CI; `develop` remains the integration branch; no forced push | Private GitHub repository (done) |
| Connect Windows Jenkins agent | DevOps & Infrastructure | Node `windows-finsight` is online with Java 21, Git, Node/npm, and Docker CLI available | Jenkins controller and node (created) |
| Run Jenkins pipeline from `develop` | DevOps & Infrastructure | Backend tests, web lint/build, mobile typecheck/Expo Doctor, and Docker image build pass with archived JUnit results | Online agent and read-only GitHub credential |
| Provision FinSight Supabase project | DevOps & Infrastructure | New project in the intended organization and Singapore region; credentials stored outside Git | Supabase account access |
| Add initial owner-scoped schema migration | Authentication & User | Flyway applies to real PostgreSQL; rerun is safe; no Hibernate schema update | Supabase project |
| Verify Supabase JWT in API | Authentication & User | Valid issuer/JWKS token reaches a protected endpoint; missing, expired, and malformed tokens return 401 | Supabase project and auth settings |
| Implement profile endpoint and ownership tests | Authentication & User | A user can read/update only their own profile; API tests cover cross-user denial | Schema and JWT verification |
| Build web sign-in/sign-out | Authentication & User | User can sign in, refresh, sign out, and see errors without exposing tokens in logs | Supabase Auth project |
| Build Android sign-in/sign-out | Authentication & User | Same flow works on Android SDK 35 emulator; session persistence is verified | Supabase Auth project |

Suggested workflow: **To Do → In Progress → Code Review → Testing → Done**. Keep completed setup tasks with actual verification evidence. Split the later epics into sprint-sized stories after the Phase 2 auth/data path works.
