/**
 * Las Apuestas — full multiplayer game screen.
 * Rules: pure rank-based trick resolution (no trump), dealer rotates left each round,
 * mano (left of dealer) starts betting and leads first trick.
 */
import {
  useGetBarajaRoom,
  usePlayApuestasCard,
  usePlaceApuestasBet,
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

import { SpanishCard, SpanishCardById, RANK_ORDER, VALOR_PLURAL } from "@/components/SpanishCard";
import type { Palo } from "@/components/SpanishCard";
import { useColors } from "@/hooks/useColors";
import {
  clearBarajaSession,
  loadBarajaSession,
} from "@/lib/barajaSession";
import type { BarajaSession } from "@/lib/barajaSession";
import type {
  ApuestasState,
} from "@workspace/api-client-react";

// ─── Rank legend pill ─────────────────────────────────────────────────────────
const RANK_LABELS: Record<number, string> = {
  1: "1", 3: "3", 12: "12", 11: "11", 10: "10", 7: "7", 6: "6", 5: "5", 4: "4", 2: "2",
};

export default function ApuestasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [betValue, setBetValue] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadBarajaSession().then((s) => { setSession(s); setHydrated(true); });
  }, []);

  const { data: room, isLoading } = useGetBarajaRoom(
    session?.roomCode ?? "",
    session?.playerId ?? "",
  );

  const betMut = usePlaceApuestasBet();
  const playMut = usePlayApuestasCard();

  const gs = room?.gameState?.type === "apuestas"
    ? (room.gameState as ApuestasState)
    : null;

  const myId = session?.playerId ?? "";
  const r = gs?.currentRound;

  // Determine turns
  const isMyBetTurn = gs?.phase === "betting" && r?.bettingOrder[r.bettingIdx] === myId;
  const trickPlayed = new Set(r?.currentTrick.map((c) => c.playerId) ?? []);
  const playingOrder: string[] = r
    ? (() => {
        const idx = r.bettingOrder.indexOf(r.trickLeader);
        return [
          ...r.bettingOrder.slice(idx),
          ...r.bettingOrder.slice(0, idx),
        ];
      })()
    : [];
  const nextToPlay = playingOrder.find((pid) => !trickPlayed.has(pid));
  const isMyPlayTurn = gs?.phase === "playing" && nextToPlay === myId;
  const isForehead = gs?.phase === "playing" && r?.roundNum === 1;

  // Dealer info
  const dealerPlayer = gs
    ? room?.players.find((p) => p.id === gs.playerOrder[gs.dealerIdx])
    : null;
  const manoPlayer = gs && room
    ? room.players.find(
        (p) => p.id === gs.playerOrder[(gs.dealerIdx + 1) % gs.playerOrder.length],
      )
    : null;

  function playerName(id: string) {
    return room?.players.find((p) => p.id === id)?.name ?? id;
  }
  function playerAvatar(id: string) {
    return room?.players.find((p) => p.id === id)?.avatar ?? "?";
  }

  async function handleBet() {
    if (!session || !room) return;
    setActionError(null);
    try {
      await betMut.mutateAsync({ code: room.code, playerId: session.playerId, bet: betValue });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handlePlayCard(cardId: string) {
    if (!session || !room) return;
    setActionError(null);
    try {
      await playMut.mutateAsync({ code: room.code, playerId: session.playerId, cardId });
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
    const sorted = [...room.players].sort(
      (a, b) => (gs.scores[b.id] ?? 0) - (gs.scores[a.id] ?? 0),
    );
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 20, paddingBottom: 48 }]}
      >
        <Text style={[styles.bigTitle, { color: colors.primary }]}>🏆 FIN DE PARTIDA</Text>
        {sorted.map((p, i) => (
          <View key={p.id} style={[styles.rankRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.rankNum, { color: i === 0 ? colors.primary : colors.mutedForeground }]}>
              #{i + 1}
            </Text>
            <Text style={styles.rankAvatar}>{p.avatar}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rankName, { color: colors.foreground }]}>{p.name}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>
                {"❤️".repeat(Math.max(0, gs.lives[p.id] ?? 0))}
              </Text>
            </View>
            <Text style={[styles.rankScore, { color: colors.primary }]}>
              {gs.lives[p.id] ?? 0}/{room.livesPerPlayer ?? 5} vidas
            </Text>
          </View>
        ))}
        <Pressable
          onPress={handleLeave}
          style={[styles.bigBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "22" }]}
        >
          <Text style={[styles.bigBtnText, { color: colors.primary }]}>← Volver al menú</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const maxBet = r?.cardsDealt ?? 0;
  const sumOtherBets = Object.entries(r?.bets ?? {})
    .filter(([id]) => id !== myId)
    .reduce((a, [, v]) => a + v, 0);
  const isLastBettor = r ? r.bettingIdx === r.bettingOrder.length - 1 : false;
  const forbiddenBet = isLastBettor ? maxBet - sumOtherBets : -1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8, paddingBottom: 60 },
      ]}
    >
      {/* ── Round header ── */}
      <View style={styles.roundHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.roundLabel, { color: colors.secondary }]}>
            RONDA {gs.roundNum} · {r?.cardsDealt} carta{(r?.cardsDealt ?? 0) > 1 ? "s" : ""}
          </Text>
          <View style={styles.dealerRow}>
            <Text style={[styles.dealerInfo, { color: colors.mutedForeground }]}>
              🎴 Reparte: <Text style={{ color: colors.foreground }}>{dealerPlayer?.name ?? "—"}</Text>
              {"  "}
              🥇 Mano: <Text style={{ color: colors.primary }}>{manoPlayer?.name ?? "—"}</Text>
            </Text>
          </View>
          {isForehead && (
            <Text style={[styles.foreheadNote, { color: colors.destructive }]}>
              ⚠️ RONDA ESPECIAL · No ves tu propia carta
            </Text>
          )}
        </View>
        <Pressable onPress={handleLeave} style={[styles.smBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_700Bold" }}>SALIR</Text>
        </Pressable>
      </View>

      {/* ── Rank legend ── */}
      <View style={[styles.rankLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.rankLegendLabel, { color: colors.mutedForeground }]}>Fuerza → </Text>
        {RANK_ORDER.map((v, i) => (
          <View key={v} style={styles.rankLegendItem}>
            <Text style={[styles.rankLegendVal, { color: colors.foreground }]}>
              {RANK_LABELS[v]}
            </Text>
            {i < RANK_ORDER.length - 1 && (
              <Text style={[styles.rankLegendSep, { color: colors.mutedForeground }]}> › </Text>
            )}
          </View>
        ))}
      </View>

      {/* ── Scores / lives ── */}
      <View style={[styles.scoresCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.cardHeading, { color: colors.foreground }]}>📊 Vidas y resultado</Text>
        <View style={styles.scoresGrid}>
          {room.players.map((p) => {
            const isDealer = p.id === dealerPlayer?.id;
            const isMano = p.id === manoPlayer?.id;
            const lastResult = (gs.lastRoundResults ?? []).find((result) => result.playerId === p.id);
            const currentBet = r?.bets[p.id];
            const currentWon = r?.bazasWon[p.id] ?? 0;
            const displayedBet = currentBet ?? lastResult?.predicted;
            const displayedWon = currentBet !== undefined ? currentWon : lastResult?.actual;
            return (
              <View key={p.id} style={styles.scoreItem}>
                <Text style={styles.scoreAvatar}>{p.avatar}</Text>
                <Text
                  style={[styles.scoreName, { color: p.id === myId ? colors.primary : colors.foreground }]}
                  numberOfLines={1}
                >
                  {p.name}
                  {isDealer ? " 🎴" : ""}
                  {isMano ? " ⭐" : ""}
                </Text>
                <Text style={[styles.scoreVal, { color: colors.primary }]}>
                  {gs.lives[p.id] ?? 0}/{room.livesPerPlayer ?? 5} ♥
                </Text>
                <Text style={styles.scoreLives}>
                {"❤️".repeat(Math.max(0, gs.lives[p.id] ?? 0))}
                </Text>
              <Text style={[styles.scoreFormula, { color: colors.mutedForeground }]}>
                {displayedBet === undefined
                  ? "Apostadas — · Ganadas 0"
                  : `Apostadas ${displayedBet} · Ganadas ${displayedWon ?? 0}`}
              </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Betting phase ── */}
      {gs.phase === "betting" && (
        <View style={[styles.phaseCard, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
          <Text style={[styles.cardHeading, { color: colors.secondary }]}>
            🎯 FASE DE APUESTAS
          </Text>

          {/* Who bets what */}
          <View style={styles.betsRow}>
            {r?.bettingOrder.map((pid) => {
              const bet = r.bets[pid];
              const isNext = r.bettingOrder[r.bettingIdx] === pid;
              const isMe = pid === myId;
              return (
                <View key={pid} style={[
                  styles.betChip,
                  isNext && { backgroundColor: colors.secondary + "22", borderRadius: 8, padding: 4 }
                ]}>
                  <Text style={styles.betAvatar}>{playerAvatar(pid)}</Text>
                  <Text style={[styles.betName, { color: isMe ? colors.primary : colors.foreground }]} numberOfLines={1}>
                    {playerName(pid)}
                    {pid === dealerPlayer?.id ? " 🎴" : ""}
                  </Text>
                  <Text style={[styles.betValue, {
                    color: bet !== undefined ? colors.primary : isNext ? colors.secondary : colors.mutedForeground,
                  }]}>
                    {bet !== undefined ? `${bet} baza${bet !== 1 ? "s" : ""}` : isNext ? "apostando…" : "—"}
                  </Text>
                </View>
              );
            })}
          </View>

          {isMyBetTurn ? (
            <View style={styles.betControls}>
              <Text style={[styles.betPrompt, { color: colors.foreground }]}>
                ¿Cuántas bazas vas a ganar?
              </Text>
              {isLastBettor && forbiddenBet >= 0 && (
                <Text style={[styles.betHint, { color: colors.destructive }]}>
                  ⛔ No puedes apostar {forbiddenBet} · suma total no puede ser {maxBet}
                </Text>
              )}
              <View style={styles.betPicker}>
                <Pressable
                  onPress={() => setBetValue((v) => Math.max(0, v - 1))}
                  style={[styles.betBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>−</Text>
                </Pressable>
                <Text style={[styles.betCurrent, { color: colors.primary }]}>{betValue}</Text>
                <Pressable
                  onPress={() => setBetValue((v) => Math.min(maxBet, v + 1))}
                  style={[styles.betBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: "Inter_700Bold" }}>+</Text>
                </Pressable>
              </View>
              {actionError && (
                <Text style={[styles.betHint, { color: colors.destructive }]}>{actionError}</Text>
              )}
              <Pressable
                onPress={handleBet}
                disabled={betMut.isPending || betValue === forbiddenBet}
                style={[
                  styles.confirmBtn,
                  {
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary + "22",
                    opacity: betValue === forbiddenBet ? 0.4 : 1,
                  },
                ]}
              >
                {betMut.isPending ? (
                  <ActivityIndicator color={colors.secondary} />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: colors.secondary }]}>
                    CONFIRMAR APUESTA
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.waitText, { color: colors.mutedForeground }]}>
              ⏳ Esperando a {playerName(r?.bettingOrder[r?.bettingIdx ?? 0] ?? "")}…
            </Text>
          )}

          {/* Hand preview during betting (non-forehead rounds) */}
          {!isForehead && room.myHand.length > 0 && (
            <View>
              <Text style={[styles.handLabel, { color: colors.mutedForeground }]}>Tu mano:</Text>
              <View style={styles.handRow}>
                {room.myHand.map((c) => (
                  <SpanishCard
                    key={c.id}
                    palo={c.palo as Palo}
                    valor={c.valor}
                    size="sm"
                    disabled
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Playing phase ── */}
      {gs.phase === "playing" && (
        <View style={{ gap: 14 }}>
          {/* Current trick on the table */}
          <View style={[styles.phaseCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.cardHeading, { color: isMyPlayTurn ? colors.primary : colors.foreground }]}>
              🃏 Mesa {isMyPlayTurn ? "— TU TURNO" : `— Turno de ${playerName(nextToPlay ?? "")}`}
            </Text>
            <View style={styles.trickRow}>
              {room.players.map((p) => {
                const trickCard = r?.currentTrick.find((c) => c.playerId === p.id);
                return (
                  <View key={p.id} style={styles.trickSlot}>
                    <Text style={styles.trickAvatar}>{p.avatar}</Text>
                    {trickCard ? (
                      <SpanishCardById
                        cardId={trickCard.cardId}
                        size="md"
                        highlight={false}
                      />
                    ) : (
                      <View style={[styles.trickCardEmpty, { borderColor: colors.border }]}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>…</Text>
                      </View>
                    )}
                    <Text
                      style={[styles.trickPlayerName, { color: p.id === myId ? colors.primary : colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Forehead cards (round 1 special) */}
          {isForehead && Object.keys(r?.foreheadCards ?? {}).length > 0 && (
            <View style={[styles.phaseCard, { borderColor: colors.destructive, backgroundColor: colors.card }]}>
              <Text style={[styles.cardHeading, { color: colors.destructive }]}>
                👁 CARTAS EN LA FRENTE · los demás las ven, tú no
              </Text>
              <View style={styles.foreheadGrid}>
                {Object.entries(r?.foreheadCards ?? {}).map(([pid, cardId]) => (
                  <View key={pid} style={styles.foreheadItem}>
                    <Text style={styles.trickAvatar}>{playerAvatar(pid)}</Text>
                    <SpanishCardById cardId={cardId} size="md" />
                    <Text style={[styles.trickPlayerName, { color: colors.foreground }]}>{playerName(pid)}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.betHint, { color: colors.mutedForeground }]}>
                Tu carta está en tu frente — los demás la pueden ver.
              </Text>
            </View>
          )}

          {/* My hand */}
          <View style={[styles.phaseCard, {
            borderColor: isMyPlayTurn ? colors.primary : colors.border,
            backgroundColor: colors.card,
          }]}>
            <Text style={[styles.cardHeading, {
              color: isMyPlayTurn ? colors.primary : colors.foreground,
            }]}>
              {isMyPlayTurn ? "🎯 Tu turno — toca una carta" : "Tu mano"}
            </Text>
            {actionError && (
              <Text style={[styles.betHint, { color: colors.destructive }]}>{actionError}</Text>
            )}
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
                    disabled={!isMyPlayTurn || playMut.isPending}
                    onPress={isMyPlayTurn ? () => handlePlayCard(c.id) : undefined}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Forehead round: my card is blind, just play it */}
          {isForehead && isMyPlayTurn && room.myHand.length > 0 && (
            <Pressable
              onPress={() => handlePlayCard(room.myHand[0].id)}
              disabled={playMut.isPending}
              style={[styles.bigBtn, { borderColor: colors.destructive, backgroundColor: colors.destructive + "22" }]}
            >
              {playMut.isPending ? (
                <ActivityIndicator color={colors.destructive} />
              ) : (
                <Text style={[styles.bigBtnText, { color: colors.destructive }]}>
                  🃏 JUGAR MI CARTA (boca abajo)
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* ── Log ── */}
      <View style={[styles.logCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {room.log.slice().reverse().slice(0, 6).map((entry, i) => (
          <Text key={i} style={[styles.logEntry, { color: colors.mutedForeground }]}>{entry}</Text>
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

  roundHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  roundLabel: { fontFamily: "Inter_700Bold", fontSize: 20 },
  dealerRow: { marginTop: 4 },
  dealerInfo: { fontFamily: "Inter_400Regular", fontSize: 12 },
  foreheadNote: { fontFamily: "Inter_700Bold", fontSize: 11, marginTop: 4 },

  rankLegend: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
  },
  rankLegendLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  rankLegendItem: { flexDirection: "row", alignItems: "center" },
  rankLegendVal: { fontFamily: "Inter_700Bold", fontSize: 12 },
  rankLegendSep: { fontFamily: "Inter_400Regular", fontSize: 10 },

  scoresCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  cardHeading: { fontFamily: "Inter_700Bold", fontSize: 13, marginBottom: 10, letterSpacing: 0.5 },
  scoresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  scoreItem: { alignItems: "center", gap: 2, minWidth: 64 },
  scoreAvatar: { fontSize: 22, lineHeight: 28 },
  scoreName: { fontFamily: "Inter_500Medium", fontSize: 10, textAlign: "center", maxWidth: 64 },
  scoreVal: { fontFamily: "Inter_700Bold", fontSize: 18 },
  scoreLives: { fontSize: 10 },
  scoreFormula: { fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center", marginTop: 2 },

  phaseCard: { borderRadius: 12, borderWidth: 2, padding: 14, gap: 12 },

  betsRow: { gap: 6 },
  betChip: { flexDirection: "row", alignItems: "center", gap: 8 },
  betAvatar: { fontSize: 20, width: 28, textAlign: "center" },
  betName: { fontFamily: "Inter_600SemiBold", fontSize: 13, width: 90 },
  betValue: { fontFamily: "Inter_700Bold", fontSize: 14, flex: 1 },

  betControls: { gap: 10 },
  betPrompt: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  betHint: { fontFamily: "Inter_400Regular", fontSize: 12 },
  betPicker: { flexDirection: "row", alignItems: "center", gap: 24, alignSelf: "center" },
  betBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  betCurrent: { fontFamily: "Inter_700Bold", fontSize: 42, minWidth: 50, textAlign: "center" },
  confirmBtn: { paddingVertical: 14, borderRadius: 10, borderWidth: 2, alignItems: "center" },
  confirmBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  waitText: { fontFamily: "Inter_400Regular", fontSize: 13, fontStyle: "italic" },
  handLabel: { fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 6 },
  handRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  trickRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  trickSlot: { alignItems: "center", gap: 6, minWidth: 64 },
  trickAvatar: { fontSize: 22, lineHeight: 28 },
  trickCardEmpty: {
    width: 64, height: 92, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  trickPlayerName: { fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center", maxWidth: 64 },

  foreheadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" },
  foreheadItem: { alignItems: "center", gap: 4 },

  logCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },

  bigTitle: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center", marginBottom: 4 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  rankNum: { fontFamily: "Inter_700Bold", fontSize: 22, width: 36 },
  rankAvatar: { fontSize: 26 },
  rankName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  rankScore: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
