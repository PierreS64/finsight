# 0006 — Net worth is a current manually maintained balance sheet

Net worth uses the current balance of every owned FinSight account, plus separately entered assets, minus separately entered liabilities. Negative account balances contribute to liabilities. All amounts are VND `NUMERIC(19,2)` and calculated with `BigDecimal`; transfers affect the two account balances but do not create income, expense or another asset. Savings goals are planning values and are never added again.

An asset or liability entry is a current user estimate, not a transaction, market quote or bank connection. Editing it replaces that current estimate, so this release has no historical net-worth chart. The API and database scope every read/write by the authenticated owner. The client never needs bank credentials.
