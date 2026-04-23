# CAOS SOCIAL

<!-- 👇 sustituye OWNER y REPO por tu usuario/repo de GitHub la primera vez -->
[![Build Android APK](https://github.com/OWNER/REPO/actions/workflows/android-apk.yml/badge.svg?branch=main)](https://github.com/OWNER/REPO/actions/workflows/android-apk.yml)

Juego multijugador de cartas tipo "fiesta-Uno" para Android, iOS y web.
Construido con Expo (React Native), Express + Drizzle ORM, PostgreSQL y un cliente generado por OpenAPI.

## Stack

- **Móvil/Web (`artifacts/caos-social`)** — Expo Router 6, React Native 0.81, react-native-web. Compila a una SPA y a binarios nativos con el mismo código.
- **API (`artifacts/api-server`)** — Express 5, validación con Zod, persistencia con Drizzle + Postgres.
- **Spec (`lib/api-spec`)** — OpenAPI 3.1 + Orval para generar el cliente React Query y los esquemas Zod (`lib/api-client-react`, `lib/api-zod`).
- **DB (`lib/db`)** — Drizzle schema (`rooms` con `code` PK, `state` JSONB, índice por `updated_at`).

## Variables de entorno / Secrets

| Variable | Dónde | Descripción |
|---|---|---|
| `DATABASE_URL` | API server | Cadena de conexión Postgres. En Replit se inyecta automáticamente. **Para usar Supabase**, reemplaza el valor por la connection string que aparece en `Project Settings → Database → Connection string → URI` (modo *Transaction* recomendado en producción serverless, *Session* en self-host). El esquema funciona idéntico: solo cambias la URL. |
| `PORT` | API server / Expo | Asignado por Replit. No tocar. |
| `EXPO_PUBLIC_API_URL` | App Expo (opcional) | Si publicas el front separado del API, apunta aquí. Por defecto usa el dominio de Replit. |

> No hay claves de terceros: el juego no necesita Stripe, OAuth ni APIs externas. Si quieres analítica (PostHog, etc.) añádela con `EXPO_PUBLIC_*`.

## Comandos

```bash
# Instalar
pnpm install

# Sincronizar el esquema con la DB
pnpm --filter @workspace/db push

# Regenerar cliente cuando cambies openapi.yaml
pnpm --filter @workspace/api-spec codegen

# Desarrollo (los workflows lo hacen automáticamente)
pnpm --filter @workspace/api-server dev
pnpm --filter @workspace/caos-social dev

# Build web (SPA estática) — output en .expo/web-build/
pnpm --filter @workspace/caos-social build
```

## Migrar a Supabase

1. Crea un proyecto en supabase.com.
2. Copia la connection string (`postgres://postgres:[YOUR-PASSWORD]@db.[REF].supabase.co:5432/postgres`).
3. Pega el valor en `DATABASE_URL` (Secrets en Replit, o `.env` en local).
4. Ejecuta `pnpm --filter @workspace/db push` para crear la tabla `rooms`.
5. Listo: las salas se persisten en Supabase y siguen limpiándose automáticamente cada hora (TTL 48 h de inactividad).

## Características de juego

- **5 packs**: Tardeo, Feria, Familiar, Noche, Estratégico (+ pack legacy clásico/discoteca/cena/gimnasio/all-in para compatibilidad).
- **100+ cartas** entre retos, beber, ligar, físicos, sociales y poderes.
- **Comodines reactivos**: reversa, espejo, bloqueo, robo de carta, comodín contador.
- **Poderes proactivos**: silencio, doble puntos, regalo, ladrón, escudo grupal, amplificador, vuelta-tortilla, revelación, inversión, re-rol.
- **Botón de pánico**: votación grupal para anular un reto sin coste.
- **Creador de cartas custom**: el anfitrión añade cartas propias en el lobby; se mezclan al empezar.
- **Trofeos al final**: el anfitrión cierra la partida y se reparten 5 trofeos (Rey del Caos, Más generoso, Más vetado, Cumplidor, Estratega).
- **Persistencia**: salas en Postgres con limpieza automática a las 48h de inactividad.
- **Feedback**: animación + vibración al recibir reto, "clink" al ganar puntos.
