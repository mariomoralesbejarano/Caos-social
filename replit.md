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

Multiplayer party-game. Single Supabase table `caos_rooms (code pk, state jsonb, version int, updated_at)` with optimistic concurrency (load → mutate → CAS by version, 5 retries). Live updates via **two transports**: Supabase Realtime `postgres_changes` on `caos_rooms` (canonical state) + **Realtime Broadcast** on a per-room channel `room-bcast:<CODE>` for instant (<100ms) panic/vote/push events that don't wait for DB latency. 48h inactivity GC runs client-side. 100+ cards across 5 packs (TARDEO/FERIA/FAMILIAR/NOCHE/ESTRATEGICO), reactive + proactive powers, custom cards, podium with 5 trophies, panic-vote system.

### Realtime Broadcast events (`RoomBroadcastEvent`)

- `ROOM_UPDATED` — emitted by `mutateRoom` after every successful CAS write.
- `PANICO` — emitted by `useThrowCard`; opens panic modal across all phones.
- `VOTO` — emitted by `usePanicVote` (optimistic, before DB write).
- `VERIFICACION` — emitted by `useVerifyVote`.
- `PUSH` — emitted by `sendPushNotification(roomCode, playerId, msg)`; targets a single player.
- `CHAT` — emitted by `lib/chat.ts`; live in-room chat (user + system messages).

### Live chat (room)

`artifacts/caos-social/lib/chat.ts` + `components/ChatPanel.tsx`. Mensajes broadcast en el canal de sala (sin BBDD). El panel está anclado al final de `app/game.tsx` (fuera del ScrollView), con `KeyboardAvoidingView` y auto-scroll al último mensaje. `postSystemEvent(roomCode, body)` lo usa el flujo de juicio para difundir veredictos.

### Regla del Juez (verificación)

`applyVerifyVote` en `lib/api-client-react/src/game.ts`: si el votante es el thrower (`t.fromPlayerId`), `resolveVerificationByJudge` resuelve el reto al instante (✅ Superado / ❌ Fallado) sin esperar a mayoría. La UI de `app/game.tsx` filtra `room.tribunal` para mostrar los botones SOLO al thrower; el resto ve "Esperando veredicto de X". El veredicto se publica al chat de sala y dispara push real al receptor.

### Push nativas reales (FCM HTTP v1)

- `firebase/google-services.json` — staged en el repo. El workflow `.github/workflows/android-apk.yml` lo copia a `android/app/` y aplica el plugin Gradle `com.google.gms.google-services` (idempotente).
- `lib/nativePush.ts` — usa `@capacitor/push-notifications` real (no-op en web/Expo Go). Listener de `registration` cachea el token y lo asocia al jugador vía `attachPlayerToPush(roomCode, playerId)`. Llamado desde `app/_layout.tsx` (init) y `app/game.tsx` (asociación).
- `lib/playerTokens.ts` — upsert/lookup en tabla `player_tokens`. Crea la tabla con `db/player_tokens.sql` (SQL editor de Supabase, una vez).
- `supabase/functions/send-push/index.ts` — Edge Function que firma JWT con el service-account de Firebase, pide access_token OAuth2 y envía push HTTP v1 a los tokens del jugador. Despliegue: `supabase functions deploy send-push`. Secrets requeridos: `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON`.

### Capacitor (Android/iOS)

- App ID: `com.mario.caossocial`, App name: `Caos Social`. Config in `artifacts/caos-social/capacitor.config.ts` (webDir = `dist`).
- Scripts (in `artifacts/caos-social/`):
  - `pnpm run cap:init-android` / `cap:init-ios` — scaffold native projects (run once).
  - `pnpm run cap:sync` — `expo export` + `cap sync`.
  - `pnpm run cap:open:android` / `cap:open:ios` — open IDE.
  - `pnpm run cap:build:apk` — build debug APK (needs Android SDK + JDK).
- Full instructions to generate the installable APK on Replit or locally: `artifacts/caos-social/CAPACITOR.md`.

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
