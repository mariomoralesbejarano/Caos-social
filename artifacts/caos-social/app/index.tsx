import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeonButton } from "@/components/NeonButton";
import { PACKS } from "@/constants/cards";
import { useGame } from "@/contexts/GameContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { players, pack, setPack, startGame } = useGame();
  const isWeb = Platform.OS === "web";

  const canPlay = players.length >= 2;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 20,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 40,
        },
      ]}
    >
      <View style={styles.hero}>
        <Text style={[styles.tag, { color: colors.primary }]}>
          PARTY GAME · 18+
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          CAOS{"\n"}
          <Text style={{ color: colors.secondary }}>SOCIAL</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Lanza retos. Activa poderes. Desata el caos entre amigos.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="users" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Jugadores
          </Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {players.length}
          </Text>
        </View>
        {players.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Añade al menos 2 jugadores para empezar.
          </Text>
        ) : (
          <View style={styles.playersGrid}>
            {players.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.playerChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.chipName, { color: colors.foreground }]}>
                  {p.name}
                </Text>
                {p.tags.length > 0 && (
                  <Text style={[styles.chipTags, { color: colors.primary }]}>
                    {p.tags.join(" · ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        <NeonButton
          label="Gestionar jugadores"
          variant="ghost"
          onPress={() => router.push("/players")}
          style={{ marginTop: 12 }}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="layers" size={18} color={colors.secondary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Pack de cartas
          </Text>
        </View>
        {PACKS.map((p) => {
          const active = pack === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPack(p.id)}
              style={({ pressed }) => [
                styles.packCard,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: colors.card,
                  shadowColor: active ? colors.primary : "transparent",
                },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={
                  active ? ["#1a4d0a", "#15042A"] : ["#15042A", "#15042A"]
                }
                style={StyleSheet.absoluteFill}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.packName, { color: colors.foreground }]}>
                  {p.name}
                </Text>
                <Text
                  style={[styles.packDesc, { color: colors.mutedForeground }]}
                >
                  {p.description}
                </Text>
              </View>
              {active && (
                <Feather name="check-circle" size={22} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
      </View>

      <NeonButton
        label={canPlay ? "INICIAR PARTIDA" : "Necesitas 2+ jugadores"}
        disabled={!canPlay}
        onPress={() => {
          startGame();
          router.push("/game");
        }}
        style={{ marginTop: 8 }}
      />

      <Pressable
        onPress={() => router.push("/ranking")}
        style={styles.linkRow}
      >
        <Feather name="award" size={16} color={colors.mutedForeground} />
        <Text style={[styles.link, { color: colors.mutedForeground }]}>
          Ver ranking histórico
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 28,
  },
  hero: {
    gap: 8,
  },
  tag: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    flex: 1,
  },
  count: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    fontStyle: "italic",
  },
  playersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  chipTags: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  packCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  packName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  packDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: 8,
  },
  link: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
