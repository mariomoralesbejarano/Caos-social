# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Expo Router 6 (web export → Vercel) + React Query
- **Backend**: Supabase (Postgres + Realtime). No custom API server.

## Project: CAOS SOCIAL — 100% serverless

Multiplayer party-game. Single Supabase table `caos_rooms (code pk, state jsonb, version int, updated_at)` with optimistic concurrency (load → mutate → CAS by version, 5 retries). Live updates via Supabase Realtime `postgres_changes` on `caos_rooms`. 48h inactivity GC runs client-side. 100+ cards across 5 packs (TARDEO/FERIA/FAMILIAR/NOCHE/ESTRATEGICO), reactive + proactive powers, custom cards, podium with 5 trophies, panic-vote system.

### Layout

- `lib/api-client-react/` — game logic + Supabase client + React Query hooks (drop-in replacement that keeps the old orval-style `{code,data}` signatures so screens compile unchanged).
  - `game.ts` — pure synchronous reducer (`applyJoin`, `applyThrowCard`, …)
  - `store.ts` — `loadRoom` / `mutateRoom` (CAS) on Supabase
  - `supabase.ts` — singleton client from `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `index.ts` — `useGetRoom` (with realtime subscription) + all mutation hooks
- `artifacts/caos-social/` — Expo Router app (web target).
  - `dev`: `expo start --web`
  - `build`: `expo export --platform web --output-dir dist`
  - `serve`: tiny static server in `serve.mjs`
- `scripts/setup-supabase.mjs` — idempotent SQL setup (creates table, enables realtime publication, opens RLS for anon).
- `vercel.json` — `outputDirectory: artifacts/caos-social/dist` + SPA rewrites.

### Deploy to Vercel

1. Push the repo to GitHub.
2. Import on Vercel; framework = Other.
3. Set env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Build/output come from `vercel.json`.

### Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm --filter @workspace/caos-social run dev` — run locally
- `pnpm --filter @workspace/caos-social run build` — build static web bundle
- `node scripts/setup-supabase.mjs` — create/refresh Supabase schema (uses pooler)
