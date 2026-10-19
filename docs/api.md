# API contract

Base URL: `http://localhost:8080` for local development. Error responses currently use Spring Boot defaults; a stable error schema is a future task.

| Method | Path | Auth | Current response |
| --- | --- | --- | --- |
| GET | `/actuator/health` | Public | Actuator health JSON |
| GET | `/api/v1/session` | Bearer JWT | `{ "subject": "<Supabase user UUID>" }` |
| GET | `/api/v1/profile` | Bearer JWT | Own `{ "userId", "displayName", "currencyCode" }`; 404 until first PUT |
| PUT | `/api/v1/profile` | Bearer JWT | Accepts `{ "displayName": "..." }` (1–80 nonblank characters), returns the updated own profile |
| GET | `/api/v1/accounts` | Bearer JWT | Array of the signed-in user's own virtual accounts |
| POST | `/api/v1/accounts` | Bearer JWT | Creates an owned virtual account; returns 201 and its representation |

The protected endpoints require an ES256-signed token with the configured Supabase issuer and audience `authenticated`. The profile ID is always derived from the token's `sub`, never from a client-supplied user ID. When using the `local` profile, the JWKS URI is a placeholder, so a real bearer token cannot be verified. A real user signed in and saved a profile on web, then signed in and retrieved that profile on Android.

Account creation accepts `{ "name": "Cash", "accountType": "CASH", "openingBalance": "100000" }`. Other types are `BANK`, `E_WALLET`, and `OTHER`. The opening balance is a decimal string in responses to preserve exact digits in JavaScript. Currency is currently VND. It is an initial balance, not a live balance from transactions; transactions are not implemented yet. Account ownership comes only from the verified JWT subject. A user created an account on web and saw it again after reloading the page.
