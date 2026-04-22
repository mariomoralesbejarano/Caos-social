# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: CAOS SOCIAL

Multiplayer party-game (web + Expo iOS/Android). Rooms persisted in Postgres (jsonb state, 48h inactivity GC). 100+ cards across 5 packs (TARDEO/FERIA/FAMILIAR/NOCHE/ESTRATEGICO). Reactive powers (reversa/espejo/bloqueo/robo/comodín) and proactive powers (silencio, doble-puntos, regalo, ladrón, escudo-grupal, amplificador, vuelta-tortilla, revelación, inversión, re-rol). Owner can create custom cards in lobby and end the game to award 5 trophies. Feedback: web-audio "clink" on score, haptics + vibration on inbox.

DB swap to Supabase = change `DATABASE_URL`; schema is wire-compatible.
