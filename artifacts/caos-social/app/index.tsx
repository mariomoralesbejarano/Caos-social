import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRoom } from "@/contexts/RoomContext";
import { useColors } from "@/hooks/useColors";

// ─── Game mode catalog ────────────────────────────────────────────────────────

interface GameMode {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  tag: string;
  active: boolean;
  route?: string;
  glowColor: string;
}

const GAME_MODES: GameMode[] = [
  {
    id: "caos",
    emoji: "🃏",
    title: "Caos Social",
    subtitle: "Retos, beber y puro caos entre amigos",
    tag: "JUGAR",
    active: true,
    route: "/caos",
    glowColor: "#39FF14",
  },
  {
    id: "baraja",
    emoji: "🎴",
    title: "Baraja Española",
    subtitle: "10 juegos: Tute, Chinchón, 7½, Burro y más",
    tag: "VER JUEGOS",
    active: true,
    route: "/baraja",
    glowColor: "#B026FF",
  },
  {
    id: "poker",
    emoji: "♠️",
    title: "Poker",
    subtitle: "Texas Hold'em online con amigos",
    tag: "PRONTO",
    active: false,
    glowColor: "#B026FF",
  },
  {
    id: "oca",
    emoji: "🎲",
    title: "Oca & Parchís",
    subtitle: "Los clásicos de mesa en tu móvil",
    tag: "PRONTO",
    active: false,
    glowColor: "#B026FF",
  },
  {
    id: "mini",
    emoji: "👾",
    title: "Sala de Minijuegos",
    subtitle: "Trivia, palabras, retos relámpago…",
    tag: "PRONTO",
    active: false,
    glowColor: "#FF2D6F",
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HubScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { session, room, hydrated } = useRoom();

  // If the user already has an active session, skip the hub.
  useEffect(() => {
    if (!hydrated || !session || !room) return;
    if (session.spectator) router.replace("/ranking");
    else if (room.status === "active") router.replace("/game");
    else router.replace("/players");
  }, [hydrated, session, room, router]);

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 24,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 48,
        },
      ]}
    >
      {/* ── Hero ── */}
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          · PARTY ONLINE 18+ ·
        </Text>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          CAOS
          {"\n"}
          <Text style={{ color: colors.secondary }}>ARCADE</Text>
        </Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          Elige tu modalidad de juego
        </Text>
      </View>

      {/* ── Grid ── */}
      <View style={styles.grid}>
        {GAME_MODES.map((mode) => (
          <GameCard
            key={mode.id}
            mode={mode}
            onPress={() => {
              if (mode.active && mode.route) router.push(mode.route as never);
            }}
          />
        ))}
      </View>

      {/* ── Footer ── */}
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        CAOS ARCADE · v3.5
      </Text>
    </ScrollView>
  );
}

// ─── GameCard component ───────────────────────────────────────────────────────

function GameCard({ mode, onPress }: { mode: GameMode; onPress: () => void }) {
  const colors = useColors();
  const isActive = mode.active;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isActive}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: isActive ? mode.glowColor : colors.border,
          opacity: isActive ? (pressed ? 0.85 : 1) : 0.45,
        },
      ]}
    >
      {/* glow gradient */}
      <LinearGradient
        colors={
          isActive
            ? [`${mode.glowColor}18`, "#15042A"]
            : ["#15042A", "#15042A"]
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* neon top-border accent */}
      {isActive && (
        <View
          style={[
            styles.cardAccent,
            { backgroundColor: mode.glowColor },
          ]}
        />
      )}

      <Text style={styles.cardEmoji}>{mode.emoji}</Text>

      <View style={styles.cardBody}>
        <Text
          style={[
            styles.cardTitle,
            { color: isActive ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {mode.title}
        </Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          {mode.subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.cardTag,
          {
            backgroundColor: isActive ? mode.glowColor + "22" : "transparent",
            borderColor: isActive ? mode.glowColor : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.cardTagText,
            { color: isActive ? mode.glowColor : colors.mutedForeground },
          ]}
        >
          {mode.tag}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero
  hero: { gap: 6, alignItems: "center" },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 3,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 58,
    lineHeight: 62,
    letterSpacing: -1,
    textAlign: "center",
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // Grid
  grid: { gap: 14 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  cardEmoji: {
    fontSize: 36,
    lineHeight: 42,
    textAlign: "center",
    width: 44,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  cardTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "center",
  },
  cardTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
  },

  // Footer
  footer: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 8,
  },
});
