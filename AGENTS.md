# FinSight working agreement

Read `README.md`, `docs/progress.md`, and `docs/decisions/` before changing code. Continue the next unblocked task in `docs/development-workflow.md` and update progress after each milestone.

- Backend: Java 17, Spring Boot 3.x, Maven Wrapper, package by feature under `com.finsight`. Flyway owns schema changes; never use Hibernate schema creation/update against real data.
- Money: use `BigDecimal` or integral minor units, never floating point. Transfers do not count as income or expense. A request must be scoped to the authenticated owner.
- Auth: Supabase Auth signs JWTs; Spring verifies using JWKS and issuer. Never put service role keys in clients. No bank API or bank credential collection.
- Web: React, TypeScript, Vite. Mobile: React Native, Expo SDK 53, TypeScript, Android SDK 35.
- Keep `.env` untracked. Record tests actually run and limitations; do not call mocked authentication a real Supabase integration.
- The GitHub repository is intentionally public for instructor review. Keep credentials, real financial data, and individual student reports out of Git.
- Work on `develop` or a feature branch. Commit each feature separately so its history remains reviewable. Never force-push or push directly to `main`.
- The project owner authorizes the agent to create and merge pull requests. Before merging into `main`, review the full diff for secrets and unintended files, verify the exact PR head with applicable tests and required GitHub checks, resolve conflicts and blocking review feedback, and record the result. Use a merge commit to preserve the feature commits. If a required check fails or the change is not ready for release, leave the PR open and report why.
