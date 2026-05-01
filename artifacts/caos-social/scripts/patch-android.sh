#!/usr/bin/env bash
# patch-android.sh — Parche Android para CAOS SOCIAL
#
# Ejecutar DESPUÉS de:
#   npx cap add android   (solo la primera vez)
#   npx cap sync android
#
# Desde la raíz del proyecto:  bash scripts/patch-android.sh
#
# Qué hace:
#   1. Copia firebase/google-services.json → android/app/
#   2. Añade permisos POST_NOTIFICATIONS + VIBRATE al AndroidManifest
#   3. Declara el servicio Capacitor MessagingService en AndroidManifest
#      (com.capacitorjs.plugins.pushnotifications.MessagingService)
#   4. Aplica 'com.google.gms.google-services' AL FINAL de app/build.gradle
#   5. Añade el classpath de google-services en build.gradle raíz

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
ANDROID="$ROOT/android"

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║  CAOS SOCIAL · patch-android.sh           ║"
echo "╚═══════════════════════════════════════════╝"

if [ ! -d "$ANDROID" ]; then
  echo ""
  echo "❌  No existe el directorio android/."
  echo "    Ejecuta primero:  npx cap add android && npx cap sync android"
  exit 1
fi

# ── 1. google-services.json ──────────────────────────────────────────────────
echo ""
echo "▶  1/5  google-services.json"
SRC="$ROOT/firebase/google-services.json"
DST="$ANDROID/app/google-services.json"
if [ -f "$SRC" ]; then
  cp "$SRC" "$DST"
  echo "    ✅  Copiado → android/app/google-services.json"
else
  echo "    ⚠️  No se encontró firebase/google-services.json"
  echo "        Cópialo manualmente a android/app/google-services.json"
fi

# ── 2. Permisos en AndroidManifest ───────────────────────────────────────────
echo ""
echo "▶  2/5  Permisos AndroidManifest"
MANIFEST="$ANDROID/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "    ❌  AndroidManifest.xml no encontrado: $MANIFEST"
  exit 1
fi

add_permission() {
  local perm="$1"
  if grep -q "$perm" "$MANIFEST"; then
    echo "    ⏭️  Ya existe: $perm"
  else
    # Inserta antes del primer <application
    sed -i "0,/<application/{s|<application|<uses-permission android:name=\"$perm\" />\n    <application|}" "$MANIFEST"
    echo "    ✅  Añadido: $perm"
  fi
}

add_permission "android.permission.POST_NOTIFICATIONS"
add_permission "android.permission.RECEIVE_BOOT_COMPLETED"
add_permission "android.permission.VIBRATE"

# ── 3. MessagingService de Capacitor en AndroidManifest ──────────────────────
echo ""
echo "▶  3/5  MessagingService (Capacitor PushNotifications)"

# Nombre correcto del servicio del plugin @capacitor/push-notifications
CAP_SERVICE="com.capacitorjs.plugins.pushnotifications.MessagingService"

if grep -q "$CAP_SERVICE" "$MANIFEST"; then
  echo "    ⏭️  MessagingService ya declarado"
else
  # Buscamos si ya hay CUALQUIER FirebaseMessagingService (el de Firebase directo)
  # Si no está tampoco, añadimos el de Capacitor.
  # Lo insertamos justo antes de </application>
  SERVICE_XML="        <service\n            android:name=\"${CAP_SERVICE}\"\n            android:exported=\"false\">\n            <intent-filter>\n                <action android:name=\"com.google.firebase.MESSAGING_EVENT\" \/>\n            <\/intent-filter>\n        <\/service>"

  # Usamos un archivo temporal para compatibilidad en macOS y Linux
  TMP=$(mktemp)
  awk -v svc="$SERVICE_XML" '
    /<\/application>/ && !inserted {
      print svc
      inserted=1
    }
    { print }
  ' "$MANIFEST" > "$TMP" && mv "$TMP" "$MANIFEST"
  echo "    ✅  MessagingService declarado: $CAP_SERVICE"
fi

# ── 4. Plugin google-services AL FINAL de app/build.gradle ───────────────────
echo ""
echo "▶  4/5  Plugin google-services (app/build.gradle)"
APP_GRADLE="$ANDROID/app/build.gradle"

if [ ! -f "$APP_GRADLE" ]; then
  echo "    ⚠️  No encontrado: $APP_GRADLE"
else
  if grep -q "com.google.gms.google-services" "$APP_GRADLE"; then
    echo "    ⏭️  Plugin ya aplicado"
  else
    # Añadir AL FINAL del archivo (no mezclado en medio del bloque android{})
    printf '\n// Google Services — debe estar al final\napply plugin: '"'"'com.google.gms.google-services'"'"'\n' >> "$APP_GRADLE"
    echo "    ✅  Aplicado al final de app/build.gradle"
  fi
fi

# ── 5. Classpath en build.gradle raíz ────────────────────────────────────────
echo ""
echo "▶  5/5  Classpath google-services (build.gradle raíz)"
ROOT_GRADLE="$ANDROID/build.gradle"

if [ ! -f "$ROOT_GRADLE" ]; then
  echo "    ⚠️  No encontrado: $ROOT_GRADLE"
else
  if grep -q "com.google.gms:google-services" "$ROOT_GRADLE"; then
    echo "    ⏭️  Classpath ya presente"
  else
    # Inserta el classpath justo antes del classpath de AGP
    TMP=$(mktemp)
    sed "s|classpath 'com.android.tools.build:gradle|classpath 'com.google.gms:google-services:4.4.2'\n        classpath 'com.android.tools.build:gradle|g" \
      "$ROOT_GRADLE" > "$TMP" && mv "$TMP" "$ROOT_GRADLE"
    echo "    ✅  Classpath añadido en build.gradle raíz"
  fi
fi

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║  Parche completado ✅                      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Siguiente paso:"
echo "   npx cap sync android"
echo "   npx cap run android          # dispositivo conectado"
echo "   ./android/gradlew assembleDebug  # APK debug"
echo ""
