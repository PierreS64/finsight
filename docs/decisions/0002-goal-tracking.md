# 0002 — Savings goal tracking

FinSight stores each savings goal with a target amount, a manually reported saved amount, and an optional target date. The saved amount is a planning record. Creating or editing a goal does not move money, change a financial account balance, or create an income or expense transaction.

This avoids double counting while the product has no verified link between a goal and an account's reserved funds. The UI states this distinction. A future reservation or allocation feature can add an explicit link and separate accounting rules with a new migration.

Goal money uses `NUMERIC(19,2)` in PostgreSQL and `BigDecimal` in Java. The API computes remaining amount and progress; clients use the progress only to size a visual bar. Each query and mutation includes the authenticated owner ID. Supabase client roles have no direct grants on the table.
