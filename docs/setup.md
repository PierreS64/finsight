# Setup

## Tools checked on 2026-10-19

JDK 17 is installed under Eclipse Adoptium; the default `java` resolves to JDK 21, so set `JAVA_HOME` explicitly before building. Node 24, npm 11, Git, Docker CLI, VS Code, Android Studio, Android SDK 35 and ADB are installed. Maven is provided by `backend/mvnw.cmd`. Docker Desktop started successfully and the local API container reached healthy state. Android AVD `FinSight_API_35` booted successfully.

## Real Supabase setup

The project exists at `https://supabase.com/dashboard/project/xxdvusmvvrnqicorjczo`. Its public JWKS currently contains an ES256 key. The API configuration trusts ES256 and requires audience `authenticated`.

Copy `.env.example` to a root `.env` locally. In the Supabase project, click **Connect → Session pooler** and copy its host, port, database and username into `DATABASE_URL` and `DATABASE_USERNAME`; do not derive the pooler host from the region. Use the database password you set at project creation for `DATABASE_PASSWORD`. In **Project Settings → API Keys**, copy the **publishable** key into `SUPABASE_PUBLISHABLE_KEY` for upcoming web/mobile clients; never use a secret/service-role key in a client. Keep `.env` out of Git and do not paste passwords or keys into chat. [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)

From the repository root, run `powershell -ExecutionPolicy Bypass -File .\scripts\start-supabase-api.ps1`. This loads the ignored `.env`, selects the `supabase` profile, and starts the API on port 8086 using JDK 17. Flyway stores its migration history in the separate `finsight` schema because Supabase's `public` schema already contains managed objects. Migrations V1–V11 have been applied to this project's database. Check `http://localhost:8086/actuator/health` for a healthy API.

For web sign-in, copy `frontend/web/.env.example` to `frontend/web/.env.local`, set its publishable key, and set `VITE_API_BASE_URL=http://localhost:8086`. Run `npm run dev -- --host 127.0.0.1 --port 5173` from `frontend/web`, then open `http://127.0.0.1:5173/#account`. Sign up or sign in with your own email and password, confirm the email if requested, and save a display name. Do not paste credentials or access tokens into chat. A user has completed this flow against the real Supabase project.

For password recovery, configure **Authentication → URL Configuration** in Supabase with Site URL `http://127.0.0.1:5173/` and redirect URLs `http://127.0.0.1:5173/` and `finsight://reset-password`. The web form sends the user back to the current origin, while an installed Android development/production build uses the `finsight` app scheme. Supabase must allow the exact redirect. Expo Go uses a changing `exp://...` URL, so its email recovery redirect needs that exact temporary URL separately; a development build provides the stable scheme. The new password is submitted directly to Supabase Auth. Test using your own email and do not share the link or its tokens.

## Receipt OCR

The API runs Tesseract locally; receipt images are not sent to an external OCR provider. On Windows, install `UB-Mannheim.TesseractOCR` with winget. The startup script detects `C:\Program Files\Tesseract-OCR\tesseract.exe`. English works with the installer; for Vietnamese receipts, place official `eng.traineddata` and `vie.traineddata` in `%LOCALAPPDATA%\FinSight\tessdata`. The startup script then selects `vie+eng`. The Docker API image installs both language packs. Set `FINSIGHT_TESSERACT_COMMAND`, `FINSIGHT_TESSDATA_DIR`, and `FINSIGHT_OCR_LANGUAGES` to override these defaults in other environments. The UI can still accept manual entry if OCR is unavailable or incomplete. An exact duplicate image already attached to one of the user's transactions raises a confirmation warning; changed crops or compression may evade this check.

## Android

Copy `frontend/mobile/.env.example` to `frontend/mobile/.env.local` and set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key. For the Android emulator, `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8086` reaches the API on the Windows host. Start `FinSight_API_35` in Android Studio, then run `npx expo start --android --port 8082` in `frontend/mobile`. If Expo Go retains an old bundle, run `adb reverse tcp:8082 tcp:8082` and open `exp://127.0.0.1:8082` on the emulator. The user signed in on Android SDK 35 and saw the profile created on web.

## Docker

Start Docker Desktop, then run `docker compose up --build` for the local API demo. This uses H2 and does not connect to Supabase. For optional local PostgreSQL: set `LOCAL_POSTGRES_PASSWORD` in an untracked root `.env` and run `docker compose -f infrastructure/docker/compose.postgres.yaml up -d`. The API is not wired to that local database by default.

## Jenkins and external accounts

`Jenkinsfile` targets a Windows agent labeled `windows-finsight`. Jenkins controller and agent processes run on Java 21, while the job selects the configured Jenkins JDK tool named `jdk17` for the FinSight build. On this machine its path is `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`. Git, Node/npm and Docker CLI must also be available to the agent.

For a new local Jenkins installation, generate a strong random password in the ignored `.secrets/jenkins-admin-password` file before running `docker compose -f infrastructure/docker/compose.jenkins.yaml up -d --build`. The image installs the required plugins, skips the setup wizard, creates an `admin` account with that password, disables anonymous access and controller executors, and configures the `jdk17` tool. The controller is at `http://127.0.0.1:8085`. Never paste the password into chat or commit `.secrets/`.

The `windows-finsight` inbound node connects over WebSocket with Java 21. The local Windows Task Scheduler task **FinSight Jenkins Agent** keeps the agent available for manual launch. Its sign-in trigger is disabled, so it does not run at Windows startup. It uses the ignored `.secrets/jenkins-agent-secret` file through Remoting's `-secret @path-to-secret-file` option, so the secret value is not stored in the task arguments. The task runs without a time limit and restarts the process up to three times after an unexpected exit. Check its state with `Get-ScheduledTask -TaskName 'FinSight Jenkins Agent'`.

The Jenkins controller runs in Docker Desktop. **Start Docker Desktop when you sign in to your computer** is disabled on this machine to avoid using memory at Windows startup. From the repository root, run `powershell -ExecutionPolicy Bypass -File .\scripts\start-jenkins-local.ps1` when you need CI. It starts Docker Desktop, the controller, and the agent. When finished, run `powershell -ExecutionPolicy Bypass -File .\scripts\stop-jenkins-local.ps1`. It stops the agent and controller; it also stops Docker Desktop if no other containers are running. If other containers are running, it leaves Docker Desktop open to avoid interrupting them. To stop all Docker activity deliberately, use `docker desktop stop` after those workloads are finished. The start script was tested and Jenkins reported `windows-finsight` Online; the stop script was tested with other containers running. A full sign-out/restart test has not yet been performed.

The Pipeline job [`finsight-develop`](http://127.0.0.1:8085/job/finsight-develop/) uses `Jenkinsfile` from the private `develop` branch through an SSH credential backed by a **read-only** GitHub deploy key. The key files are in ignored `.secrets/`; the Jenkins credential ID is `finsight-github-deploy-readonly`. Git host keys use Jenkins' accept-first verification strategy. Build [#2](http://127.0.0.1:8085/job/finsight-develop/2/) succeeded: 9 backend tests, web lint/build, mobile TypeScript and Expo Doctor, and Docker image build. Jenkins test results are archived. The job is manually triggered; no webhook or scheduled trigger is configured.
