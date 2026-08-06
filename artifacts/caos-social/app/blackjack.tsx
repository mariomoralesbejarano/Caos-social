import {
  blackjackScore,
  useBlackjackAction,
  useBlackjackNextRound,
  useGetBarajaRoom,
  useLeaveBarajaRoom,
} from "@workspace/api-client-react";
import type { BlackjackHand, BlackjackState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

function cardParts(card: string) {
  const [suit, rank] = card.split("-");
  return { suit, rank };
}

function BlackjackCard({ card, hidden = false }: { card: string; hidden?: boolean }) {
  if (hidden || card === "hidden") {
    return <View style={[styles.card, styles.cardBack]}><Text style={styles.cardBackText}>♠</Text></View>;
  }
  const { suit, rank } = cardParts(card);
  const red = suit === "hearts" || suit === "diamonds";
  return (
    <View style={styles.card}>
      <Text style={[styles.rank, red && styles.red]}>{rank}</Text>
      <Text style={[styles.suit, red && styles.red]}>
        {suit === "hearts" ? "♥" : suit === "diamonds" ? "♦" : suit === "clubs" ? "♣" : "♠"}
      </Text>
    </View>
  );
}

function HandView({ hand, active }: { hand: BlackjackHand; active: boolean }) {
  const score = blackjackScore(hand.cards);
  return (
    <View style={[styles.hand, active && styles.activeHand]}>
      <View style={styles.handHeader}>
        <Text style={styles.handTitle}>{hand.split ? "Mano dividida" : "Tu mano"}</Text>
        <Text style={styles.score}>{hand.status === "bust" ? "PASADA" : score.total}</Text>
      </View>
      <View style={styles.cardsRow}>
        {hand.cards.map((card, index) => <BlackjackCard key={`${card}-${index}`} card={card} />)}
      </View>
      <Text style={styles.betText}>Apuesta {hand.bet.toLocaleString("es-ES")} · {hand.status}</Text>
    </View>
  );
}

export default function BlackjackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadBarajaSession().then((value) => { setSession(value); setHydrated(true); });
  }, []);

  const { data: room, isLoading } = useGetBarajaRoom(session?.roomCode ?? "", session?.playerId ?? "");
  const actionMut = useBlackjackAction();
  const nextMut = useBlackjackNextRound();
  const leaveMut = useLeaveBarajaRoom();
  const gs = room?.gameState?.type === "blackjack" ? room.gameState as BlackjackState : null;
  const myId = session?.playerId ?? "";
  const myHands = room?.myBlackjackHands ?? [];
  const isMyTurn = !!gs && gs.phase === "playing" && gs.playerOrder[gs.currentIdx] === myId;

  useEffect(() => {
    if (session && room?.status === "lobby") router.replace("/baraja-room" as never);
  }, [room?.status, router, session]);

  async function action(action: "hit" | "stand" | "double" | "split") {
    if (!session) return;
    setError(null);
    try {
      await actionMut.mutateAsync({ code: session.roomCode, playerId: session.playerId, action });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function leave() {
    if (session) await leaveMut.mutateAsync({ code: session.roomCode, playerId: session.playerId });
    await clearBarajaSession();
    router.replace("/");
  }

  if (!hydrated || (session && isLoading)) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color="#39FF14" /></View>;
  }
  if (!session || !room) {
    return (
      <BoardRoomLobby
        kind="blackjack"
        title="Blackjack 21"
        subtitle="Juega contra el dealer en realtime. Blackjack natural paga 3:2, el dealer se planta en 17."
        accent="#39FF14"
        maxPlayers={6}
        defaultMaxPlayers={4}
        onBack="/"
      />
    );
  }
  if (!gs) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color="#39FF14" /></View>;

  const dealerScore = gs.dealerHand.includes("hidden") ? "?" : blackjackScore(gs.dealerHand).total;
  const currentName = room.players.find((player) => player.id === gs.playerOrder[gs.currentIdx])?.name;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>BLACKJACK 21 · SALA {room.code}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Mesa contra el dealer</Text>
          </View>
          <Pressable onPress={leave} style={styles.exit}><Text style={styles.exitText}>Salir</Text></Pressable>
        </View>

        <View style={styles.table}>
          <Text style={styles.tableLabel}>DEALER · {dealerScore}</Text>
          <View style={styles.cardsRow}>
            {gs.dealerHand.map((card) => <BlackjackCard key={card} card={card} hidden={card === "hidden"} />)}
          </View>
          {gs.phase === "ended" && <Text style={styles.dealerResult}>Dealer {blackjackScore(gs.dealerHand).total}</Text>}
        </View>

        <View style={styles.turnCard}>
          <Text style={[styles.turn, { color: isMyTurn ? "#39FF14" : "#B9ADC2" }]}>
            {isMyTurn ? "TU TURNO" : gs.phase === "ended" ? "RONDA TERMINADA" : `Turno de ${currentName ?? "otro jugador"}`}
          </Text>
          <Text style={styles.hint}>{gs.lastMove ?? "Elige una acción para empezar"}</Text>
        </View>

        {myHands.map((hand, index) => (
          <HandView
            key={`${index}-${hand.bet}-${hand.cards.join(",")}`}
            hand={hand}
            active={isMyTurn && hand.status === "playing"}
          />
        ))}

        <View style={styles.stackCard}>
          <Text style={styles.stackLabel}>TU STACK</Text>
          <Text style={styles.stack}>{(gs.stacks[myId] ?? 0).toLocaleString("es-ES")} fichas</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {isMyTurn && (
          <View style={styles.actionGrid}>
            <ActionButton label="HIT" onPress={() => action("hit")} disabled={actionMut.isPending} />
            <ActionButton label="STAND" onPress={() => action("stand")} disabled={actionMut.isPending} />
            <ActionButton label="DOUBLE" onPress={() => action("double")} disabled={actionMut.isPending} />
            <ActionButton label="SPLIT" onPress={() => action("split")} disabled={actionMut.isPending} />
          </View>
        )}
        {gs.phase === "ended" && (
          <Pressable
            onPress={() => session && nextMut.mutate({ code: session.roomCode, playerId: session.playerId })}
            disabled={nextMut.isPending || room.ownerId !== myId}
            style={[styles.nextButton, { opacity: room.ownerId === myId ? 1 : 0.4 }]}
          >
            <Text style={styles.nextText}>{room.ownerId === myId ? "NUEVA RONDA" : "ESPERANDO AL HOST"}</Text>
          </Pressable>
        )}
        <View style={styles.log}>
          {room.log.slice(-5).reverse().map((entry, index) => <Text key={`${entry}-${index}`} style={styles.logText}>{entry}</Text>)}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.actionButton, disabled && { opacity: 0.45 }]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { color: "#39FF14", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, marginTop: 4 },
  exit: { borderWidth: 1, borderColor: "#3B2A47", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  exitText: { color: "#B9ADC2", fontFamily: "Inter_700Bold" },
  table: { borderWidth: 1, borderColor: "#1E6336", borderRadius: 20, backgroundColor: "#0B3A25", padding: 18, gap: 10, alignItems: "center" },
  tableLabel: { color: "#C6F7D2", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  cardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  card: { width: 58, height: 82, borderRadius: 9, backgroundColor: "#FFFDF5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D5CBB9" },
  cardBack: { backgroundColor: "#172244", borderColor: "#6075BB" },
  cardBackText: { color: "#A8B4CC", fontSize: 30 },
  rank: { color: "#1B2438", fontFamily: "Inter_700Bold", fontSize: 20 },
  suit: { color: "#1B2438", fontSize: 22 },
  red: { color: "#D83A5B" },
  dealerResult: { color: "#C6F7D2", fontFamily: "Inter_600SemiBold" },
  turnCard: { borderWidth: 1, borderColor: "#3B2A47", borderRadius: 14, padding: 14, backgroundColor: "#160C21", gap: 5 },
  turn: { fontFamily: "Inter_700Bold", letterSpacing: 1 },
  hint: { color: "#B9ADC2", fontFamily: "Inter_400Regular" },
  hand: { borderWidth: 1, borderColor: "#3B2A47", borderRadius: 14, padding: 14, backgroundColor: "#160C21", gap: 10 },
  activeHand: { borderColor: "#39FF14", backgroundColor: "#10251A" },
  handHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  handTitle: { color: "#F7F1FA", fontFamily: "Inter_700Bold" },
  score: { color: "#39FF14", fontFamily: "Inter_700Bold", fontSize: 18 },
  betText: { color: "#B9ADC2", fontFamily: "Inter_400Regular", fontSize: 12 },
  stackCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#3B2A47", borderRadius: 12, padding: 13 },
  stackLabel: { color: "#B9ADC2", fontFamily: "Inter_700Bold", fontSize: 11 },
  stack: { color: "#39FF14", fontFamily: "Inter_700Bold" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  actionButton: { flexGrow: 1, minWidth: 130, borderWidth: 1, borderColor: "#39FF14", borderRadius: 10, paddingVertical: 14, alignItems: "center", backgroundColor: "#39FF1420" },
  actionText: { color: "#39FF14", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  nextButton: { borderRadius: 10, paddingVertical: 15, alignItems: "center", backgroundColor: "#39FF14" },
  nextText: { color: "#07170C", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  error: { color: "#FF6179", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  log: { borderWidth: 1, borderColor: "#3B2A47", borderRadius: 12, padding: 12, gap: 5 },
  logText: { color: "#8E8099", fontFamily: "Inter_400Regular", fontSize: 12 },
});