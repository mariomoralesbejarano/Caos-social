---
name: Board game rooms
description: Shared realtime room architecture for configurable Poker, Parchís and Oca tables.
---

All multiplayer board games use the existing `baraja_rooms` Supabase table, CAS updates and Realtime broadcasts; game-specific settings belong in the room configuration rather than a second room system.

**Why:** Keeping one room transport preserves session identity, live synchronization and the existing lobby flow while allowing each game to enforce its own player limits and rules.

**How to apply:** Add new game state and action functions to the shared baraja client engine, pass creation settings through `tableConfig`, and expose the game through a dedicated start screen plus its active board route.