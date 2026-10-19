# API contract

Base URL: `http://localhost:8080` for local development. Error responses currently use Spring Boot defaults; a stable error schema is a future task.

| Method | Path | Auth | Current response |
| --- | --- | --- | --- |
| GET | `/actuator/health` | Public | Actuator health JSON |
| GET | `/api/v1/session` | Bearer JWT | `{ "subject": "<Supabase user UUID>" }` |

When using the `local` profile, the JWKS URI is a placeholder, so a real bearer token cannot be verified. With Supabase configured, the API accepts a signed access token with the configured issuer. Client login flows are not implemented.
