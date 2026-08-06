import {
  useGetBarajaRoom,
  useLeaveBarajaRoom,
  useOcaRoll,
} from "@workspace/api-client-react";
import type { OcaState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

const PLAYER_COLORS = ["#FF4D67", "#FFB800", "#39FF14", "#45A3FF", "#B026FF", "#FF7A45"];

export default function OcaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const rollMut = useOcaRoll();
  const leaveMut = useLeaveBarajaRoom();
  const gs = room?.gameState?.type === "oca" ? room.gameState as OcaState : null;
  const myId = session?.playerId ?? "";
  const isMyTurn = !!gs && gs.playerOrder[gs.currentIdx] === myId;
  const diceRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!gs?.lastDice) return;
    diceRotation.setValue(0);
    Animated.timing(diceRotation, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [gs?.lastDice, diceRotation]);

  useEffect(() => {
    if (session && room?.status === "lobby") router.replace("/baraja-room" as never);
  }, [room?.status, router, session]);

  async function roll() {
    if (!session) return;
    setError(null);
    try {
      await rollMut.mutateAsync({ code: session.roomCode, playerId: session.playerId });
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
    return <LoadingScreen color="#45A3FF" />;
  }
  if (!session || !room) {
    return (
      <BoardRoomLobby
        kind="oca"
        title="La Oca"
        subtitle="De 2 a 6 jugadores recorren las 63 casillas y activan los saltos clásicos."
        accent="#45A3FF"
        maxPlayers={6}
        defaultMaxPlayers={4}
        onBack="/"
      />
    );
  }
  if (!gs) return <LoadingScreen color="#45A3FF" />;

  const currentName = room.players.find((player) => player.id === gs.playerOrder[gs.currentIdx])?.name;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: "#45A3FF" }]}>LA OCA · SALA {room.code}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Tira y avanza</Text>
          </View>
          <Pressable onPress={leave} style={[styles.smallButton, { borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold" }}>Salir</Text>
          </Pressable>
        </View>

        <OcaBoard state={gs} />
        <View style={[styles.status, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.turn, { color: isMyTurn ? "#45A3FF" : colors.mutedForeground }]}>
            {isMyTurn ? "TU TURNO" : `Turno de ${currentName ?? "otro jugador"}`}
          </Text>
          <Animated.Text
            style={[
              styles.dice,
              {
                color: colors.foreground,
                transform: [
                  { scale: diceRotation.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) },
                  { rotate: diceRotation.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "0deg"] }) },
                ],
              },
            ]}
          >
            {gs.lastDice ? `${gs.lastDice[0]} + ${gs.lastDice[1]}` : "—"}
          </Animated.Text>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            {gs.lastMove ?? "Tira los dados para avanzar"}
          </Text>
        </View>

        <View style={styles.playersCard}>
          {gs.playerOrder.map((playerId, index) => {
            const player = room.players.find((item) => item.id === playerId);
            const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
            return (
              <View
                key={playerId}
                style={[
                  styles.playerRow,
                  {
                    borderColor: gs.currentIdx === index ? color : colors.border,
                    backgroundColor: gs.currentIdx === index ? color + "18" : colors.card,
                  },
                ]}
              >
                <Text style={{ color, fontSize: 18 }}>●</Text>
                <Text style={[styles.playerName, { color: colors.foreground }]}>{player?.name ?? "Jugador"}</Text>
                <Text style={[styles.position, { color: colors.mutedForeground }]}>
                  Casilla {gs.positions[playerId] ?? 0}
                </Text>
                {(gs.turnsToSkip[playerId] ?? 0) > 0 && (
                  <Text style={[styles.skip, { color: "#FFB800" }]}>-{gs.turnsToSkip[playerId]} turnos</Text>
                )}
              </View>
            );
          })}
        </View>

        {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
        <Pressable
          onPress={roll}
          disabled={!isMyTurn || rollMut.isPending || gs.phase === "ended"}
          style={[styles.rollButton, { backgroundColor: "#45A3FF", opacity: !isMyTurn || gs.phase === "ended" ? 0.45 : 1 }]}
        >
          {rollMut.isPending ? <ActivityIndicator color="#071426" /> : <Text style={styles.rollText}>TIRAR DADOS</Text>}
        </Pressable>
        {gs.phase === "ended" && (
          <Text style={[styles.winner, { color: "#39FF14" }]}>
            Ganador: {room.players.find((player) => player.id === gs.winnerId)?.name ?? "Jugador"}
          </Text>
        )}
        <View style={[styles.log, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.logTitle, { color: colors.foreground }]}>Actividad</Text>
          {room.log.slice(-5).reverse().map((entry, index) => (
            <Text key={`${entry}-${index}`} style={[styles.logEntry, { color: colors.mutedForeground }]}>{entry}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function OcaBoard({ state }: { state: OcaState }) {
  const cells = useMemo(() => Array.from({ length: 63 }, (_, index) => index + 1), []);
  const specialLabels: Record<number, string> = {
    5: "OCA", 6: "P", 14: "OCA", 19: "POS", 23: "OCA", 31: "POZ",
    32: "OCA", 41: "OCA", 42: "LAB", 50: "OCA", 56: "CAR", 59: "OCA", 63: "META",
  };
  return (
    <View style={styles.board}>
      <View style={styles.spiral}>
        {cells.map((cell) => {
          const playersHere = state.playerOrder.filter((id) => state.positions[id] === cell);
          const special = specialLabels[cell];
          return (
            <View
              key={cell}
              style={[
                styles.cell,
                spiralPosition(cell),
                special && styles.specialCell,
                cell === 63 && styles.finishCell,
              ]}
            >
              <Text style={styles.cellNumber}>{cell}</Text>
              {special && <Text style={styles.specialText}>{special}</Text>}
              <View style={styles.tokens}>
                {playersHere.map((playerId) => {
                  const index = state.playerOrder.indexOf(playerId);
                  return <Text key={playerId} style={{ color: PLAYER_COLORS[index % PLAYER_COLORS.length], fontSize: 13 }}>●</Text>;
                })}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.boardLegend}>OCA → OCA · PUENTE → PUENTE · POSADA · CÁRCEL · POZO · LABERINTO · CALAVERA</Text>
    </View>
  );
}

function LoadingScreen({ color }: { color: string }) {
  return <View style={styles.loading}><ActivityIndicator color={color} size="large" /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0A0014" },
  container: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 27, marginTop: 4 },
  smallButton: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  board: { borderRadius: 20, borderWidth: 2, borderColor: "#275C91", backgroundColor: "#102947", padding: 12, gap: 12 },
  spiral: { height: 520, position: "relative", alignSelf: "center", width: "100%", maxWidth: 600 },
  cell: { width: 48, height: 43, borderRadius: 8, borderWidth: 1, borderColor: "#3975A9", backgroundColor: "#17385B", alignItems: "center", justifyContent: "center" },
  specialCell: { backgroundColor: "#244D71", borderColor: "#45A3FF" },
  finishCell: { backgroundColor: "#144B37", borderColor: "#39FF14" },
  cellNumber: { color: "#D8E8F8", fontFamily: "Inter_700Bold", fontSize: 10 },
  specialText: { color: "#A9D4F8", fontFamily: "Inter_700Bold", fontSize: 7, marginTop: 1 },
  tokens: { flexDirection: "row", height: 13, alignItems: "center" },
  boardLegend: { color: "#A9C6E2", fontFamily: "Inter_600SemiBold", fontSize: 8, lineHeight: 13, textAlign: "center" },
  status: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  turn: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 },
  dice: { fontFamily: "Inter_700Bold", fontSize: 32 },
  help: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  playersCard: { gap: 7 },
  playerRow: { minHeight: 45, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  playerName: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  position: { fontFamily: "Inter_400Regular", fontSize: 11 },
  skip: { fontFamily: "Inter_700Bold", fontSize: 10 },
  rollButton: { borderRadius: 10, paddingVertical: 15, alignItems: "center" },
  rollText: { color: "#071426", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  error: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  winner: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  log: { borderWidth: 1, borderRadius: 13, padding: 13, gap: 5 },
  logTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 11 },
});

function spiralPosition(cell: number) {
  const progress = (cell - 1) / 62;
  const angle = progress * Math.PI * 6.5;
  const radius = 30 + progress * 17;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return {
    position: "absolute" as const,
    left: `${x}%` as `${number}%`,
    top: `${y}%` as `${number}%`,
    transform: [{ translateX: -24 }, { translateY: -21 }],
  };
}