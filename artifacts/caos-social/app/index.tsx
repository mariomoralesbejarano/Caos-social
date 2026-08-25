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
  category: "Juegos de Tablero" | "Casino & Apuestas" | "Arena Competitiva" | "Sala de Fiesta";
  badges: string[];
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
    category: "Sala de Fiesta",
    badges: ["Multijugador", "Modo Tragos"],
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
    category: "Juegos de Tablero",
    badges: ["Multijugador", "8 Modos"],
  },
  {
    id: "blackjack",
    emoji: "♣️",
    title: "Blackjack 21",
    subtitle: "Juega contra el dealer: hit, stand, double y split",
    tag: "JUGAR",
    active: true,
    route: "/blackjack",
    glowColor: "#39FF14",
    category: "Casino & Apuestas",
    badges: ["1–7 jugadores", "21 puntos"],
  },
  {
    id: "poker",
    emoji: "♠️",
    title: "Poker",
    subtitle: "Texas Hold'em online con amigos",
    tag: "JUGAR",
    active: true,
    route: "/poker-game",
    glowColor: "#B026FF",
    category: "Casino & Apuestas",
    badges: ["Multijugador", "Texas Hold'em"],
  },
  {
    id: "parchis",
    emoji: "🟡",
    title: "Parchís",
    subtitle: "Carrera multijugador en tiempo real",
    tag: "JUGAR",
    active: true,
    route: "/parchis",
    glowColor: "#FFB800",
    category: "Juegos de Tablero",
    badges: ["Multijugador", "Carrera"],
  },
  {
    id: "oca",
    emoji: "🦢",
    title: "La Oca",
    subtitle: "Llega a la casilla 63 con tu grupo",
    tag: "JUGAR",
    active: true,
    route: "/oca",
    glowColor: "#B026FF",
    category: "Juegos de Tablero",
    badges: ["Multijugador", "63 casillas"],
  },
  {
    id: "monopoly",
    emoji: "🏙️",
    title: "Monopoly Social",
    subtitle: "Compra calles, cobra alquileres y escala la ciudad",
    tag: "JUGAR",
    active: true,
    route: "/monopoly",
    glowColor: "#55D6FF",
    category: "Juegos de Tablero",
    badges: ["Multijugador", "Estrategia"],
  },
  {
    id: "arena",
    emoji: "⚡",
    title: "Arena de Minijuegos",
    subtitle: "Reflejos, bomba y memoria en rondas rápidas",
    tag: "JUGAR",
    active: true,
    route: "/minigames",
    glowColor: "#FF4F9A",
    category: "Arena Competitiva",
    badges: ["Multijugador", "30 Minijuegos"],
  },
  {
    id: "mini",
    emoji: "👾",
    title: "Sala de Minijuegos",
    subtitle: "Trivia, palabras, retos relámpago…",
    tag: "JUGAR",
    active: true,
    route: "/minigames",
    glowColor: "#FF2D6F",
    category: "Arena Competitiva",
    badges: ["Multijugador", "Rondas rápidas"],
  },
  {
    id: "party",
    emoji: "🎉",
    title: "Sala Social Party",
    subtitle: "Moneda, Yo Nunca, Verdad o Reto y votaciones",
    tag: "JUGAR",
    active: true,
    route: "/party-room",
    glowColor: "#FF7A45",
    category: "Sala de Fiesta",
    badges: ["Multijugador", "Modo Tragos"],
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
    <LinearGradient colors={["#0B0E14", "#121824"]} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
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
      {(["Juegos de Tablero", "Casino & Apuestas", "Arena Competitiva", "Sala de Fiesta"] as const).map((category) => {
        const modes = GAME_MODES.filter((mode) => mode.category === category);
        return (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: category === "Casino & Apuestas" ? colors.secondary : colors.primary }]}>
              {category.toUpperCase()}
            </Text>
            <View style={styles.grid}>
              {modes.map((mode) => (
                <GameCard
                  key={mode.id}
                  mode={mode}
                  onPress={() => mode.route && router.push(mode.route as never)}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* ── Footer ── */}
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        CAOS ARCADE · v3.5
      </Text>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── GameCard component ───────────────────────────────────────────────────────

function GameCard({ mode, onPress }: { mode: GameMode; onPress: () => void }) {
  const colors = useColors();
  const isActive = mode.active;

  return (
    <Pressable
      onPress={onPress}
      disabled={false}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: mode.glowColor,
          opacity: pressed ? 0.82 : 1,
          transform: pressed ? [{ scale: 0.97 }] : undefined,
        },
      ]}
    >
      {/* glow gradient */}
      <LinearGradient
        colors={
          isActive
            ? [`${mode.glowColor}20`, "#121824"]
            : ["rgba(255,255,255,0.06)", "#121824"]
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
        <View style={styles.badges}>
          {mode.badges.map((badge) => (
            <View key={badge} style={[styles.badge, { borderColor: `${mode.glowColor}88`, backgroundColor: `${mode.glowColor}12` }]}>
              <Text style={[styles.badgeText, { color: mode.glowColor }]}>{badge}</Text>
            </View>
          ))}
        </View>
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
          JUGAR
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 24, maxWidth: 820, width: "100%", alignSelf: "center" },
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
  categorySection: { gap: 10 },
  categoryTitle: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2, marginLeft: 3 },
  grid: { gap: 12 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
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
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.2 },
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
