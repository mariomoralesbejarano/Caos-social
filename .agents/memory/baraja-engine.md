---
name: Baraja engine
description: Architecture and gotchas for the Baraja Española multiplayer system
---

## Structure
- `lib/api-client-react/src/barajaTypes.ts` — all shared types (BarajaRoom, ApuestasState, MentirosoState, etc.)
- `lib/api-client-react/src/barajaStore.ts` — Supabase CRUD + CAS mutations + broadcast channel
- `lib/api-client-react/src/barajaGame.ts` — pure game logic (no side effects)
- `lib/api-client-react/src/barajaHooks.ts` — React Query hooks exported from index.ts
- `artifacts/caos-social/lib/barajaSession.ts` — AsyncStorage under key `baraja-session-v1`
- `artifacts/caos-social/app/baraja-room.tsx` — lobby screen
- `artifacts/caos-social/app/baraja-apuestas.tsx` — Las Apuestas game screen
- `artifacts/caos-social/app/baraja-mentiroso.tsx` — El Mentiroso game screen

## Key rules
- `baraja_rooms` table uses same CAS pattern as `caos_rooms` (version field, optimistic concurrency)
- Broadcast channel prefix: `baraja-bcast:<CODE>`, event: `BARAJA_UPDATED`
- Card rank (high→low): As(1) > 3 > Rey(12) > Caballo(11) > Sota(10) > 7 > 6 > 5 > 4 > 2
- Round 1 Las Apuestas: caller's own `foreheadCards` entry is stripped in `serializeBarajaRoom`
- Last bettor constraint: forbidden bet = `cardsDealt − sum(otherBets)`

**Why:** Separate table/channel avoids polluting caos social room system; pure functions make testing easy.

**How to apply:** Any new game variant follows the same store+hooks pattern. Add gameId to `BarajaGameId`, add state type, add pure `init*/apply*` fns in barajaGame.ts, add hooks in barajaHooks.ts, add screen.

## tsconfig quirk
`artifacts/caos-social/tsconfig.json` must exclude `capacitor.config.ts` — @capacitor/cli types don't resolve in the monorepo but the package itself works at runtime via Capacitor's build tooling.

## mockup-sandbox pre-existing errors
`artifacts/mockup-sandbox` has React 19 ref-type TS errors in `ui/calendar.tsx` and `ui/spinner.tsx` — pre-existing, unrelated to baraja work. Do not fix unless specifically asked.
