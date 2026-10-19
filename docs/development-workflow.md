# Development workflow and backlog

Use Scrum sprints with small issues, each with acceptance criteria and actual test evidence. Suggested Git flow: stable `main`, integration `develop`, and `feature/FIN-XX-description` or `fix/FIN-XX-description` branches. Do not merge to `main` automatically.

| Phase | Deliverable | Acceptance criteria |
| --- | --- | --- |
| 0 | Monorepo, three app scaffolds, local tests, docs, Docker | API health, web build/lint, mobile typecheck/Expo Doctor, Docker build and Android render when environment permits |
| 1 | GitHub, Jenkins, Jira | Private repository, pipeline passes on Windows agent, backlog and sprint created |
| 2 | Supabase, Flyway, JWT, login/profile | Real PostgreSQL migration, signed token works, missing/invalid token 401, profile ownership tests |
| 3 | Accounts, categories, transactions, transfer, dashboard | Exact money, isolated ownership, transfers excluded from income/expense, UI workflows verified |
| 4 | Budgets, goals, recurring, reconciliation | Calculations and alerts tested with edge cases |
| 5 | Forecast, safe-to-spend, insights, simulations | Deterministic explainable metrics and boundary tests |
| 6 | OCR, import, merchant, subscriptions, AI chat | Explicit data provenance, duplicate handling, AI explains backend metrics |
| 7 | End-to-end, security, demo | Reproducible deployment and documented evidence |

Proposed initial Jira epics: Authentication & User; Financial Accounts; Transaction Management; Budget & Planning; Financial Overview; Financial Intelligence; Automation; AI Interaction; DevOps & Infrastructure.

First issues to create after Jira access: configure new GitHub repository and branch protections; provision Jenkins controller and agent; run CI; create Supabase project; design user profile migration; verify JWT with real Supabase token; implement web/mobile login. Each issue should include dependencies and acceptance checks above.
