# API contract

The API listens on `http://127.0.0.1:8086` with the real Supabase profile and `http://localhost:8080` with local H2 by default. `GET /actuator/health` is public. Every `/api/v1/` route requires a Supabase bearer JWT with verified issuer, JWKS signature and `authenticated` audience. Missing or invalid tokens return 401. Financial reads and writes derive the owner from the JWT subject, never from client input.

| Area | Routes | Behavior |
| --- | --- | --- |
| Session/profile | `/api/v1/session`, `/api/v1/profile` | Own session subject and display profile |
| Accounts | `/api/v1/accounts`, `/api/v1/accounts/{id}/reconciliations`, `/api/v1/net-worth` | Virtual balances, reconciliation snapshots, net worth |
| Transactions | `/api/v1/transactions`, `/api/v1/transactions/history`, `/{id}/receipt`, `/api/v1/transfers` | Owned income/expense, paged history, private receipt, separate transfers |
| Categories/merchants | `/api/v1/categories`, `/api/v1/categories/suggestion`, `/api/v1/merchants` | User-managed labels and read-only category suggestions |
| Statement/OCR | `/api/v1/statements/preview`, `/api/v1/statements/import`, `/api/v1/receipts/recognize` | Review before creating records; local OCR |
| Planning | `/api/v1/budgets`, `/api/v1/goals`, `/api/v1/recurring-rules`, `/api/v1/subscription-suggestions`, `/api/v1/upcoming-expenses` | Exact budgets, goals, explicit recurring processing, read-only suggestions |
| Overview/intelligence | `/api/v1/dashboard`, `/api/v1/charts`, `/api/v1/insights`, `/api/v1/expense-forecast`, `/api/v1/safe-to-spend`, `/api/v1/spending-explanation`, `/api/v1/spending-profile`, `/api/v1/spending-trends`, `/api/v1/financial-health`, `/api/v1/what-if` | Owner-scoped deterministic metrics; What-if does not write |
| AI assistant | `POST /api/v1/assistant/ask` | Optional server-side explanation of backend-calculated monthly facts |

This is a route-family overview. Use [API conventions](api-conventions.md) for exact request constraints, pagination, money formats and special endpoints; refer to controller code for the full route list. JSON uses camelCase. Money is returned as decimal strings. Input errors generally return 400, unauthorized access 401, missing or other-owner items 404, conflicts 409. Spring-generated error bodies are not yet a stable API contract.

Run [smoke-supabase-api.ps1](../scripts/smoke-supabase-api.ps1) after starting the real API. It checks health and protected routes without writing data. If a short-lived user access token is set only in the current shell as `FINSIGHT_SMOKE_BEARER_TOKEN`, it also checks read-only authenticated endpoints; the script never prints the token. Do not send tokens in chat or store them in Git. The local H2 profile has a placeholder JWKS URL and cannot verify a real Supabase JWT.
