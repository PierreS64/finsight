# Progress — 2026-10-19

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
- Jenkinsfile selects the `jdk17` build tool; Jenkins itself uses Java 21. The `windows-finsight` inbound node was created but is offline. Pipeline execution remains pending.
- Created a new private GitHub repository at `https://github.com/PierreS64/finsight`, pushed `main` and `develop`, and set `main` as the default branch.
- Prepared the nine required Jira epics and first sprint candidate in `docs/jira-backlog.md` for creation after Jira access is available.
- User created the Supabase project `xxdvusmvvrnqicorjczo` and Jira Software Scrum space `F1nS1ght` (`FNS`). The Supabase public JWKS endpoint returns one ES256 EC key.
- Configured Spring to trust ES256 JWTs with audience `authenticated`. Added Flyway V1 for owner-scoped user profiles and GET/PUT `/api/v1/profile`.
- PostgreSQL V1 was applied to a disposable local PostgreSQL 17 instance: Flyway history recorded version 1, row level security was enabled, and `anon`/`authenticated` had zero table grants. The API health endpoint returned 200 and an unauthenticated profile request returned 401 against this local instance.
- Connected to the real Supabase PostgreSQL project through its Session pooler. Flyway V1 applied successfully with history in the `finsight` schema and `public.user_profiles` created. The real-database API returned 200 for health and 401 for an unauthenticated profile request.
- Added a web Supabase Auth sign-up/sign-in/sign-out flow and a profile form that calls the API with the user's bearer token. Web lint and production build passed. The user signed in and saved a profile successfully through the local web app and real Supabase API, verifying the genuine user-token path end to end.
- Added an Android Supabase Auth and profile screen with session persistence. Mobile TypeScript, lint, and Expo Doctor (18/18) passed; the sign-in screen rendered on the Android SDK 35 emulator. The user signed in with a real account and saw the profile created on web.
- Flyway V2 created `public.financial_accounts` on the real Supabase project. The API now creates and lists virtual accounts scoped to the verified user, with exact decimal opening balances. Web and Android have account forms. Web lint/build and mobile typecheck/lint passed. The user added a test account on web and saw it persist after a page reload. An Android render error caused by passing `BigInt` to Hermes `Intl.NumberFormat` was fixed by formatting the decimal string directly. The emulator then loaded the user's profile and displayed the same test account and 100,000 VND opening balance.

## In progress / blocked

- Jenkins Windows agent and full pipeline are not complete. The controller itself is running with setup bootstrapped. Automatic approval review rejected the command to retrieve/store the node secret and start the agent process; the rejection did not provide a specific reason.
- Jira issues are still pending. Direct Jira/Supabase dashboard access is unavailable in this session; project creation is confirmed by user-supplied URLs and the Supabase database connection by the successful migration.
- Expo SDK 53 dependency audit reported 35 vulnerabilities (14 moderate, 21 high). `npm audit fix` did not reduce this count; remaining suggested fixes require breaking Expo/React Native version changes. SDK 53 is pinned for target SDK 35; assess advisories and upgrade strategy before production use.

## Decisions

See `docs/decisions/0001-initial-architecture.md`. Spring Initializr currently rejects Spring Boot 3.x generation, so backend POM and Maven Wrapper were created directly.

## Git

The private `origin` remote is `https://github.com/PierreS64/finsight.git`. `main` points to the stable scaffold and is the GitHub default branch; `develop` includes the milestone record and Jenkins Java 17 fix. Both branches track `origin`. No pull request exists yet.

## Next

Connect the Jenkins Windows agent and run the pipeline; create the prepared Jira issues. Then implement account editing, transfers, categories, and transactions before intelligence and AI modules.
