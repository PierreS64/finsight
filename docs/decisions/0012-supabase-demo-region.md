# 0012 — Keep the existing Seoul Supabase project for the demo

The Supabase project `xxdvusmvvrnqicorjczo` is in Northeast Asia (Seoul, `ap-northeast-2`) under the intended Free organization. The initial setup request specified Singapore. The project owner chose to keep Seoul for the demo on 2026-10-24, and FNS-13 now records that accepted region.

Changing a Supabase project's region requires a new project and migration of database, Auth, storage and environment configuration. The existing project already has real sign-ins and a test account, so a region move would interrupt the current demo setup. No new project or migration was started.

The API and clients continue to use the existing project. Reconsider the region only if deployment requirements change. See [Supabase's region-change guidance](https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z).
