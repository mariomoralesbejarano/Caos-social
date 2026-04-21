# 🎴 CAOS SOCIAL

> Juego de cartas social para fiestas, cenas y reuniones — multijugador online,
> asíncrono, con un código de sala que cada amigo abre desde su propio móvil.

**Estado:** MVP funcional · 16 cartas · 5 packs (Clásico, Discoteca, Cena,
Gimnasio, All In) · partidas en tiempo real con polling cada 3 s.

---

## ✨ Características

- **Salas privadas** identificadas por un código de 5 caracteres (`AB3CD`).
- **Multijugador asíncrono**: cada jugador roba sus cartas y las lanza a quien
  quiera, cuando quiera, durante el día.
- **Bandeja de entrada** por jugador con resolución guiada: aceptar, rechazar
  (penalización ×2), contraatacar con un poder o pulsar el botón de pánico
  para que el grupo vote anular la carta.
- **Sistema de roles** (Abstemio · Con pareja · Hardcore) que filtra las
  cartas que cada jugador puede recibir.
- **Cooldown anti-acoso** de 10 min entre el mismo emisor y receptor.
- **Escudos**, **multiplicadores** y **cartas de poder** (Reversa, Espejo,
  Bloqueo, Robo de carta).
- **Ranking en vivo** con historial de eventos.
- **Estética neón cyberpunk** (verde `#39FF14` + violeta `#B026FF`) sobre
  fondo oscuro, animaciones de barajado en el botón central.
- **Sin coste económico, sin riesgo físico, sin alcohol obligatorio**.

---

## 🏗️ Arquitectura técnica

Monorepo gestionado con **pnpm workspaces** + **TypeScript project references**.
La fuente de verdad de la API es un **OpenAPI 3.1** del que se generan tanto
los esquemas Zod del servidor como el cliente React Query del front.

```
caos-social/
├── artifacts/
│   ├── api-server/         # 🟢 Backend HTTP (Node + Express 5)
│   │   └── src/
│   │       ├── index.ts            # Bootstrap del servidor
│   │       ├── app.ts              # Configuración de Express
│   │       ├── lib/cards.ts        # Catálogo de las 16 cartas + packs
│   │       ├── lib/rooms.ts        # Motor en memoria de las salas
│   │       ├── lib/logger.ts       # Logger Pino
│   │       ├── middlewares/        # Validación Zod, errores, etc.
│   │       └── routes/rooms.ts     # Endpoints REST de salas
│   │
│   ├── caos-social/        # 🟣 App cliente (Expo · React Native + Web)
│   │   ├── app/                    # Rutas de expo-router
│   │   │   ├── _layout.tsx                 # Providers globales
│   │   │   ├── index.tsx                   # Home: crear o unirse a sala
│   │   │   ├── players.tsx                 # Lobby de la sala
│   │   │   ├── game.tsx                    # Pantalla de juego
│   │   │   └── ranking.tsx                 # Clasificación + historial
│   │   ├── components/
│   │   │   ├── CardView.tsx                # Render visual de cada carta
│   │   │   ├── NeonButton.tsx              # Botón neón reutilizable
│   │   │   └── ErrorBoundary.tsx           # Captura de errores en runtime
│   │   ├── contexts/RoomContext.tsx        # Estado global + polling 3 s
│   │   ├── lib/session.ts                  # Sesión persistente
│   │   └── constants/cards.ts              # Re-export de tipos del API
│   │
│   └── mockup-sandbox/     # 🧪 Entorno aislado para prototipar UI
│
└── lib/
    ├── api-spec/           # 📜 OpenAPI 3.1 (fuente de verdad)
    ├── api-zod/            # ⚙️ Esquemas Zod generados
    ├── api-client-react/   # 🪝 Hooks React Query generados
    └── db/                 # 🗄️ Stub de Drizzle (no usado en MVP)
```

### Stack

| Capa            | Tecnología                                                     |
| --------------- | -------------------------------------------------------------- |
| Backend         | Node.js 20+, Express 5, Zod, Pino, esbuild                     |
| App             | Expo 54, React Native 0.81, expo-router, React Query, Reanimated |
| Tipado / API    | OpenAPI 3.1 + Orval + Zod (sin duplicar tipos a mano)          |
| Persistencia    | **En memoria** (TTL 24 h por sala) — pendiente migrar a BD     |
| Build           | pnpm workspaces · TypeScript project references · esbuild      |

### Flujo de una partida

1. El anfitrión crea una sala → recibe `roomCode` + `playerId`.
2. Comparte el código; los amigos se unen con `POST /api/rooms/:code/join`.
3. El anfitrión arranca la partida (`startGame`).
4. Cada jugador hace polling cada 3 s a `GET /api/rooms/:code` para recibir
   el estado serializado (su mano, su bandeja, jugadores, cooldowns…).
5. Acciones disponibles: `drawCard`, `throwCard`, `respondToThrow`,
   `panicVote`, `setMyTags`, `resetRoom`.

---

## 🚀 Instalación local

### Requisitos

- **Node.js ≥ 20**
- **pnpm ≥ 9** (`npm install -g pnpm`)

### Pasos

```bash
# 1. Clona el repositorio
git clone https://github.com/<tu-usuario>/caos-social.git
cd caos-social

# 2. Instala dependencias del monorepo
pnpm install

# 3. Copia las variables de entorno
cp .env.example .env
# (en local puedes dejar EXPO_PUBLIC_DOMAIN=localhost:8080)

# 4. Verifica los tipos
pnpm typecheck

# 5. Arranca el backend
pnpm --filter @workspace/api-server run dev
# → escucha en http://localhost:8080  (health: /api/healthz)

# 6. En otra terminal, arranca la app
pnpm --filter @workspace/caos-social run dev
# → web:    http://localhost:8081  (o el puerto que indique Expo)
# → móvil:  escanea el QR con Expo Go
```

### Scripts disponibles

| Script (root)            | Qué hace                                      |
| ------------------------ | --------------------------------------------- |
| `pnpm typecheck`         | Comprueba tipos de todo el monorepo           |
| `pnpm build`             | Typecheck + build de todos los paquetes       |

| Script (`@workspace/api-server`) | Qué hace                              |
| -------------------------------- | ------------------------------------- |
| `pnpm run dev`                   | Build + arranque en desarrollo        |
| `pnpm run build`                 | Bundle de producción con esbuild      |
| `pnpm run start`                 | Arranca el bundle ya compilado        |

| Script (`@workspace/caos-social`) | Qué hace                              |
| --------------------------------- | ------------------------------------- |
| `pnpm run dev`                    | Servidor de desarrollo de Expo        |
| `pnpm run build`                  | Export web estático (`dist/`)         |
| `pnpm run serve`                  | Sirve el bundle web compilado         |

---

## ☁️ Despliegue

> ⚠️ **Importante sobre Vercel.** El servidor actual mantiene las salas en
> memoria. Vercel ejecuta funciones *serverless* efímeras y **no preservaría
> el estado** entre peticiones. Para Vercel hace falta migrar antes el motor
> de salas a una base de datos (Postgres con Drizzle, o Redis). Mientras
> tanto, recomendamos un host con servidor persistente (ver opciones).

### Opción A · Replit Deployments (más rápido)

El proyecto ya está configurado para Replit (artefactos, workflows y rutas).

1. Pulsa **Deploy** dentro de Replit.
2. El sistema construye el backend (`api-server`) y la web móvil (`caos-social`)
   y los expone en `https://<tu-app>.replit.app`.

### Opción B · Backend en Railway / Render / Fly.io + App en Expo

Recomendado para producción real porque preserva las salas en memoria.

**Backend (Railway / Render):**

1. Crea un nuevo servicio Node desde el repo de GitHub.
2. **Root directory:** `/` (monorepo).
3. **Install command:** `pnpm install`.
4. **Build command:** `pnpm --filter @workspace/api-server run build`.
5. **Start command:** `pnpm --filter @workspace/api-server run start`.
6. Variables de entorno: ver `.env.example`.
7. Asigna un dominio público (p. ej. `caos-api.tudominio.com`).

**App móvil (Expo / EAS):**

```bash
npm install -g eas-cli
eas login
eas build:configure
# Define EXPO_PUBLIC_DOMAIN apuntando al dominio del backend
eas build --platform all   # Builds para iOS y Android
eas submit                 # Sube a App Store / Google Play
```

**Web estática del cliente (Vercel / Netlify / Cloudflare Pages):**

```bash
pnpm --filter @workspace/caos-social run build
# La carpeta artifacts/caos-social/dist/ es desplegable como estático
```

En Vercel, configura:
- **Build command:** `pnpm --filter @workspace/caos-social run build`
- **Output directory:** `artifacts/caos-social/dist`
- **Install command:** `pnpm install`
- **Variable de entorno:** `EXPO_PUBLIC_DOMAIN=tu-backend.com`

### Opción C · Migrar a Vercel completo

Pasos pendientes si quieres ir 100 % serverless:

1. Sustituir `lib/rooms.ts` para persistir en Postgres (Vercel Postgres o
   Neon) o Redis (Upstash).
2. Empaquetar el servidor Express como una función `api/[...all].ts` de
   Vercel.
3. Sustituir el polling cada 3 s por SSE o por WebSockets vía un servicio
   como Pusher o Ably (Vercel Functions no mantienen conexiones largas).

---

## 🔐 Variables de entorno

Ver [`.env.example`](./.env.example). En el MVP no hay ninguna clave secreta
real (la API es pública por diseño y el estado vive en memoria). Las
variables existen sobre todo para configurar el puerto, el dominio público
y el nivel de logs.

---

## 🛣️ Roadmap

- [ ] Persistencia en Postgres (Drizzle ya está cableado en `lib/db`).
- [ ] WebSockets / SSE para sustituir el polling.
- [ ] Más cartas y packs temáticos.
- [ ] Editor de packs custom para los anfitriones.
- [ ] Auth con Clerk para guardar histórico de partidas.
- [ ] Internacionalización (EN, PT).

---

## 📝 Licencia

MIT — uso libre para fiestas y otros proyectos. Atribución agradecida.
