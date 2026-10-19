# API contract

Base URL: `http://localhost:8080` for local development. Error responses currently use Spring Boot defaults; a stable error schema is a future task.

| Method | Path | Auth | Current response |
| --- | --- | --- | --- |
| GET | `/actuator/health` | Public | Actuator health JSON |
| GET | `/api/v1/session` | Bearer JWT | `{ "subject": "<Supabase user UUID>" }` |
| GET | `/api/v1/profile` | Bearer JWT | Own `{ "userId", "displayName", "currencyCode" }`; 404 until first PUT |
| PUT | `/api/v1/profile` | Bearer JWT | Accepts `{ "displayName": "..." }` (1–80 nonblank characters), returns the updated own profile |

The protected endpoints require an ES256-signed token with the configured Supabase issuer and audience `authenticated`. The profile ID is always derived from the token's `sub`, never from a client-supplied user ID. When using the `local` profile, the JWKS URI is a placeholder, so a real bearer token cannot be verified. The web login flow is implemented; verification with a real signed user token remains pending.
