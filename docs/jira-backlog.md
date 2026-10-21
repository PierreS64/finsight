# FinSight Jira backlog

Target: the Jira Software Scrum space **F1nS1ght**, key **FNS**, at `https://finsight-team.atlassian.net/jira/software/projects/FNS/summary`. The issues below were checked in Jira on 2026-10-20. The user created FNS-1 and FNS-2; FNS-3 through FNS-18 were created during backlog setup. FNS-19 through FNS-37 were created from the team assignment table in `bcao_devapp.docx`. Jira has an empty **FNS Sprint 1** that has not been started.

## Epics

| Key | Epic | Outcome |
| --- | --- | --- |
| FNS-3 | Authentication & User | Secure registration, sign-in, sign-out, and owner-scoped profile |
| FNS-4 | Financial Accounts | User-maintained cash, bank, and wallet records with exact balances |
| FNS-5 | Transaction Management | Income, expense, transfer, category, search, and filter workflows |
| FNS-6 | Budget & Planning | Budgets, goals, recurring entries, alerts, and reconciliation |
| FNS-7 | Financial Overview | Dashboard, charts, and explainable totals |
| FNS-8 | Financial Intelligence | Forecast, safe-to-spend, insights, simulations, and health score |
| FNS-9 | Automation | Statement import, OCR, merchants, categorization, subscriptions |
| FNS-10 | AI Interaction | Assistant grounded in FinSight's own financial calculations |
| FNS-1 | DevOps & Infrastructure | Repository, CI, database, deployment, and observability |

## First sprint candidate

| Key | Task | Epic | Acceptance criteria | Depends on |
| --- | --- | --- | --- | --- |
| FNS-11 | Protect Git branches and document review flow | DevOps & Infrastructure | `main` requires review and passing CI; `develop` remains the integration branch; no forced push | Private GitHub repository (done) |
| FNS-2 | Connect Windows Jenkins agent | DevOps & Infrastructure | Node `windows-finsight` is online with Java 21 agent runtime, JDK 17 build tool, Git, Node/npm, and Docker CLI available | Jenkins controller and node (created) |
| FNS-12 | Run Jenkins pipeline from `develop` | DevOps & Infrastructure | Backend tests, web lint/build, mobile typecheck/Expo Doctor, and Docker image build pass with archived JUnit results | Online agent and read-only GitHub credential |
| FNS-13 | Provision FinSight Supabase project | DevOps & Infrastructure | New project in the intended organization and Singapore region; credentials stored outside Git | Supabase account access |
| FNS-14 | Add initial owner-scoped schema migration | Authentication & User | Flyway applies to real PostgreSQL; rerun is safe; no Hibernate schema update | Supabase project |
| FNS-15 | Verify Supabase JWT in API | Authentication & User | Valid issuer/JWKS token reaches a protected endpoint; missing, expired, and malformed tokens return 401 | Supabase project and auth settings |
| FNS-16 | Implement profile endpoint and ownership tests | Authentication & User | A user can read/update only their own profile; API tests cover cross-user denial | Schema and JWT verification |
| FNS-17 | Build web sign-in/sign-out | Authentication & User | User can sign in, refresh, sign out, and see errors without exposing tokens in logs | Supabase Auth project |
| FNS-18 | Build Android sign-in/sign-out | Authentication & User | Same flow works on Android SDK 35 emulator; session persistence is verified | Supabase Auth project |

Configured Jira board workflow: **To Do → In Progress → Code Review → Testing → Done**. The two added statuses use Jira's In progress category. Keep completed setup tasks with actual verification evidence. Split the later epics into sprint-sized stories after the Phase 2 auth/data path works.

Jenkins evidence for FNS-2 and FNS-12: job [`finsight-develop`](http://127.0.0.1:8085/job/finsight-develop/) ran build [#2](http://127.0.0.1:8085/job/finsight-develop/2/) successfully from `develop` commit `5e2532d5ac211b9d42895e1cd9163319fad6c584`. The Windows agent was Online; JDK 17 compiled the API, 9 JUnit tests passed with 0 failures/skips, web lint/build passed, mobile TypeScript and Expo Doctor (18/18) passed, and Docker image `finsight-api:ci` was built. The private GitHub repository is read through a repository-scoped, read-only SSH deploy key. Jira statuses have not yet been changed from To Do; review the build evidence before transitioning those issues.

## Team assignments from the project report

The report's **phân chia công việc** table assigns five feature areas. Jira tasks follow the repository's Spring Boot/Supabase architecture where the report's draft technology descriptions differ. The new tasks include scope and acceptance criteria in their descriptions. Task status reflects subsequent implementation and review; Sprint 1 has not started.

| Planned owner | Jira tasks | Assignment state |
| --- | --- | --- |
| Nguyễn Thuận Phong | [FNS-19](https://finsight-team.atlassian.net/browse/FNS-19) Insight Cards; [FNS-20](https://finsight-team.atlassian.net/browse/FNS-20) Explain My Spending; [FNS-21](https://finsight-team.atlassian.net/browse/FNS-21) Spending Behavior Profile; [FNS-22](https://finsight-team.atlassian.net/browse/FNS-22) What-if Simulator; [FNS-23](https://finsight-team.atlassian.net/browse/FNS-23) architecture/API conventions/integration. Existing [FNS-14](https://finsight-team.atlassian.net/browse/FNS-14) schema and [FNS-15](https://finsight-team.atlassian.net/browse/FNS-15) JWT also match his architecture/security remit. | Assigned to Nguyễn Thuận Phong |
| Nguyễn Tiến Thành | [FNS-24](https://finsight-team.atlassian.net/browse/FNS-24) budgets; [FNS-25](https://finsight-team.atlassian.net/browse/FNS-25) dashboard; [FNS-26](https://finsight-team.atlassian.net/browse/FNS-26) charts; [FNS-27](https://finsight-team.atlassian.net/browse/FNS-27) spending trends. | Assigned to Tiến Thành Nguyễn |
| Nguyễn Thị Minh Anh | [FNS-28](https://finsight-team.atlassian.net/browse/FNS-28) transaction CRUD; [FNS-29](https://finsight-team.atlassian.net/browse/FNS-29) history/search/filter; [FNS-30](https://finsight-team.atlassian.net/browse/FNS-30) recurring transactions. | Assigned to Minh Anh Nguyễn |
| Hàn Minh Tùng | [FNS-31](https://finsight-team.atlassian.net/browse/FNS-31) receipt OCR; [FNS-32](https://finsight-team.atlassian.net/browse/FNS-32) forecast; [FNS-33](https://finsight-team.atlassian.net/browse/FNS-33) upcoming expenses; [FNS-34](https://finsight-team.atlassian.net/browse/FNS-34) safe-to-spend. | Assigned to Hoshino Meito (Jira display name) |
| Chu Đức Ngọc Minh | [FNS-35](https://finsight-team.atlassian.net/browse/FNS-35) account lifecycle; [FNS-36](https://finsight-team.atlassian.net/browse/FNS-36) categories; [FNS-37](https://finsight-team.atlassian.net/browse/FNS-37) budget alerts. Existing FNS-16 through FNS-18 cover part of the account flow and should be reviewed before implementation. | Assigned to Minh Chu |

On 2026-10-21, Jira confirmed all 14 Tasks FNS-24 through FNS-37 assigned to their planned owners above. FNS-24, FNS-25, FNS-28, FNS-29, and FNS-36 remained in Testing; the other nine remained To Do. FNS-19 through FNS-23 and FNS-14/FNS-15 remain assigned to Nguyễn Thuận Phong.

The eight initially unassigned Epics FNS-3 through FNS-10 and six Tasks FNS-11, FNS-12, FNS-13, FNS-16, FNS-17, and FNS-18 were assigned to Nguyễn Thuận Phong on 2026-10-21. Jira JQL `project = FNS AND assignee is EMPTY` then returned no issues. [FNS-38](https://finsight-team.atlassian.net/browse/FNS-38) tracks owner-scoped transfers between accounts under the Transaction Management Epic and is assigned to Nguyễn Thuận Phong.

[FNS-39](https://finsight-team.atlassian.net/browse/FNS-39) tracks savings goals under Budget & Planning and is assigned to Nguyễn Thuận Phong. Goal progress is a manually maintained planning value and does not change account balances.

[FNS-40](https://finsight-team.atlassian.net/browse/FNS-40) tracks balance reconciliation under Financial Accounts and is assigned to Nguyễn Thuận Phong. A reconciliation records a snapshot and discrepancy without adjusting the balance.
