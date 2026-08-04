/**
 * Las Apuestas — full multiplayer game screen.
 * Handles: betting phase, trick-taking phase, special round-1 "forehead" mechanic,
 * scoring, lives, and end-of-game standings.
 */
import {
  useGetBarajaRoom,
  usePlayApuestasCard,
  usePlaceApuestasBet,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

import { useColors } from "@/hooks/useColors";
import {
  BarajaSession,
  clearBarajaSession,
  loadBarajaSession,
} from "@/lib/barajaSession";
import type {
  ApuestasState,
  BarajaNaipe,
  BarajaPlayerPublic,
  BarajaRoomState,
} from "@workspace/api-client-react";

const PALO_EMOJI: Record<string, string> = {
  oros: "🟡", copas: "🔴", espadas: "⚔️", bastos: "🌿",
};
const VALOR_LABEL: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  10: "J", 11: "C", 12: "R",
};
const PALO_NAME: Record<string, string> = {
  oros: "Oros", copas: "Copas", espadas: "Espadas", bastos: "Bastos",
};

function CardTile({
  naipe,
  selected,
  disabled,
  onPress,
}: {
  naipe: BarajaNaipe;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cardTile,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected
            ? colors.primary + "22"
            : colors.card,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.cardPalo, { color: selected ? colors.primary : colors.secondary }]}>
        {PALO_EMOJI[naipe.palo]}
      </Text>
      <Text style={[styles.cardValor, { color: selected ? colors.primary : colors.foreground }]}>
        {VALOR_LABEL[naipe.valor]}
      </Text>
    </Pressable>
  );
}

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

  // ── Determine current player's turn ────────────────────────────────────────
  const myId = session?.playerId ?? "";
  const r = gs?.currentRound;
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

  function playerName(id: string) {
    return room?.players.find((p) => p.id === id)?.name ?? id;
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
        contentContainerStyle={[styles.container, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 20 }]}
      >
        <Text style={[styles.bigTitle, { color: colors.primary }]}>🏆 FIN DE PARTIDA</Text>
        {sorted.map((p, i) => (
          <View key={p.id} style={[styles.rankRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.rankNum, { color: i === 0 ? colors.primary : colors.mutedForeground }]}>
              #{i + 1}
            </Text>
            <Text style={styles.rankAvatar}>{p.avatar}</Text>
            <Text style={[styles.rankName, { color: colors.foreground }]}>{p.name}</Text>
            <Text style={[styles.rankScore, { color: colors.primary }]}>
              {gs.scores[p.id] ?? 0} pts
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

  const trump = r?.trump ?? "oros";
  const maxBet = r?.cardsDealt ?? 0;
  const sumOtherBets = Object.entries(r?.bets ?? {})
    .filter(([id]) => id !== myId)
    .reduce((a, [, v]) => a + v, 0);
  const isLastBettor = r
    ? r.bettingIdx === r.bettingOrder.length - 1
    : false;
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
        <View>
          <Text style={[styles.roundLabel, { color: colors.secondary }]}>
            RONDA {gs.roundNum} · {r?.cardsDealt} carta{(r?.cardsDealt ?? 0) > 1 ? "s" : ""}
          </Text>
          <Text style={[styles.trumpLabel, { color: colors.foreground }]}>
            Triunfo: {PALO_EMOJI[trump]} {PALO_NAME[trump]}
          </Text>
          {isForehead && (
            <Text style={[styles.foreheadNote, { color: colors.destructive }]}>
              ⚠️ RONDA ESPECIAL: No puedes ver tu propia carta
            </Text>
          )}
        </View>
        <Pressable onPress={handleLeave} style={[styles.smBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_700Bold" }}>SALIR</Text>
        </Pressable>
      </View>

      {/* ── Scores / lives ── */}
      <View style={[styles.scoresCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.cardHeading, { color: colors.foreground }]}>📊 Puntuación</Text>
        <View style={styles.scoresGrid}>
          {room.players.map((p) => (
            <View key={p.id} style={styles.scoreItem}>
              <Text style={styles.scoreAvatar}>{p.avatar}</Text>
              <Text
                style={[
                  styles.scoreName,
                  { color: p.id === myId ? colors.primary : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
              <Text style={[styles.scoreVal, { color: colors.primary }]}>
                {gs.scores[p.id] ?? 0}
              </Text>
              <Text style={styles.scoreLives}>
                {"❤️".repeat(Math.max(0, gs.lives[p.id] ?? 3))}
                {"🖤".repeat(Math.max(0, 3 - (gs.lives[p.id] ?? 3)))}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Betting phase ── */}
      {gs.phase === "betting" && (
        <View style={[styles.phaseCard, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
          <Text style={[styles.cardHeading, { color: colors.secondary }]}>
            🎯 FASE DE APUESTAS
          </Text>

          {/* Bets placed so far */}
          <View style={styles.betsRow}>
            {r?.bettingOrder.map((pid) => {
              const bet = r.bets[pid];
              const isNext = r.bettingOrder[r.bettingIdx] === pid;
              return (
                <View key={pid} style={styles.betChip}>
                  <Text style={styles.betAvatar}>
                    {room.players.find((p) => p.id === pid)?.avatar ?? "?"}
                  </Text>
                  <Text
                    style={[
                      styles.betValue,
                      {
                        color:
                          bet !== undefined
                            ? colors.primary
                            : isNext
                            ? colors.secondary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {bet !== undefined ? bet : isNext ? "…" : "?"}
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
                  ⛔ No puedes apostar {forbiddenBet} (regla del último)
                </Text>
              )}
              <View style={styles.betPicker}>
                <Pressable
                  onPress={() => setBetValue((v) => Math.max(0, v - 1))}
                  style={[styles.betBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold" }}>−</Text>
                </Pressable>
                <Text style={[styles.betCurrent, { color: colors.primary }]}>{betValue}</Text>
                <Pressable
                  onPress={() => setBetValue((v) => Math.min(maxBet, v + 1))}
                  style={[styles.betBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold" }}>+</Text>
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

          {/* Hand preview during betting */}
          {!isForehead && room.myHand.length > 0 && (
            <View>
              <Text style={[styles.handLabel, { color: colors.mutedForeground }]}>Tu mano:</Text>
              <View style={styles.handRow}>
                {room.myHand.map((c) => (
                  <CardTile key={c.id} naipe={c} disabled />
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Playing phase ── */}
      {gs.phase === "playing" && (
        <View style={{ gap: 14 }}>
          {/* Current trick */}
          <View style={[styles.phaseCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.cardHeading, { color: colors.foreground }]}>
              🃏 Mesa — {isMyPlayTurn ? "TU TURNO" : `Turno de ${playerName(nextToPlay ?? "")}`}
            </Text>
            <View style={styles.trickRow}>
              {room.players.map((p) => {
                const trickCard = r?.currentTrick.find((c) => c.playerId === p.id);
                return (
                  <View key={p.id} style={styles.trickSlot}>
                    <Text style={styles.trickAvatar}>{p.avatar}</Text>
                    {trickCard ? (
                      (() => {
                        const naipe = room.myHand.find((c) => c.id === trickCard.cardId) ??
                          { id: trickCard.cardId, palo: trickCard.cardId.split("-")[0] as any, valor: parseInt(trickCard.cardId.split("-")[1] ?? "0") };
                        return (
                          <View style={[styles.trickCardPlayed, { borderColor: colors.primary, backgroundColor: colors.primary + "22" }]}>
                            <Text style={{ fontSize: 14 }}>{PALO_EMOJI[naipe.palo]}</Text>
                            <Text style={[styles.trickCardVal, { color: colors.primary }]}>
                              {VALOR_LABEL[naipe.valor] ?? "?"}
                            </Text>
                          </View>
                        );
                      })()
                    ) : (
                      <View style={[styles.trickCardEmpty, { borderColor: colors.border }]}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>–</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.trickPlayerName,
                        { color: p.id === myId ? colors.primary : colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Bazas won this round */}
          <View style={[styles.bazasRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {room.players.map((p) => (
              <View key={p.id} style={styles.bazaItem}>
                <Text style={styles.trickAvatar}>{p.avatar}</Text>
                <Text style={[styles.bazaCount, { color: colors.foreground }]}>
                  {r?.bazasWon[p.id] ?? 0}/{r?.bets[p.id] ?? "?"}
                </Text>
              </View>
            ))}
          </View>

          {/* Forehead: show other players' cards */}
          {isForehead && (
            <View style={[styles.phaseCard, { borderColor: colors.destructive, backgroundColor: colors.card }]}>
              <Text style={[styles.cardHeading, { color: colors.destructive }]}>
                🃏 CARTAS EN LA FRENTE (las ven todos menos tú)
              </Text>
              <View style={styles.foreheadGrid}>
                {Object.entries(r?.foreheadCards ?? {}).map(([pid, cardId]) => {
                  const palo = cardId.split("-")[0] as any;
                  const valor = parseInt(cardId.split("-")[1] ?? "0");
                  const pName = playerName(pid);
                  return (
                    <View key={pid} style={styles.foreheadItem}>
                      <Text style={styles.trickAvatar}>
                        {room.players.find((p) => p.id === pid)?.avatar ?? "?"}
                      </Text>
                      <Text style={[styles.trickPlayerName, { color: colors.foreground }]}>{pName}</Text>
                      <View style={[styles.trickCardPlayed, { borderColor: colors.secondary, backgroundColor: colors.secondary + "22" }]}>
                        <Text style={{ fontSize: 14 }}>{PALO_EMOJI[palo]}</Text>
                        <Text style={[styles.trickCardVal, { color: colors.secondary }]}>
                          {VALOR_LABEL[valor] ?? "?"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              {myId && !Object.keys(r?.foreheadCards ?? {}).includes(myId) && (
                <View style={[styles.myForeheadCard, { borderColor: colors.border }]}>
                  <Text style={[styles.betHint, { color: colors.mutedForeground }]}>
                    Tu carta está en tu frente. Los demás la pueden ver.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* My hand to play (non-forehead rounds) */}
          {!isForehead && (
            <View style={[styles.phaseCard, { borderColor: isMyPlayTurn ? colors.primary : colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.cardHeading, { color: isMyPlayTurn ? colors.primary : colors.foreground }]}>
                {isMyPlayTurn ? "🎯 TU TURNO — toca una carta para jugarla" : "Tu mano"}
              </Text>
              {actionError && (
                <Text style={[styles.betHint, { color: colors.destructive }]}>{actionError}</Text>
              )}
              <View style={styles.handRow}>
                {room.myHand.length === 0 ? (
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                    Sin cartas en mano
                  </Text>
                ) : (
                  room.myHand.map((c) => (
                    <CardTile
                      key={c.id}
                      naipe={c}
                      disabled={!isMyPlayTurn || playMut.isPending}
                      onPress={() => handlePlayCard(c.id)}
                    />
                  ))
                )}
              </View>
            </View>
          )}

          {/* Play button for forehead round */}
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
  container: { paddingHorizontal: 16, gap: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  smBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  bigBtn: { paddingVertical: 15, borderRadius: 12, borderWidth: 2, alignItems: "center" },
  bigBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },

  roundHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  roundLabel: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 0.5 },
  trumpLabel: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },
  foreheadNote: { fontFamily: "Inter_700Bold", fontSize: 11, marginTop: 4 },

  scoresCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  cardHeading: { fontFamily: "Inter_700Bold", fontSize: 13, marginBottom: 10, letterSpacing: 0.5 },
  scoresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scoreItem: { alignItems: "center", gap: 2, minWidth: 60 },
  scoreAvatar: { fontSize: 22, lineHeight: 28 },
  scoreName: { fontFamily: "Inter_500Medium", fontSize: 10, textAlign: "center" },
  scoreVal: { fontFamily: "Inter_700Bold", fontSize: 16 },
  scoreLives: { fontSize: 10 },

  phaseCard: { borderRadius: 12, borderWidth: 2, padding: 14, gap: 12 },

  betsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  betChip: { alignItems: "center", gap: 4 },
  betAvatar: { fontSize: 20 },
  betValue: { fontFamily: "Inter_700Bold", fontSize: 16 },

  betControls: { gap: 10 },
  betPrompt: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  betHint: { fontFamily: "Inter_400Regular", fontSize: 12 },
  betPicker: { flexDirection: "row", alignItems: "center", gap: 20 },
  betBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  betCurrent: { fontFamily: "Inter_700Bold", fontSize: 36, minWidth: 40, textAlign: "center" },
  confirmBtn: { paddingVertical: 14, borderRadius: 10, borderWidth: 2, alignItems: "center" },
  confirmBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  waitText: { fontFamily: "Inter_400Regular", fontSize: 13, fontStyle: "italic" },

  handLabel: { fontFamily: "Inter_500Medium", fontSize: 11, marginBottom: 6 },
  handRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardTile: {
    width: 52, height: 72,
    borderRadius: 8, borderWidth: 2,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  cardPalo: { fontSize: 18 },
  cardValor: { fontFamily: "Inter_700Bold", fontSize: 15 },

  trickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  trickSlot: { alignItems: "center", gap: 4, minWidth: 56 },
  trickAvatar: { fontSize: 22, lineHeight: 28 },
  trickCardPlayed: {
    width: 48, height: 64, borderRadius: 8, borderWidth: 2,
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  trickCardEmpty: {
    width: 48, height: 64, borderRadius: 8, borderWidth: 1, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  trickCardVal: { fontFamily: "Inter_700Bold", fontSize: 14 },
  trickPlayerName: { fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center", maxWidth: 56 },

  bazasRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  bazaItem: { alignItems: "center", gap: 2 },
  bazaCount: { fontFamily: "Inter_700Bold", fontSize: 13 },

  foreheadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  foreheadItem: { alignItems: "center", gap: 4 },
  myForeheadCard: { borderRadius: 10, borderWidth: 1, borderStyle: "dashed", padding: 12, alignItems: "center" },

  logCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },

  bigTitle: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center", marginBottom: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  rankNum: { fontFamily: "Inter_700Bold", fontSize: 22, width: 36 },
  rankAvatar: { fontSize: 26 },
  rankName: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  rankScore: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
