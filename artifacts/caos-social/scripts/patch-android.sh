#!/usr/bin/env bash
# patch-android.sh
# Ejecutar UNA VEZ después de:
#   npx cap add android
#   npx cap sync
# Desde la raíz del proyecto caos-social (artifacts/caos-social/).
#
# Hace cuatro cosas:
#   1. Copia google-services.json a android/app/
#   2. Añade permisos de push + servicio FCM al AndroidManifest
#   3. Aplica el plugin com.google.gms.google-services en build.gradle (app)
#   4. Añade el classpath de google-services en build.gradle (root)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
ANDROID="$ROOT/android"

echo "=== patch-android.sh ==="

# ── 1. google-services.json ──────────────────────────────────────────────────
SRC="$ROOT/firebase/google-services.json"
DST="$ANDROID/app/google-services.json"
if [ -f "$SRC" ]; then
  cp "$SRC" "$DST"
  echo "✅  google-services.json copiado → android/app/"
else
  echo "⚠️  No se encontró firebase/google-services.json — ponlo tú manualmente en android/app/"
fi

# ── 2. AndroidManifest.xml ───────────────────────────────────────────────────
MANIFEST="$ANDROID/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "❌  AndroidManifest.xml no encontrado en $MANIFEST"
  exit 1
fi

# Permisos: POST_NOTIFICATIONS (Android 13+), VIBRATE, RECEIVE_BOOT_COMPLETED
add_permission() {
  local perm="$1"
  if ! grep -q "$perm" "$MANIFEST"; then
    # Inserta antes de la primera línea <application
    sed -i "s|<application|<uses-permission android:name=\"$perm\" />\n    <application|1" "$MANIFEST"
    echo "✅  Permiso añadido: $perm"
  else
    echo "⏭️  Permiso ya existe: $perm"
  fi
}

add_permission "android.permission.POST_NOTIFICATIONS"
add_permission "android.permission.RECEIVE_BOOT_COMPLETED"
add_permission "android.permission.VIBRATE"

# Servicio FCM
FCM_SERVICE='        <service\n            android:name="com.google.firebase.messaging.FirebaseMessagingService"\n            android:exported="false">\n            <intent-filter>\n                <action android:name="com.google.firebase.MESSAGING_EVENT" \/>\n            <\/intent-filter>\n        <\/service>'

if ! grep -q "FirebaseMessagingService" "$MANIFEST"; then
  # Inserta antes de </application>
  sed -i "s|</application>|${FCM_SERVICE}\n    </application>|" "$MANIFEST"
  echo "✅  FirebaseMessagingService declarado en AndroidManifest"
else
  echo "⏭️  FirebaseMessagingService ya está en AndroidManifest"
fi

# ── 3. build.gradle (app) — apply plugin ─────────────────────────────────────
APP_GRADLE="$ANDROID/app/build.gradle"
if [ -f "$APP_GRADLE" ]; then
  if ! grep -q "com.google.gms.google-services" "$APP_GRADLE"; then
    echo "" >> "$APP_GRADLE"
    echo "apply plugin: 'com.google.gms.google-services'" >> "$APP_GRADLE"
    echo "✅  Plugin google-services aplicado en app/build.gradle"
  else
    echo "⏭️  Plugin google-services ya está en app/build.gradle"
  fi
else
  echo "⚠️  app/build.gradle no encontrado"
fi

# ── 4. build.gradle (root) — classpath ───────────────────────────────────────
ROOT_GRADLE="$ANDROID/build.gradle"
if [ -f "$ROOT_GRADLE" ]; then
  if ! grep -q "google-services" "$ROOT_GRADLE"; then
    # Añade el classpath dentro del bloque dependencies { ... } del buildscript
    sed -i "s|classpath 'com.android.tools.build:gradle|classpath 'com.google.gms:google-services:4.4.2'\n        classpath 'com.android.tools.build:gradle|g" "$ROOT_GRADLE"
    echo "✅  Classpath google-services añadido en build.gradle raíz"
  else
    echo "⏭️  Classpath google-services ya está en build.gradle raíz"
  fi
else
  echo "⚠️  build.gradle raíz no encontrado"
fi

echo ""
echo "=== Parche completado. Ahora ejecuta: ==="
echo "   npx cap sync android"
echo "   npx cap open android   (o npx cap run android)"
echo ""
