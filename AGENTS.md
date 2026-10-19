# FinSight working agreement

Read `README.md`, `docs/progress.md`, and `docs/decisions/` before changing code. Continue the next unblocked task in `docs/development-workflow.md` and update progress after each milestone.

- Backend: Java 17, Spring Boot 3.x, Maven Wrapper, package by feature under `com.finsight`. Flyway owns schema changes; never use Hibernate schema creation/update against real data.
- Money: use `BigDecimal` or integral minor units, never floating point. Transfers do not count as income or expense. A request must be scoped to the authenticated owner.
- Auth: Supabase Auth signs JWTs; Spring verifies using JWKS and issuer. Never put service role keys in clients. No bank API or bank credential collection.
- Web: React, TypeScript, Vite. Mobile: React Native, Expo SDK 53, TypeScript, Android SDK 35.
- Keep `.env` untracked. Record tests actually run and limitations; do not call mocked authentication a real Supabase integration.
- Work on `develop` or a feature branch. Do not force-push or merge into `main` automatically.
