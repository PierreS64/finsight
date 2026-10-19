# Setup

## Tools checked on 2026-10-19

JDK 17 is installed under Eclipse Adoptium; the default `java` resolves to JDK 21, so set `JAVA_HOME` explicitly before building. Node 24, npm 11, Git, Docker CLI, VS Code, Android Studio, Android SDK 35 and ADB are installed. Maven is provided by `backend/mvnw.cmd`. Docker Desktop started successfully and the local API container reached healthy state. Android AVD `FinSight_API_35` booted successfully.

## Real Supabase setup

Create a new Supabase project for FinSight. Copy `.env.example` to `.env` locally and fill `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `SUPABASE_ISSUER_URI`, and `SUPABASE_JWKS_URI`. Do not paste secrets into chat or commit `.env`. Start backend without the `local` profile. The project must use asymmetric JWT signing with a published JWKS; legacy shared-secret tokens are outside this configuration. Confirm a real token against `/api/v1/session` before calling authentication complete.

## Android

Start `FinSight_API_35` in Android Studio or with the SDK emulator, then run `npm run android` in `frontend/mobile`. Expo Go bundled successfully and the screen was visually checked on this emulator.

## Docker

Start Docker Desktop, then run `docker compose up --build` for the local API demo. This uses H2 and does not connect to Supabase. For optional local PostgreSQL: set `LOCAL_POSTGRES_PASSWORD` in an untracked root `.env` and run `docker compose -f infrastructure/docker/compose.postgres.yaml up -d`. The API is not wired to that local database by default.

## Jenkins and external accounts

`Jenkinsfile` targets a Windows agent labeled `windows-finsight`. Jenkins controller and agent processes run on Java 21, while the job selects the configured Jenkins JDK tool named `jdk17` for the FinSight build. On this machine its path is `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`. Git, Node/npm and Docker CLI must also be available to the agent.

For a new local Jenkins installation, generate a strong random password in the ignored `.secrets/jenkins-admin-password` file before running `docker compose -f infrastructure/docker/compose.jenkins.yaml up -d --build`. The image installs the required plugins, skips the setup wizard, creates an `admin` account with that password, disables anonymous access and controller executors, and configures the `jdk17` tool. The controller is at `http://127.0.0.1:8085`. Never paste the password into chat or commit `.secrets/`.

The `windows-finsight` inbound node exists in this local controller but is offline. To connect it, open the node page in Jenkins, follow its current inbound agent instructions using Java 21, and keep the node secret in an ignored local file. The official remoting agent supports `-secret @path-to-secret-file` and `-webSocket`. Create a Pipeline job using the private repository `https://github.com/PierreS64/finsight` on `develop`, with a narrowly scoped read-only GitHub credential, then run the pipeline. The Jenkins job and full pipeline execution have not yet been verified. Jira and Supabase projects also remain pending.
