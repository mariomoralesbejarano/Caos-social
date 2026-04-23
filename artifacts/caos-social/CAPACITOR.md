# Caos Social — empaquetado nativo con Capacitor

- **App ID**: `com.mario.caossocial`
- **App Name**: `Caos Social`
- **Web bundle**: `artifacts/caos-social/dist/` (generado por Expo)
- **Config**: `capacitor.config.ts`

## Comandos disponibles

Desde `artifacts/caos-social/`:

```bash
pnpm run build              # Expo: genera dist/ (web bundle)
pnpm run cap:init-android   # Crea la carpeta android/ (1 sola vez)
pnpm run cap:init-ios       # Crea la carpeta ios/     (1 sola vez, requiere Mac)
pnpm run cap:sync           # build + cap sync         (cada vez que cambias código)
pnpm run cap:open:android   # abre Android Studio
pnpm run cap:open:ios       # abre Xcode
pnpm run cap:build:apk      # genera APK de debug      (requiere Android SDK + JDK)
```

## Cómo conseguir el APK instalable

Capacitor solo genera el proyecto Android; el APK lo compila Gradle con el SDK
de Android. Tienes tres caminos:

### Opción A — Android Studio en tu portátil (la más sencilla)

1. Clona el repo en local.
2. `cd artifacts/caos-social && pnpm install`
3. `pnpm run cap:init-android` (solo la primera vez).
4. `pnpm run cap:open:android` — se abre Android Studio.
5. *Build → Build Bundle(s) / APK(s) → Build APK(s)*.
6. El APK firmado en *debug* aparece en
   `artifacts/caos-social/android/app/build/outputs/apk/debug/app-debug.apk`.

### Opción B — Compilar el APK aquí en Replit

Replit no trae el Android SDK por defecto, hay que instalarlo:

1. Añade los paquetes nativos al `replit.nix` (o pídeme que lo haga):
   ```nix
   { pkgs }: {
     deps = [
       pkgs.jdk17
       pkgs.gradle
       pkgs.android-tools
       pkgs.androidsdk_9_0  # o el canal `androidenv` actual
     ];
     env.ANDROID_HOME = "${pkgs.androidsdk_9_0}/libexec/android-sdk";
   }
   ```
2. En la *Shell*:
   ```bash
   cd artifacts/caos-social
   pnpm install
   pnpm run cap:init-android   # solo la primera vez
   pnpm run cap:build:apk
   ```
3. El APK estará en
   `artifacts/caos-social/android/app/build/outputs/apk/debug/app-debug.apk`.
   Pulsa *Files → … → Download* sobre ese fichero para bajarlo al móvil.

> ⚠️ La primera vez Gradle descarga ~1 GB de dependencias y puede tardar
> 10-15 min. Las siguientes builds son cuestión de segundos.

### Opción C — GitHub Actions (recomendada para distribuir)

Crea `.github/workflows/android.yml` con `actions/setup-java@v4` +
`android-actions/setup-android@v3` + `pnpm run cap:build:apk` y deja el APK
como artifact descargable. Si quieres, te lo preparo.

## Instalar el APK en el móvil

1. Copia el `app-debug.apk` al teléfono (cable, Drive, Telegram…).
2. En Android: *Ajustes → Seguridad → Instalar apps de orígenes desconocidos*
   y autoriza al gestor de archivos.
3. Toca el APK y pulsa *Instalar*.

## Notas técnicas

- El bundle web se sirve **localmente** desde el APK (no hay carga remota),
  así que iconos (`@expo/vector-icons`, `lucide-react-native`) y la música
  (Web Audio API) funcionan sin internet.
- Supabase Realtime sigue funcionando porque solo necesita acceso HTTPS al
  backend de Supabase.
- Para activar push reales con la app cerrada: instala
  `@capacitor/push-notifications` (ya añadido) o `onesignal-capacitor-plugin`
  y rellena los TODO de `lib/nativePush.ts`.
