/**
 * Texas Hold'em — real-time poker table.
 * Private hole cards come from serializeBarajaRoom; the public state only
 * contains board, betting state and showdown results.
 */
import {
  useGetBarajaRoom,
  useLeaveBarajaRoom,
  usePokerAction,
  usePokerDrinkAward,
  usePokerNextHand,
} from "@workspace/api-client-react";
import type { PokerState, PokerSuit } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

import { clearBarajaSession, loadBarajaSession } from "@/lib/barajaSession";
import type { BarajaSession } from "@/lib/barajaSession";
import { useColors } from "@/hooks/useColors";
import BetSlider from "@/components/BetSlider";
import PokerCard from "@/components/PokerCard";

function PokerCardView({
  card,
  hidden = false,
  large = false,
}: {
  card?: { rank: string; suit: PokerSuit };
  hidden?: boolean;
  large?: boolean;
}) {
  return <PokerCard rank={card?.rank} suit={card?.suit} hidden={hidden || !card} large={large} />;
}

function formatChips(amount: number): string {
  return `${Math.max(0, amount).toLocaleString("es-ES")} · fichas`;
}

export default function PokerRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raiseTo, setRaiseTo] = useState(0);
  const [drinkRecipients, setDrinkRecipients] = useState<string[]>([]);

  useEffect(() => {
    loadBarajaSession().then((value) => {
      setSession(value);
      setHydrated(true);
    });
  }, []);

  const { data: room, isLoading } = useGetBarajaRoom(
    session?.roomCode ?? "",
    session?.playerId ?? "",
  );
  const actionMut = usePokerAction();
  const nextHandMut = usePokerNextHand();
  const drinkAwardMut = usePokerDrinkAward();
  const leaveMut = useLeaveBarajaRoom();

  const gs = room?.gameState?.type === "poker"
    ? (room.gameState as PokerState)
    : null;
  const myId = session?.playerId ?? "";
  const myCards = room?.myPokerHand ?? [];
  const isMyTurn = !!gs && gs.phase === "playing" && gs.playerOrder[gs.currentIdx] === myId;
  const myStreetBet = gs?.streetBets[myId] ?? 0;
  const toCall = Math.max(0, (gs?.currentBet ?? 0) - myStreetBet);
  const minRaiseTarget = (gs?.currentBet ?? 0) + (gs?.minRaise ?? 0);
  const maxRaiseTarget = gs ? (gs.streetBets[myId] ?? 0) + (gs.stacks[myId] ?? 0) : 0;
  const sliderMin = Math.min(minRaiseTarget, maxRaiseTarget);
  const currentPlayer = room?.players.find((player) => player.id === gs?.playerOrder[gs?.currentIdx]);
  const dealerId = gs?.playerOrder[gs.dealerIdx];
  const blindIds = new Set([gs?.smallBlindId, gs?.bigBlindId]);

  useEffect(() => {
    if (gs) {
      const maxTarget = (gs.streetBets[myId] ?? 0) + (gs.stacks[myId] ?? 0);
      setRaiseTo(Math.min(maxTarget, Math.max((gs.currentBet ?? 0) + gs.minRaise, (gs.currentBet ?? 0) + gs.bigBlind)));
    }
  }, [gs?.street, gs?.currentBet, gs?.minRaise, gs?.stacks, gs?.streetBets, myId]);

  const boardCards = useMemo(
    () => (gs?.board ?? []).map((id) => parsePokerCard(id)),
    [gs?.board],
  );

  function parsePokerCard(id: string) {
    const split = id.lastIndexOf("-");
    const suit = id.slice(0, split) as PokerSuit;
    return { rank: id.slice(split + 1), suit };
  }

  async function perform(action: "fold" | "check" | "call" | "raise", amount?: number) {
    if (!session || !room) return;
    setError(null);
    try {
      await actionMut.mutateAsync({
        code: room.code,
        playerId: session.playerId,
        action,
        amount,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleAllIn() {
    if (!isMyTurn || maxRaiseTarget <= gs.currentBet) return;
    setRaiseTo(maxRaiseTarget);
    void perform("raise", maxRaiseTarget);
  }

  async function handleNextHand() {
    if (!session || !room) return;
    setError(null);
    try {
      await nextHandMut.mutateAsync({ code: room.code, playerId: session.playerId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDrinkAward() {
    if (!session || !room) return;
    setError(null);
    try {
      await drinkAwardMut.mutateAsync({
        code: room.code,
        playerId: session.playerId,
        recipientIds: drinkRecipients,
      });
      setDrinkRecipients([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleLeave() {
    if (session && room) {
      await leaveMut.mutateAsync({ code: room.code, playerId: session.playerId });
    }
    await clearBarajaSession();
    router.replace("/baraja" as never);
  }

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
          No se pudo cargar la mesa de Póker.
        </Text>
        <Pressable onPress={() => router.replace("/baraja" as never)} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 14, paddingBottom: 40 },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>♠ TEXAS HOLD'EM</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>La mesa está servida</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Mano {gs.roundNumber} · {gs.street === "preflop" ? "Pre-flop" : gs.street[0].toUpperCase() + gs.street.slice(1)}
            </Text>
          </View>
          <Pressable onPress={handleLeave} style={[styles.smallBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 11 }}>SALIR</Text>
          </Pressable>
        </View>

        <View style={[styles.table, { borderColor: "#2F8B65", backgroundColor: "#0C4B36" }]}>
          <View style={styles.tableGlow} />
          <View style={styles.potBadge}>
            <Text style={styles.potLabel}>BOTE</Text>
            <Text style={styles.potValue}>{gs.pot.toLocaleString("es-ES")}</Text>
          </View>
          <View style={styles.boardRow}>
            {boardCards.map((card, index) => (
              <PokerCardView key={`${card.rank}-${card.suit}-${index}`} card={card} large />
            ))}
            {Array.from({ length: Math.max(0, 5 - boardCards.length) }).map((_, index) => (
              <PokerCardView key={`empty-${index}`} large hidden />
            ))}
          </View>
          <Text style={styles.tableHint}>
            {gs.phase === "ended"
              ? "SHOWDOWN · mano resuelta"
              : isMyTurn
                ? "TU TURNO · elige una acción"
                : `Turno de ${currentPlayer?.name ?? "otro jugador"}`}
          </Text>
        </View>

        <View style={[styles.infoStrip, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Ciega pequeña <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{gs.smallBlind}</Text>
          </Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Ciega grande <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{gs.bigBlind}</Text>
          </Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Apuesta actual <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{gs.currentBet}</Text>
          </Text>
        </View>
        {gs.stakesMode === "sips" && (
          <View style={[styles.sipsCard, { borderColor: "#FF7A45", backgroundColor: "#FF7A4514" }]}>
            <View style={styles.sipsHeader}>
              <Text style={styles.sipsTitle}>MODO SORBOS</Text>
              <Text style={styles.sipsPot}>{gs.drinkPot ?? 0} tragos en el bote</Text>
            </View>
            {gs.phase === "ended" && gs.winnerIds.includes(myId) && (gs.drinkPot ?? 0) > 0 && (
              <>
                <Text style={styles.sipsHint}>Selecciona a quién repartir el bote</Text>
                <View style={styles.recipientRow}>
                  {room.players.filter((player) => player.id !== myId).map((player) => {
                    const selected = drinkRecipients.includes(player.id);
                    return (
                      <Pressable
                        key={player.id}
                        onPress={() => setDrinkRecipients((current) => selected ? current.filter((id) => id !== player.id) : [...current, player.id])}
                        style={[styles.recipient, { borderColor: selected ? "#FF7A45" : colors.border, backgroundColor: selected ? "#FF7A4528" : colors.background }]}
                      >
                        <Text style={{ color: selected ? "#FF7A45" : colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 11 }}>{player.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={handleDrinkAward} disabled={!drinkRecipients.length || drinkAwardMut.isPending} style={[styles.awardButton, { opacity: drinkRecipients.length ? 1 : .45 }]}>
                  <Text style={styles.awardText}>REPARTIR SORBOS</Text>
                </Pressable>
              </>
            )}
            {!!Object.keys(gs.drinkAwards ?? {}).length && (
              <Text style={styles.awarded}>Reparto: {Object.entries(gs.drinkAwards ?? {}).map(([id, amount]) => `${room.players.find((player) => player.id === id)?.name ?? "Jugador"} ${amount}`).join(" · ")}</Text>
            )}
          </View>
        )}

        <View style={[styles.playersCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Jugadores</Text>
          <View style={styles.playersGrid}>
            {room.players.map((player) => {
              const folded = gs.folded.includes(player.id);
              const active = gs.playerOrder[gs.currentIdx] === player.id && gs.phase === "playing";
              return (
                <View key={player.id} style={[
                  styles.playerRow,
                  active && { borderColor: colors.primary, backgroundColor: colors.primary + "14" },
                  folded && { opacity: 0.45 },
                ]}>
                  <Text style={styles.playerAvatar}>{player.avatar}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.playerName, { color: player.id === myId ? colors.primary : colors.foreground }]}>
                      {player.name}{player.id === myId ? " (tú)" : ""}
                    </Text>
                    <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>
                      {player.id === dealerId ? "Dealer · " : ""}
                      {player.id === gs.smallBlindId ? "SB · " : ""}
                      {player.id === gs.bigBlindId ? "BB · " : ""}
                      {folded ? "Retirado" : `${gs.streetBets[player.id] ?? 0} en calle`}
                    </Text>
                  </View>
                  <Text style={[styles.stackText, { color: colors.primary }]}>
                    {(gs.stacks[player.id] ?? 0).toLocaleString("es-ES")}
                  </Text>
                  {blindIds.has(player.id) && <Text style={styles.blindPill}>CIEGA</Text>}
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.handCard, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
          <View style={styles.handHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tus cartas privadas</Text>
            <Text style={[styles.handStack, { color: colors.primary }]}>{formatChips(gs.stacks[myId] ?? 0)}</Text>
          </View>
          <View style={styles.privateCards}>
            {myCards.map((card) => <PokerCardView key={card.id} card={card} large />)}
          </View>
        </View>

        {error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}

        {gs.phase === "playing" && (
          <View style={[styles.actionsCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.turnTitle, { color: isMyTurn ? colors.primary : colors.mutedForeground }]}>
              {isMyTurn ? "Tu acción" : `Esperando a ${currentPlayer?.name ?? "la mesa"}…`}
            </Text>
            <View style={styles.actionRow}>
              <ActionButton label="PASAR" icon="✓" disabled={!isMyTurn || toCall > 0} color={colors.primary} onPress={() => perform("check")} />
              <ActionButton label={`IGUALAR ${toCall}`} icon="→" disabled={!isMyTurn || toCall === 0} color="#4CC9F0" onPress={() => perform("call")} />
              <ActionButton label="RETIRARSE" icon="×" disabled={!isMyTurn} color="#F05D75" onPress={() => perform("fold")} />
            </View>
            <View style={styles.raisePanel}>
              <Text style={[styles.raiseLabel, { color: colors.mutedForeground }]}>IMPORTE DE LA SUBIDA</Text>
              <BetSlider
                min={sliderMin}
                max={Math.max(sliderMin, maxRaiseTarget)}
                value={Math.max(sliderMin, Math.min(maxRaiseTarget, raiseTo || sliderMin))}
                onChange={setRaiseTo}
                disabled={!isMyTurn || maxRaiseTarget <= gs.currentBet}
                accent={colors.secondary}
              />
              <Pressable
                disabled={!isMyTurn || maxRaiseTarget <= gs.currentBet}
                onPress={() => perform("raise", raiseTo || sliderMin)}
                style={[styles.raiseBtn, { backgroundColor: isMyTurn ? colors.secondary + "33" : colors.border + "44", borderColor: colors.secondary, opacity: isMyTurn ? 1 : 0.45 }]}
              >
                <Text style={{ color: colors.secondary, fontFamily: "Inter_700Bold" }}>SUBIR A {raiseTo || sliderMin}</Text>
              </Pressable>
              <Pressable
                disabled={!isMyTurn || maxRaiseTarget <= gs.currentBet}
                onPress={handleAllIn}
                style={[
                  styles.allInBtn,
                  {
                    backgroundColor: isMyTurn ? "#F05D7526" : colors.border + "44",
                    borderColor: "#F05D75",
                    opacity: isMyTurn && maxRaiseTarget > gs.currentBet ? 1 : 0.45,
                  },
                ]}
              >
                <Text style={styles.allInText}>ALL-IN · {maxRaiseTarget.toLocaleString("es-ES")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {gs.phase === "ended" && (
          <View style={[styles.showdownCard, { borderColor: colors.primary, backgroundColor: colors.card }]}>
            <Text style={[styles.showdownTitle, { color: colors.primary }]}>SHOWDOWN</Text>
            {gs.handResults.map((result) => {
              const player = room.players.find((item) => item.id === result.playerId);
              const won = gs.winnerIds.includes(result.playerId);
              return (
                <View key={result.playerId} style={styles.resultRow}>
                  <Text style={styles.resultAvatar}>{player?.avatar}</Text>
                  <Text style={[styles.resultName, { color: won ? colors.primary : colors.foreground }]}>{player?.name}</Text>
                  <Text style={[styles.resultHand, { color: colors.mutedForeground }]}>{result.category}</Text>
                  {won && <Text style={[styles.resultPayout, { color: colors.primary }]}>+{gs.payouts[result.playerId]}</Text>}
                </View>
              );
            })}
            <Text style={[styles.splitText, { color: colors.mutedForeground }]}>
              {gs.winnerIds.length > 1 ? "Bote dividido entre los ganadores" : "Bote entregado al ganador"}
            </Text>
            {room.ownerId === myId && (
              <Pressable onPress={handleNextHand} disabled={nextHandMut.isPending} style={[styles.nextBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "22" }]}>
                {nextHandMut.isPending
                  ? <ActivityIndicator color={colors.primary} />
                  : <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>♠ NUEVA MANO</Text>}
              </Pressable>
            )}
          </View>
        )}

        <View style={[styles.logCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actividad</Text>
          {room.log.slice().reverse().slice(0, 6).map((entry, index) => (
            <Text key={`${entry}-${index}`} style={[styles.logText, { color: colors.mutedForeground }]}>{entry}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  color,
  disabled,
  onPress,
}: {
  label: string;
  icon: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: color, backgroundColor: color + "18", opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <Text style={{ color, fontSize: 18, fontFamily: "Inter_700Bold" }}>{icon}</Text>
      <Text style={{ color, fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { maxWidth: 760, width: "100%", alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 3 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1 },
  table: { minHeight: 205, borderRadius: 26, borderWidth: 2, justifyContent: "center", alignItems: "center", padding: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  tableGlow: { position: "absolute", width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: "#62D9A8", opacity: 0.16 },
  potBadge: { alignItems: "center", marginBottom: 14 },
  potLabel: { color: "#A8E5C7", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 },
  potValue: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 30, marginTop: 2 },
  boardRow: { flexDirection: "row", gap: 7, justifyContent: "center" },
  pokerCard: { width: 48, height: 68, borderRadius: 7, backgroundColor: "#FFFDF8", borderWidth: 1, borderColor: "#D7CDBD", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 3, elevation: 2 },
  pokerCardLarge: { width: 59, height: 83, borderRadius: 9 },
  cardRank: { fontFamily: "Inter_700Bold", fontSize: 17 },
  cardRankLarge: { fontSize: 22 },
  cardSuit: { fontSize: 24, marginTop: 1 },
  cardSuitLarge: { fontSize: 32 },
  cardBack: { backgroundColor: "#253653", borderColor: "#89A1C8" },
  cardBackMark: { color: "#A9B7D0", fontSize: 25 },
  tableHint: { color: "#C2F2DC", fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 13 },
  infoStrip: { borderRadius: 10, borderWidth: 1, padding: 11, flexDirection: "row", justifyContent: "space-around", gap: 6 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  sipsCard: { borderRadius: 13, borderWidth: 1, padding: 13, gap: 9 },
  sipsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sipsTitle: { color: "#FF7A45", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 },
  sipsPot: { color: "#FFD2BD", fontFamily: "Inter_700Bold", fontSize: 13 },
  sipsHint: { color: "#D5B6A7", fontFamily: "Inter_400Regular", fontSize: 11 },
  recipientRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  recipient: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
  awardButton: { borderRadius: 8, backgroundColor: "#FF7A45", paddingVertical: 11, alignItems: "center" },
  awardText: { color: "#1c0b07", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  awarded: { color: "#FFD2BD", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  playersCard: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  playersGrid: { gap: 6 },
  playerRow: { minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: "transparent", paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  playerAvatar: { fontSize: 23, width: 28, textAlign: "center" },
  playerName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  playerMeta: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 },
  stackText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  blindPill: { color: "#FFB800", fontFamily: "Inter_700Bold", fontSize: 8, borderWidth: 1, borderColor: "#FFB800", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  handCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  handHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  handStack: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  privateCards: { flexDirection: "row", justifyContent: "center", gap: 10 },
  actionsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  turnTitle: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, minHeight: 64, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 3 },
  raisePanel: { gap: 9 },
  raiseLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  raiseBtn: { flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  allInBtn: { minHeight: 42, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  allInText: { color: "#F05D75", fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  showdownCard: { borderRadius: 14, borderWidth: 2, padding: 15, gap: 8 },
  showdownTitle: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 2, textAlign: "center", marginBottom: 3 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 5 },
  resultAvatar: { fontSize: 20, width: 26 },
  resultName: { fontFamily: "Inter_600SemiBold", fontSize: 13, width: 90 },
  resultHand: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
  resultPayout: { fontFamily: "Inter_700Bold", fontSize: 13 },
  splitText: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 4 },
  nextBtn: { borderRadius: 9, borderWidth: 1, paddingVertical: 13, alignItems: "center", marginTop: 5 },
  secondaryBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  logCard: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 5 },
  logText: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },
});