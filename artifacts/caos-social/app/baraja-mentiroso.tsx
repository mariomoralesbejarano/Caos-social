/**
 * El Mentiroso — full multiplayer game screen.
 * Handles: turn-based card play with value declarations, ¡MENTIRA! challenges,
 * pile management, and end-of-game winner screen.
 */
import {
  useCallMentira,
  useGetBarajaRoom,
  usePlayMentiroso,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { SpanishCard, VALOR_PLURAL } from "@/components/SpanishCard";
import type { Palo } from "@/components/SpanishCard";
import { useColors } from "@/hooks/useColors";
import {
  clearBarajaSession,
  loadBarajaSession,
} from "@/lib/barajaSession";
import type { BarajaSession } from "@/lib/barajaSession";
import type { MentirosoState } from "@workspace/api-client-react";
import { VALORES } from "@workspace/api-client-react";

export default function MentirosoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [openingValue, setOpeningValue] = useState(1);

  useEffect(() => {
    loadBarajaSession().then((s) => { setSession(s); setHydrated(true); });
  }, []);

  const { data: room, isLoading } = useGetBarajaRoom(
    session?.roomCode ?? "",
    session?.playerId ?? "",
  );

  const playMut = usePlayMentiroso();
  const mentiraMut = useCallMentira();

  const gs = room?.gameState?.type === "mentiroso"
    ? (room.gameState as MentirosoState)
    : null;

  const myId = session?.playerId ?? "";
  const isMyTurn = gs ? gs.playerOrder[gs.currentIdx] === myId : false;
  const isFirstPlay = gs?.firstPlayDone !== true;
  const canCallMentira =
    gs?.lastPlay !== null &&
    gs?.lastPlay !== undefined &&
    gs.lastPlay.playerId !== myId;

  function toggleCard(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  function playerName(id: string) {
    return room?.players.find((p) => p.id === id)?.name ?? id;
  }
  function playerAvatar(id: string) {
    return room?.players.find((p) => p.id === id)?.avatar ?? "?";
  }

  async function handlePlay() {
    if (!session || !room || selected.size === 0) return;
    setActionError(null);
    try {
      await playMut.mutateAsync({
        code: room.code,
        playerId: session.playerId,
        cardIds: [...selected],
        declaredValue: isFirstPlay ? openingValue : undefined,
      });
      setSelected(new Set());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleMentira() {
    if (!session || !room) return;
    setActionError(null);
    try {
      await mentiraMut.mutateAsync({ code: room.code, callerId: session.playerId });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleLeave() {
    await clearBarajaSession();
    router.replace("/baraja" as never);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!hydrated || (session && isLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!session || !room || !gs) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold" }}>
          Error al cargar la partida.
        </Text>
        <Pressable onPress={handleLeave} style={[styles.smBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground }}>← Salir</Text>
        </Pressable>
      </View>
    );
  }

  // ── Ended ───────────────────────────────────────────────────────────────────
  if (gs.phase === "ended" || room.status === "ended") {
    const winner = room.players.find((p) => p.id === gs.winner);
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 20, paddingBottom: 48 }]}
      >
        <Text style={[styles.bigTitle, { color: colors.primary }]}>🏆 FIN DEL JUEGO</Text>
        {winner && (
          <View style={[styles.winnerCard, { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}>
            <Text style={styles.winnerAvatar}>{winner.avatar}</Text>
            <Text style={[styles.winnerName, { color: colors.primary }]}>{winner.name}</Text>
            <Text style={[styles.winnerSub, { color: colors.mutedForeground }]}>
              ¡Primero sin cartas!
            </Text>
          </View>
        )}
        <View style={[styles.logCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {room.log.slice().reverse().slice(0, 10).map((e, i) => (
            <Text key={i} style={[styles.logEntry, { color: colors.mutedForeground }]}>{e}</Text>
          ))}
        </View>
        <Pressable
          onPress={handleLeave}
          style={[styles.bigBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "22" }]}
        >
          <Text style={[styles.bigBtnText, { color: colors.primary }]}>← Volver al menú</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const currentTurnName = playerName(gs.playerOrder[gs.currentIdx]);
  const lastPlay = gs.lastPlay;
  const declaredNow = isFirstPlay ? openingValue : gs.declaredValue;
  const declaredLabel = VALOR_PLURAL[declaredNow] ?? String(declaredNow);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8, paddingBottom: 60 },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gameTitle, { color: colors.foreground }]}>👺 EL MENTIROSO</Text>
          <View style={styles.declaredRow}>
            <Text style={[styles.declaredLabel, { color: colors.mutedForeground }]}>Declarar ahora: </Text>
            <Text style={[styles.declaredValue, { color: colors.secondary }]}>{declaredLabel}</Text>
          </View>
        </View>
        <Pressable onPress={handleLeave} style={[styles.smBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_700Bold" }}>SALIR</Text>
        </Pressable>
      </View>

      {/* ── Players: avatars + hand counts ── */}
      <View style={[styles.playersRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {room.players.map((p) => {
          const isActive = gs.playerOrder[gs.currentIdx] === p.id;
          return (
            <View key={p.id} style={[
              styles.playerChip,
              isActive && { backgroundColor: colors.secondary + "22", borderRadius: 10 },
            ]}>
              <Text style={styles.chipAvatar}>{p.avatar}</Text>
              <Text
                style={[styles.chipName, {
                  color: isActive ? colors.secondary : p.id === myId ? colors.primary : colors.foreground,
                }]}
                numberOfLines={1}
              >
                {p.name}{p.id === myId ? " (tú)" : ""}
              </Text>
              <Text style={[styles.chipCount, { color: colors.mutedForeground }]}>
                {p.handCount} 🃏
              </Text>
              {isActive && (
                <Text style={{ fontSize: 10, color: colors.secondary }}>◀</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Pile and last declaration ── */}
      <View style={[styles.pileCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.pileRow}>
          <View style={styles.pileSide}>
            <Text style={[styles.pileNumber, { color: colors.primary }]}>{gs.pile.length}</Text>
            <Text style={[styles.pileLabel, { color: colors.mutedForeground }]}>en mesa</Text>
          </View>
          {lastPlay ? (
            <View style={styles.lastPlaySide}>
              <Text style={[styles.lastPlayName, { color: colors.foreground }]}>
                {playerAvatar(lastPlay.playerId)} {playerName(lastPlay.playerId)} dijo:
              </Text>
              <Text style={[styles.lastPlayValue, { color: colors.secondary }]}>
                {lastPlay.count} {VALOR_PLURAL[lastPlay.declaredValue] ?? String(lastPlay.declaredValue)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noPlay, { color: colors.mutedForeground }]}>
              Sin jugada previa
            </Text>
          )}
        </View>
      </View>

      {/* ── Turn indicator ── */}
      <View style={[styles.turnBanner, {
        borderColor: isMyTurn ? colors.primary : colors.border,
        backgroundColor: isMyTurn ? colors.primary + "15" : colors.card,
      }]}>
        <Text style={[styles.turnText, { color: isMyTurn ? colors.primary : colors.mutedForeground }]}>
          {isMyTurn
            ? `🎯 TU TURNO — selecciona cartas y pulsa JUGAR`
            : `⏳ Turno de ${currentTurnName}…`}
        </Text>
      </View>

      {/* ── ¡MENTIRA! button ── */}
      {canCallMentira && (
        <Pressable
          onPress={handleMentira}
          disabled={mentiraMut.isPending}
          style={({ pressed }) => [
            styles.mentiraBtn,
            {
              borderColor: "#EF4444",
              backgroundColor: `#EF4444${pressed ? "44" : "22"}`,
              shadowColor: "#EF4444",
              opacity: mentiraMut.isPending ? 0.6 : 1,
            },
          ]}
        >
          {mentiraMut.isPending ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <Text style={[styles.mentiraBtnMain, { color: "#EF4444" }]}>¡MENTIRA!</Text>
              {lastPlay && (
                <Text style={[styles.mentiraBtnSub, { color: "#EF4444" }]}>
                  {playerName(lastPlay.playerId)} puso {lastPlay.count} carta{lastPlay.count > 1 ? "s" : ""}
                </Text>
              )}
            </>
          )}
        </Pressable>
      )}

      {/* ── My hand ── */}
      <View style={[styles.handCard, {
        borderColor: isMyTurn ? colors.primary : colors.border,
        backgroundColor: colors.card,
      }]}>
        <Text style={[styles.handTitle, { color: isMyTurn ? colors.primary : colors.foreground }]}>
          {isMyTurn
            ? `Toca las cartas a jugar (${selected.size}/4 sel.)`
            : `Tu mano — ${room.myHand.length} carta${room.myHand.length !== 1 ? "s" : ""}`}
        </Text>
        {room.myHand.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Sin cartas en mano
          </Text>
        ) : (
          <View style={styles.handRow}>
            {room.myHand.map((c) => (
              <SpanishCard
                key={c.id}
                palo={c.palo as Palo}
                valor={c.valor}
                size="sm"
                selected={selected.has(c.id)}
                disabled={!isMyTurn}
                onPress={isMyTurn ? () => toggleCard(c.id) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Play button ── */}
      {isMyTurn && (
        <View style={{ gap: 8 }}>
          {isFirstPlay && (
            <View style={[styles.openingPicker, { borderColor: colors.secondary + "66", backgroundColor: colors.secondary + "10" }]}>
              <Text style={[styles.openingPickerLabel, { color: colors.foreground }]}>
                Elige el valor de la primera declaración
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.valueChoiceRow}>
                {VALORES.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setOpeningValue(value)}
                    style={[
                      styles.valueChoice,
                      {
                        borderColor: openingValue === value ? colors.secondary : colors.border,
                        backgroundColor: openingValue === value ? colors.secondary + "33" : colors.card,
                      },
                    ]}
                  >
                    <Text style={{ color: openingValue === value ? colors.secondary : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {selected.size > 0 && (
            <View style={[styles.playPreview, { borderColor: colors.secondary + "55", backgroundColor: colors.secondary + "11" }]}>
              <Text style={[styles.playPreviewText, { color: colors.secondary }]}>
                Jugarás {selected.size} carta{selected.size > 1 ? "s" : ""} declarando{" "}
                <Text style={{ fontFamily: "Inter_700Bold" }}>{declaredLabel}</Text>
              </Text>
            </View>
          )}
          {actionError && (
            <Text style={{ color: colors.destructive, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
              {actionError}
            </Text>
          )}
          <Pressable
            onPress={handlePlay}
            disabled={selected.size === 0 || playMut.isPending}
            style={[
              styles.playBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.primary + (selected.size > 0 ? "33" : "11"),
                shadowColor: colors.primary,
                opacity: selected.size === 0 ? 0.4 : 1,
              },
            ]}
          >
            {playMut.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.playBtnText, { color: colors.primary }]}>
                🃏 JUGAR {selected.size > 0 ? `${selected.size} CARTA${selected.size > 1 ? "S" : ""}` : ""}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── Log ── */}
      <View style={[styles.logCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {(gs.log ?? room.log).slice().reverse().slice(0, 6).map((e, i) => (
          <Text key={i} style={[styles.logEntry, { color: colors.mutedForeground }]}>{e}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  smBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  bigBtn: { paddingVertical: 15, borderRadius: 12, borderWidth: 2, alignItems: "center" },
  bigBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },

  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  gameTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  declaredRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  declaredLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  declaredValue: { fontFamily: "Inter_700Bold", fontSize: 22 },
  openingPicker: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 8 },
  openingPickerLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  valueChoiceRow: { gap: 6, paddingRight: 4 },
  valueChoice: { width: 38, height: 34, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  playersRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    borderRadius: 12, borderWidth: 1, padding: 10,
  },
  playerChip: { alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 6, minWidth: 56 },
  chipAvatar: { fontSize: 22 },
  chipName: { fontFamily: "Inter_500Medium", fontSize: 10, textAlign: "center" },
  chipCount: { fontFamily: "Inter_400Regular", fontSize: 11 },

  pileCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  pileRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  pileSide: { alignItems: "center", minWidth: 60 },
  pileNumber: { fontFamily: "Inter_700Bold", fontSize: 44, lineHeight: 52 },
  pileLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  lastPlaySide: { flex: 1, gap: 4 },
  lastPlayName: { fontFamily: "Inter_500Medium", fontSize: 13 },
  lastPlayValue: { fontFamily: "Inter_700Bold", fontSize: 24 },
  noPlay: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, fontStyle: "italic" },

  turnBanner: { borderRadius: 12, borderWidth: 2, padding: 14 },
  turnText: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "center" },

  mentiraBtn: {
    paddingVertical: 22, borderRadius: 16, borderWidth: 3,
    alignItems: "center", gap: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12,
  },
  mentiraBtnMain: { fontFamily: "Inter_700Bold", fontSize: 32, letterSpacing: 2 },
  mentiraBtnSub: { fontFamily: "Inter_400Regular", fontSize: 12 },

  handCard: { borderRadius: 12, borderWidth: 2, padding: 14, gap: 12 },
  handTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  handRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  playPreview: { borderRadius: 10, borderWidth: 1, padding: 10, alignItems: "center" },
  playPreviewText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  playBtn: {
    paddingVertical: 16, borderRadius: 12, borderWidth: 2, alignItems: "center",
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
  },
  playBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 1.5 },

  logCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },

  bigTitle: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center", marginBottom: 8 },
  winnerCard: { borderRadius: 16, borderWidth: 2, padding: 24, alignItems: "center", gap: 8 },
  winnerAvatar: { fontSize: 56, lineHeight: 64 },
  winnerName: { fontFamily: "Inter_700Bold", fontSize: 28 },
  winnerSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
