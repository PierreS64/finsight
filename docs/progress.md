# Progress — 2026-10-19

## Completed

- Checked Windows tools and Android SDK 35; found JDK 17 while default Java is 21.
- Initialized new local Git repository on `develop`.
- Created Spring Boot 3.5 Java 17 API with Maven Wrapper, Security, OAuth2 Resource Server, JPA, Flyway, PostgreSQL driver, Actuator, and local H2 profile.
- Added public health and protected session endpoints plus startup/security tests.
- Created React/Vite and Expo SDK 53 Android scaffolds with FinSight introduction screens.
- Added Dockerfile, Compose local API service, Windows Jenkinsfile, env template, and core documentation.

## Verified

- `backend/mvnw.cmd verify`: 4 tests passed using local H2 and mock authenticated principal, including missing/malformed token rejection.
- Web `npm run build` and `npm run lint`: passed; Vite returned HTTP 200 and Chrome screenshot was visually checked.
- Mobile `npx tsc --noEmit`, `npx expo lint` and `npx expo-doctor`: passed (18/18 doctor checks). Expo bundled on Android SDK 35 emulator and its rendered screen was visually checked.
- Docker image built; Compose API reached healthy state. Health returned 200 and unauthenticated session returned 401 without a session cookie.
- Local Jenkins controller started on `127.0.0.1:8085` and returned HTTP 200; setup wizard and agent remain pending.

## In progress / blocked

- Jenkins setup wizard, Windows agent and full pipeline are not complete. The controller itself is running.
- New GitHub repository, Jira project/issues, Supabase project and real PostgreSQL/JWT verification: external account connections needed. No resource has been claimed as created.
- Expo SDK 53 dependency audit reported 35 vulnerabilities (14 moderate, 21 high). `npm audit fix` did not reduce this count; remaining suggested fixes require breaking Expo/React Native version changes. SDK 53 is pinned for target SDK 35; assess advisories and upgrade strategy before production use.

## Decisions

See `docs/decisions/0001-initial-architecture.md`. Spring Initializr currently rejects Spring Boot 3.x generation, so backend POM and Maven Wrapper were created directly.

## Next

Connect GitHub, Jira/Atlassian and Supabase; complete the Jenkins setup wizard and Windows agent; run the pipeline; then begin Phase 2 migrations/authentication. Prioritize a complete core MVP before intelligence and AI modules.
