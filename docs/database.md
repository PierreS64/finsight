# Database

The intended production database is Supabase PostgreSQL. Flyway is installed and will version each schema change. No financial tables or migrations exist yet because the first domain use cases have not been implemented. Hibernate uses `ddl-auto: validate` and cannot create or alter production tables.

The `local` profile uses in-memory H2 to verify API startup without a cloud account. This is not a substitute for a PostgreSQL migration or owner access test. An optional local PostgreSQL service is defined in `infrastructure/docker/compose.postgres.yaml`; set `LOCAL_POSTGRES_PASSWORD` in an untracked `.env` before starting it.

Initial domain model candidates: `user_profiles`, `financial_accounts`, `categories`, `transactions`. Create tables alongside the first use case, with owner foreign keys, uniqueness rules and indexes. Amounts will use exact decimal precision; VND is the initial currency.
