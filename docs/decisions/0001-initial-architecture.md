# ADR 0001: Initial platform choices

Date: 2026-10-19

Choose a modular Spring Boot 3.5 monolith using Java 17, React/Vite for web, Expo SDK 53 for Android API 35, Supabase Auth/PostgreSQL for the planned cloud environment, and Flyway for migrations. Maven Wrapper keeps the build independent of a global Maven installation. A local H2 profile permits scaffold startup while cloud credentials are pending. It never represents production database verification.

The web and mobile screens are product introductions until authentication and financial features are implemented. No mock balance is presented as real data. Bank integration is excluded.
