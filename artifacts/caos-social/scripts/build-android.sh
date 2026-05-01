#!/usr/bin/env bash
# build-android.sh
# Script completo para generar el APK desde cero.
# Ejecutar desde la raíz del proyecto (artifacts/caos-social/).
#
# Requisitos:
#   - Node.js, pnpm
#   - Java 17+, Android SDK (ANDROID_HOME configurado)
#   - @capacitor/cli instalado (npx cap)

set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶  1/5  Exportando web assets (Expo → dist/)..."
pnpm run build

echo "▶  2/5  Sincronizando con Capacitor..."
npx cap sync android

echo "▶  3/5  Aplicando parches de Firebase/FCM..."
bash scripts/patch-android.sh

echo "▶  4/5  Compilando APK debug..."
cd android
./gradlew assembleDebug

echo ""
echo "✅  APK generado en:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "▶  5/5  Opciones:"
echo "   Instalar en dispositivo conectado: adb install app/build/outputs/apk/debug/app-debug.apk"
echo "   Abrir en Android Studio:           npx cap open android"
