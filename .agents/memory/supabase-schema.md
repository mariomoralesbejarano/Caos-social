---
name: Supabase schema
description: Estado de la tabla caos_rooms y cómo renovar el schema
---

La tabla `caos_rooms` (no `rooms`) existe en `wmmxnplssfwycnsdtqqm.supabase.co`.

Columnas: `code text PK`, `state jsonb`, `version int default 1`, `updated_at timestamptz`, `created_at timestamptz`.

Trigger `caos_rooms_touch` actualiza `updated_at` en cada UPDATE.

RLS abierta (anon puede SELECT/INSERT/UPDATE/DELETE) — la seguridad es el código aleatorio de 5 chars.

Realtime: tabla añadida a `supabase_realtime` publication con `replica identity full`.

Para recrear/migrar: `node scripts/setup-supabase.mjs` (contraseña hardcodeada).

**Why:** El store.ts usa `version` para CAS (optimistic concurrency), si la columna falta el UPDATE siempre devuelve 0 filas.
