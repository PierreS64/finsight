# Progress — 2026-10-21

## Completed

- Checked Windows tools and Android SDK 35; found JDK 17 while default Java is 21.
- Initialized new local Git repository on `develop`.
- Created Spring Boot 3.5 Java 17 API with Maven Wrapper, Security, OAuth2 Resource Server, JPA, Flyway, PostgreSQL driver, Actuator, and local H2 profile.
- Added public health and protected session endpoints plus startup/security tests.
- Created React/Vite and Expo SDK 53 Android scaffolds with FinSight introduction screens.
- Added Dockerfile, Compose local API service, Windows Jenkinsfile, env template, and core documentation.

## Verified

- `backend/mvnw.cmd verify`: 9 tests passed using local H2 and mocked principals, including missing/malformed token rejection, separate profile and account owners, invalid input, and web CORS preflight.
- Web `npm run build` and `npm run lint`: passed; Vite returned HTTP 200 and Chrome screenshot was visually checked.
- Mobile `npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor`: passed (18/18 doctor checks). Expo bundled on Android SDK 35 emulator and its rendered screen was visually checked.
- Docker image built; Compose API reached healthy state. Health returned 200 and unauthenticated session returned 401 without a session cookie.
- Local Jenkins controller at `127.0.0.1:8085` was rebuilt with Pipeline/Git/JUnit/Timestamper plugins and a local secret-backed admin account. It returned HTTP 200; authenticated script-console check found zero controller executors and the `jdk17` tool.
- Jenkinsfile selects the `jdk17` build tool; Jenkins controller and inbound agent use Java 21. The user connected the `windows-finsight` agent over WebSocket. A read-only GitHub deploy key was added for this repository and stored as a Jenkins SSH credential. Job `finsight-develop` checks out the private `develop` branch and ran build [#2](http://127.0.0.1:8085/job/finsight-develop/2/) successfully at commit `5e2532d5ac211b9d42895e1cd9163319fad6c584`. Jenkins archived JUnit results: 9 passed, 0 failed, 0 skipped. Web lint/build, mobile TypeScript/Expo Doctor (18/18), and Docker image `finsight-api:ci` also passed. Build duration was 274.4 seconds. Initial build #1 failed before the pipeline because the private repository credential had not yet been configured.
- Created a new private GitHub repository at `https://github.com/PierreS64/finsight`, pushed `main` and `develop`, and set `main` as the default branch.
- Prepared the nine required Jira epics and first sprint candidate in `docs/jira-backlog.md` for creation after Jira access is available.
- Connected to Jira and verified FNS-1 (DevOps Epic) and FNS-2 (Jenkins agent Task) created by the user. Created FNS-3 through FNS-10 for the remaining eight Epics, and FNS-11 through FNS-18 for the remaining first-sprint candidate Tasks. Verified the Task parent relationships in the Epic views. Jira has an empty, unstarted FNS Sprint 1; all nine Tasks are still To Do.
- Published and re-opened the Jira board configuration to verify the five columns To Do, In Progress, Code Review, Testing, and Done. Code Review and Testing use the In progress status category.
- Read the five-person work assignment table in `bcao_devapp.docx` and created FNS-19 through FNS-37 as feature Tasks with scope, acceptance checks, planned owner, and Epic parent. Jira List confirmed the 19 new task titles/parents and assignment state. Assigned FNS-19 through FNS-23 and existing FNS-14/FNS-15 to Nguyễn Thuận Phong; left the 14 new tasks for the four other members unassigned for the user to assign after adding them. See `docs/jira-backlog.md` for the mapping. The report's draft Node.js references were treated as source context; Jira descriptions follow the repository's Spring Boot/Supabase decision.
- User created the Supabase project `xxdvusmvvrnqicorjczo` and Jira Software Scrum space `F1nS1ght` (`FNS`). The Supabase public JWKS endpoint returns one ES256 EC key.
- Configured Spring to trust ES256 JWTs with audience `authenticated`. Added Flyway V1 for owner-scoped user profiles and GET/PUT `/api/v1/profile`.
- PostgreSQL V1 was applied to a disposable local PostgreSQL 17 instance: Flyway history recorded version 1, row level security was enabled, and `anon`/`authenticated` had zero table grants. The API health endpoint returned 200 and an unauthenticated profile request returned 401 against this local instance.
- Connected to the real Supabase PostgreSQL project through its Session pooler. Flyway V1 applied successfully with history in the `finsight` schema and `public.user_profiles` created. The real-database API returned 200 for health and 401 for an unauthenticated profile request.
- Added a web Supabase Auth sign-up/sign-in/sign-out flow and a profile form that calls the API with the user's bearer token. Web lint and production build passed. The user signed in and saved a profile successfully through the local web app and real Supabase API, verifying the genuine user-token path end to end.
- Added an Android Supabase Auth and profile screen with session persistence. Mobile TypeScript, lint, and Expo Doctor (18/18) passed; the sign-in screen rendered on the Android SDK 35 emulator. The user signed in with a real account and saw the profile created on web.
- Flyway V2 created `public.financial_accounts` on the real Supabase project. The API now creates and lists virtual accounts scoped to the verified user, with exact decimal opening balances. Web and Android have account forms. Web lint/build and mobile typecheck/lint passed. The user added a test account on web and saw it persist after a page reload. An Android render error caused by passing `BigInt` to Hermes `Intl.NumberFormat` was fixed by formatting the decimal string directly. The emulator then loaded the user's profile and displayed the same test account and 100,000 VND opening balance.
- Rebuilt the web and Android screens using the user-provided `frontend/web design/` and `frontend/mobile design/` folders as visual references. The landing, sign-in, sign-up, email confirmation, dashboard, accounts, transactions, and profile views now share the FinSight name, F. mark, navy and emerald palette, cards, and responsive navigation. Generated matching web favicon and Android icon assets. Kept the real Supabase authentication and owner-scoped profile/account APIs. Dashboard totals use exact integer minor-unit arithmetic from real opening balances; transaction views show an explicit empty state because transaction storage is not implemented yet. Design reference folders remain user-owned and unmodified.

## In progress / blocked

- The user prefers to avoid Docker Desktop's RAM use at startup. Disabled Docker Desktop's `AutoStart` setting and the sign-in trigger of the `FinSight Jenkins Agent` scheduled task. Added on-demand start/stop scripts. The start script launched Docker Desktop, the controller, and agent, and Jenkins reported `windows-finsight` Online. The stop script stopped the agent and controller and correctly left Docker Desktop running while unrelated containers were active. Docker Desktop was then stopped explicitly to restore the prior off state. A full sign-out/restart has not been tested.
- Jira Sprint 1 remains unplanned and unstarted; Task statuses need review against the actual acceptance criteria and verification evidence.
- New team Tasks FNS-19 through FNS-37 remain To Do in the backlog; the four other members are planned owners in descriptions, pending manual assignment by the user.
- Expo SDK 53 dependency audit reported 35 vulnerabilities (14 moderate, 21 high). `npm audit fix` did not reduce this count; remaining suggested fixes require breaking Expo/React Native version changes. SDK 53 is pinned for target SDK 35; assess advisories and upgrade strategy before production use.

## Redesign verification — 2026-10-21

- Web `npm run lint` and `npm run build` passed. Landing, direct `#account` sign-in, and direct `#register` sign-up views were visually inspected in the local browser.
- Mobile `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` passed (18/18). Metro bundled the Expo Router Android app after adding `query-string`, required by the installed Router package at runtime.
- Android SDK 35 emulator rendered the new dashboard with the existing real Supabase user profile and one account totaling 100,000 VND after starting the local API. The transactions empty state and account list/form were visually checked through bottom navigation. No new financial data was written during this verification.
- Web authenticated workspace was checked by build/code review, while live browser visual inspection covered unauthenticated screens. A separate browser sign-in was not performed during this redesign.

## Decisions

See `docs/decisions/0001-initial-architecture.md`. Spring Initializr currently rejects Spring Boot 3.x generation, so backend POM and Maven Wrapper were created directly.

## Git

The private `origin` remote is `https://github.com/PierreS64/finsight.git`. `main` points to the stable scaffold and is the GitHub default branch; `develop` includes the milestone record and Jenkins Java 17 fix. Both branches track `origin`. No pull request exists yet.

## Next

Review Jira Task statuses against the successful Jenkins evidence and plan Sprint 1. Then implement account editing, transfers, categories, and transactions before intelligence and AI modules.
