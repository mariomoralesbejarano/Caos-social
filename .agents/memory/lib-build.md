---
name: Lib build setup
description: Cómo compilar lib/api-client-react correctamente
---

`lib/api-client-react` es un paquete composito (emite declaraciones).

Requiere `pnpm --filter @workspace/api-client-react install` la primera vez para instalar `@supabase/supabase-js` y `@types/react` en su propio node_modules.

El `tsconfig.json` raíz solo debe referenciar `lib/api-client-react` — las carpetas `lib/db` y `lib/api-zod` no tienen tsconfig válido y rompen `tsc --build`.

**Why:** Los artifacts de Expo usan el lib como fuente directa (exports apuntan a ./src/index.ts), no a dist/, así que Metro bundlea directamente. Pero `tsc --noEmit` del artifact sí necesita las declaraciones generadas por `tsc --build`.

Comando de build: `pnpm run typecheck:libs` (ejecuta `tsc --build` en raíz).
