import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FloatingMusicToggle } from "@/components/MusicToggle";
import { CaosSplash } from "@/components/SplashScreen";
import { RoomProvider } from "@/contexts/RoomContext";
import { initNativePush } from "@/lib/nativePush";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0014" },
        headerTintColor: "#39FF14",
        headerTitleStyle: { fontFamily: "Inter_700Bold" },
        contentStyle: { backgroundColor: "#0A0014" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="players" options={{ title: "Sala" }} />
      <Stack.Screen name="game" options={{ headerShown: false }} />
      <Stack.Screen name="ranking" options={{ title: "Ranking" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashDone, setSplashDone] = React.useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Pide permisos y registra el dispositivo en FCM (no-op en web/Expo Go).
  // Una vez registrado, el token queda cacheado y se asocia al jugador
  // cuando entre a una sala (`attachPlayerToPush` desde game.tsx).
  useEffect(() => {
    void initNativePush();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RoomProvider>
            <GestureHandlerRootView
              style={{ flex: 1, backgroundColor: "#0A0014" }}
            >
              <KeyboardProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
                <FloatingMusicToggle />
                {!splashDone && <CaosSplash onDone={() => setSplashDone(true)} />}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </RoomProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
