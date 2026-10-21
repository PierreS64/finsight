# FinSight

FinSight is a personal finance intelligence platform under development. The repository contains a Java 17 Spring Boot API, React web app, and Expo Android app. Financial accounts will be user-maintained records; there is no live bank connection.

## Current milestone

Phase 0 scaffold is available. The API connects to the real Supabase PostgreSQL project. Web and Android have Supabase Auth, profiles, virtual accounts, owner-scoped income/expense categories, transaction CRUD, private receipt image attachments, searchable transaction history, account transfers, weekly/monthly recurring transactions and an upcoming expense view, monthly budgets with 80%/90%/100% alerts and a safe daily spending amount, a monthly financial dashboard with weekly/monthly charts and spending trends, an expense forecast, rule-based insight cards, category-level spending explanations, a monthly spending behavior profile, and a temporary What-if Simulator. Recurring rules are processed explicitly from the UI when due; no background scheduler runs yet. A real user signed in and accessed their profile on both platforms, saved it on web, and added an account that persisted after reload and appeared on Android. The local Jenkins `finsight-develop` pipeline passed backend tests, web and mobile checks, and Docker image build on its Windows agent. See [progress](docs/progress.md) and [roadmap](docs/development-workflow.md).

## Quick start on Windows PowerShell

Use JDK 17 for the backend. Maven is supplied by the wrapper.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot' # adjust if needed
cd backend
.\mvnw.cmd test
$env:SPRING_PROFILES_ACTIVE = 'local'
.\mvnw.cmd spring-boot:run
```

The local profile uses in-memory H2 and a nonfunctional JWKS URL. `GET http://localhost:8080/actuator/health` works; authenticated requests need a real Supabase environment.

For the real Supabase project, fill the ignored root `.env` and run `powershell -ExecutionPolicy Bypass -File .\scripts\start-supabase-api.ps1` from the repository root. The API listens on `localhost:8086`. See [setup](docs/setup.md) for web configuration and sign-in.

```powershell
cd frontend/web
npm ci
npm run dev
```

```powershell
cd frontend/mobile
npm ci
npx expo-doctor
npm run android
```

For the Docker API demo: `docker compose up --build`. Docker Desktop must be running. See [setup](docs/setup.md) for real database and auth configuration.

API and integration rules are in [API conventions](docs/api-conventions.md).

Jenkins is available on demand without starting Docker Desktop at Windows sign-in:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-jenkins-local.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\stop-jenkins-local.ps1
```

## Verification

- Backend: `backend\mvnw.cmd -B -ntp verify`
- Web: `npm run lint` and `npm run build` in `frontend/web`
- Mobile: `npx tsc --noEmit` and `npx expo-doctor` in `frontend/mobile`

Do not commit `.env`, credentials, financial data, or generated build output.
