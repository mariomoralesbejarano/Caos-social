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
    },
  },
};

export default config;
