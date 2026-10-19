# Architecture

FinSight is a modular monolith. React web and Expo mobile obtain a Supabase Auth access token and call the Spring Boot API. The API verifies the JWT, applies authorization and business rules, and stores financial data in Supabase PostgreSQL. Supabase Storage is reserved for later receipt files.

```text
React Web ──────┐
                ├─ Supabase Auth → JWT → Spring Boot API → PostgreSQL
Expo Android ───┘                         │
                                         └─ business rules and analysis
```

The API is the only path for financial writes and reads. The web/mobile scaffold currently has no Supabase client or financial data. Production configuration requires database URL, username, password, JWT issuer URI and JWKS URI. The local profile uses H2 only for startup and tests; its placeholder JWKS endpoint cannot authenticate real users.

Packages are created only as features are implemented. Current packages: `common.security` and `auth`. Future account, transaction, budget, goal, analytics and automation packages will be added when their code exists.

## Security boundary

`/actuator/health` is public. All other routes require authentication. Spring Security OAuth2 Resource Server checks the signature and issuer; owner authorization must be applied within every financial feature. Real owner isolation tests remain a Phase 3 requirement.
