# Setup

## Tools checked on 2026-10-19

JDK 17 is installed under Eclipse Adoptium; the default `java` resolves to JDK 21, so set `JAVA_HOME` explicitly before building. Node 24, npm 11, Git, Docker CLI, VS Code, Android Studio, Android SDK 35 and ADB are installed. Maven is provided by `backend/mvnw.cmd`. Docker Desktop started successfully and the local API container reached healthy state. Android AVD `FinSight_API_35` booted successfully.

## Real Supabase setup

Create a new Supabase project for FinSight. Copy `.env.example` to `.env` locally and fill `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `SUPABASE_ISSUER_URI`, and `SUPABASE_JWKS_URI`. Do not paste secrets into chat or commit `.env`. Start backend without the `local` profile. The project must use asymmetric JWT signing with a published JWKS; legacy shared-secret tokens are outside this configuration. Confirm a real token against `/api/v1/session` before calling authentication complete.

## Android

Start `FinSight_API_35` in Android Studio or with the SDK emulator, then run `npm run android` in `frontend/mobile`. Expo Go compatibility for this pinned SDK must be checked on the emulator. UI rendering has not yet been verified on the emulator.

## Docker

Start Docker Desktop, then run `docker compose up --build` for the local API demo. This uses H2 and does not connect to Supabase. For optional local PostgreSQL: set `LOCAL_POSTGRES_PASSWORD` in an untracked root `.env` and run `docker compose -f infrastructure/docker/compose.postgres.yaml up -d`. The API is not wired to that local database by default.

## Jenkins and external accounts

`Jenkinsfile` targets a Windows agent labeled `windows-finsight`, with JDK 17, Git, Node/npm and Docker CLI available. The local controller was started and returned HTTP 200 at `http://127.0.0.1:8085`. Obtain its initial unlock password locally with `docker compose -f infrastructure/docker/compose.jenkins.yaml exec controller cat /var/jenkins_home/secrets/initialAdminPassword`; do not paste it into chat or commit it. Complete the setup wizard, set the controller executors to zero, attach a Windows agent, create a Pipeline job from the new GitHub repository, and run it. Keep Jenkins credentials in Jenkins, not this repository. Pipeline execution has not been verified. GitHub, Supabase and Jira projects require connected accounts; the local repository does not imply those resources exist.
