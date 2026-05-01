import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mario.caossocial",
  appName: "Caos Social",
  // Capacitor empaqueta los assets que Expo exporta a `dist/`
  // mediante `pnpm run build` (= `expo export --platform web`).
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0a0f",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0a0f",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
      // No pedir permisos automáticamente al arrancar: lo hace nativePush.ts
      // con delay de 2 s para garantizar que Firebase está listo.
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0A0014",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
