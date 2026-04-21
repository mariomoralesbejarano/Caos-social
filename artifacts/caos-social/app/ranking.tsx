import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeonButton } from "@/components/NeonButton";
import { useGame } from "@/contexts/GameContext";
import { useColors } from "@/hooks/useColors";

export default function RankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { players, log, resetGame } = useGame();

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
      ]}
    >
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="award" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Aún no hay puntuación. Juega una partida.
          </Text>
        </View>
      ) : (
        sorted.map((p, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          const tint =
            i === 0
              ? colors.primary
              : i === 1
                ? colors.secondary
                : colors.mutedForeground;
          return (
            <View
              key={p.id}
              style={[
                styles.row,
                {
                  borderColor: i === 0 ? colors.primary : colors.border,
                  backgroundColor: colors.card,
                  shadowColor: i === 0 ? colors.primary : "transparent",
                },
              ]}
            >
              <Text style={[styles.rank, { color: tint }]}>
                {medal ?? `#${i + 1}`}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {p.name}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {p.challengesCompleted} retos cumplidos
                </Text>
              </View>
              <Text style={[styles.score, { color: tint }]}>{p.score}</Text>
            </View>
          );
        })
      )}

      {log.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.logTitle, { color: colors.mutedForeground }]}>
            HISTORIAL
          </Text>
          {log.map((entry, i) => (
            <Text
              key={i}
              style={[styles.logLine, { color: colors.foreground }]}
            >
              · {entry}
            </Text>
          ))}
        </View>
      )}

      {players.length > 0 && (
        <NeonButton
          label="Reiniciar partida"
          variant="danger"
          onPress={resetGame}
          style={{ marginTop: 24 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 2,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  rank: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    width: 48,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  score: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  logTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  logLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginVertical: 2,
  },
});
