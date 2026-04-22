import { Feather } from "@expo/vector-icons";
import {
  getGetRoomQueryKey,
  useEndGame,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeonButton } from "@/components/NeonButton";
import { useRoom } from "@/contexts/RoomContext";
import { useColors } from "@/hooks/useColors";

export default function RankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { room, session, isLoading } = useRoom();
  const qc = useQueryClient();
  const endMut = useEndGame();
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(
    () => (room ? [...room.players].sort((a, b) => b.score - a.score) : []),
    [room],
  );

  if (isLoading || !room) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isOwner = session?.playerId === room.ownerId;
  const isEnded = room.status === "ended" || !!room.endedAt;

  async function handleEndGame() {
    setErr(null);
    try {
      await endMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId },
      });
      qc.invalidateQueries({
        queryKey: getGetRoomQueryKey(session!.roomCode, {
          playerId: session!.playerId,
        }),
      });
    } catch (e) {
      const errObj = e as { data?: { error?: string }; message?: string };
      setErr(errObj?.data?.error ?? errObj?.message ?? "Error");
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
      ]}
    >
      {isEnded && room.trophies && room.trophies.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.trophyHead, { color: colors.primary }]}>
            🏆 TROFEOS DE LA NOCHE
          </Text>
          {room.trophies.map((t, i) => (
            <View
              key={i}
              style={[
                styles.trophyRow,
                {
                  borderColor: colors.secondary,
                  backgroundColor: colors.card,
                  shadowColor: colors.secondary,
                },
              ]}
            >
              <Text style={styles.trophyEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trophyTitle, { color: colors.foreground }]}>
                  {t.title}
                </Text>
                <Text style={[styles.trophyDesc, { color: colors.mutedForeground }]}>
                  {t.playerName} · {t.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="award" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Aún no hay jugadores en la sala.
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
                  {p.tags.length > 0 ? ` · ${p.tags.join("·")}` : ""}
                </Text>
              </View>
              <Text style={[styles.score, { color: tint }]}>{p.score}</Text>
            </View>
          );
        })
      )}

      {isOwner && room.status === "active" && !isEnded && (
        <NeonButton
          label="FINALIZAR PARTIDA Y ENTREGAR TROFEOS"
          variant="secondary"
          onPress={handleEndGame}
          disabled={endMut.isPending}
          style={{ marginTop: 12 }}
        />
      )}
      {err && (
        <Text style={{ color: colors.destructive, textAlign: "center" }}>
          {err}
        </Text>
      )}

      {room.log.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.logTitle, { color: colors.mutedForeground }]}>
            HISTORIAL
          </Text>
          {room.log.map((entry, i) => (
            <Text
              key={i}
              style={[styles.logLine, { color: colors.foreground }]}
            >
              · {entry}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: 80, gap: 12 },
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
  rank: { fontFamily: "Inter_700Bold", fontSize: 22, width: 48 },
  name: { fontFamily: "Inter_700Bold", fontSize: 18 },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  score: { fontFamily: "Inter_700Bold", fontSize: 28 },
  trophyHead: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1.8,
    textAlign: "center",
    marginBottom: 4,
  },
  trophyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderWidth: 2,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 4,
  },
  trophyEmoji: { fontSize: 32 },
  trophyTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  trophyDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
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
