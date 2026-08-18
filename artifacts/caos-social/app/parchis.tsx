import {
  useGetBarajaRoom,
  useLeaveBarajaRoom,
  useParchisMove,
  useParchisRoll,
} from "@workspace/api-client-react";
import type { ParchisState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BoardRoomLobby from "@/components/BoardRoomLobby";
import DiceRoller from "@/components/DiceRoller";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

const COLOR_META = {
  rojo: "#FF4D67",
  amarillo: "#FFB800",
  verde: "#39FF14",
  azul: "#45A3FF",
} as const;

export default function ParchisScreen() {
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
  const rollMut = useParchisRoll();
  const moveMut = useParchisMove();
  const leaveMut = useLeaveBarajaRoom();
  const gs = room?.gameState?.type === "parchis" ? room.gameState as ParchisState : null;
  const myId = session?.playerId ?? "";
  const isMyTurn = !!gs && gs.playerOrder[gs.currentIdx] === myId;
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

  async function move(pieceIndex: number) {
    if (!session) return;
    setError(null);
    try {
      await moveMut.mutateAsync({ code: session.roomCode, playerId: session.playerId, pieceIndex });
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
    return <LoadingScreen color={colors.primary} />;
  }
  if (!session || !room) {
    return (
      <BoardRoomLobby
        kind="parchis"
        title="Parchís"
        subtitle="De 2 a 4 colores compiten en un tablero sincronizado en tiempo real."
        accent="#FFB800"
        maxPlayers={4}
        defaultMaxPlayers={4}
        onBack="/"
      />
    );
  }
  if (!gs) return <LoadingScreen color="#FFB800" />;

  const myPieces = gs.pieces[myId] ?? [];
  const currentName = room.players.find((player) => player.id === gs.playerOrder[gs.currentIdx])?.name;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: "#FFB800" }]}>PARCHÍS · SALA {room.code}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Carrera al centro</Text>
          </View>
          <Pressable onPress={leave} style={[styles.smallButton, { borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold" }}>Salir</Text>
          </Pressable>
        </View>

        <ParchisBoardImage state={gs} />
        <View style={[styles.status, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.turn, { color: isMyTurn ? "#FFB800" : colors.mutedForeground }]}>
            {isMyTurn ? "TU TURNO" : `Turno de ${currentName ?? "otro jugador"}`}
          </Text>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            {gs.dice === null ? "Necesitas un 5 (o 6) para sacar una ficha de casa" : "Elige una ficha para mover"}
          </Text>
        </View>

        <View style={styles.piecesRow}>
          {myPieces.map((position, index) => (
            <Pressable
              key={index}
              onPress={() => move(index)}
              disabled={!isMyTurn || gs.dice === null || moveMut.isPending}
              style={[
                styles.pieceButton,
                {
                  borderColor: COLOR_META[gs.colors[myId]],
                  opacity: !isMyTurn || gs.dice === null ? 0.45 : 1,
                },
              ]}
            >
              <Text style={{ color: COLOR_META[gs.colors[myId]], fontSize: 22 }}>●</Text>
              <Text style={[styles.pieceLabel, { color: colors.foreground }]}>
                {position < 0 ? "Casa" : position >= 68 ? "Meta" : `${position}/68`}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
        <DiceRoller
          values={gs.lastDice === null ? null : [gs.lastDice]}
          onRoll={roll}
          disabled={!isMyTurn || gs.dice !== null || rollMut.isPending || gs.phase === "ended"}
          accent="#FFB800"
        />
        {gs.phase === "ended" && (
          <Text style={[styles.winner, { color: "#39FF14" }]}>
            Ganador: {room.players.find((player) => player.id === gs.winnerId)?.name ?? "Jugador"}
          </Text>
        )}
        <ActivityLog entries={room.log} colors={colors} />
      </ScrollView>
    </View>
  );
}

function ParchisBoardImage({ state }: { state: ParchisState }) {
  const tokens: Array<{ id: string; color: keyof typeof COLOR_META; index: number; position: number }> = [];
  for (const [playerId, pieces] of Object.entries(state.pieces)) {
    pieces.forEach((position, index) => tokens.push({
      id: `${playerId}-${index}`,
      color: state.colors[playerId],
      index,
      position,
    }));
  }
  return (
    <View style={styles.assetBoard}>
       <Image source={{ uri: "/assets/parchis_board.png" }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      {tokens.map((token) => {
        const point = token.position < 0
          ? homePoint(token.color, token.index)
          : token.position >= 68
            ? { x: 50, y: 50 }
            : parchisPoint(token.color, token.position);
        return (
           <View key={token.id} style={[styles.assetToken, { left: `${point.x}%`, top: `${point.y}%`, backgroundColor: COLOR_META[token.color], opacity: token.position < 0 ? 0.72 : 1 }]}>
            <Text style={styles.assetTokenText}>{token.index + 1}</Text>
          </View>
        );
      })}
      <Text style={styles.assetCaption}>TABLERO ILUSTRADO · SALIDA, SEGUROS Y CASAS REALES</Text>
    </View>
  );
}

const PARCHIS_COORDINATES = [
  { x: 41, y: 6 }, { x: 47, y: 6 }, { x: 53, y: 6 }, { x: 59, y: 6 }, { x: 65, y: 6 },
  { x: 65, y: 12 }, { x: 65, y: 18 }, { x: 65, y: 24 }, { x: 65, y: 30 }, { x: 65, y: 36 },
  { x: 71, y: 41 }, { x: 77, y: 41 }, { x: 83, y: 41 }, { x: 89, y: 41 }, { x: 89, y: 47 },
  { x: 89, y: 53 }, { x: 89, y: 59 }, { x: 89, y: 65 }, { x: 89, y: 71 }, { x: 83, y: 71 },
  { x: 77, y: 71 }, { x: 71, y: 71 }, { x: 65, y: 71 }, { x: 65, y: 77 }, { x: 65, y: 83 },
  { x: 65, y: 89 }, { x: 59, y: 89 }, { x: 53, y: 89 }, { x: 47, y: 89 }, { x: 41, y: 89 },
  { x: 41, y: 83 }, { x: 41, y: 77 }, { x: 41, y: 71 }, { x: 35, y: 71 }, { x: 29, y: 71 },
  { x: 23, y: 71 }, { x: 17, y: 71 }, { x: 11, y: 71 }, { x: 11, y: 65 }, { x: 11, y: 59 },
  { x: 11, y: 53 }, { x: 11, y: 47 }, { x: 17, y: 41 }, { x: 23, y: 41 }, { x: 29, y: 41 },
  { x: 35, y: 41 }, { x: 41, y: 36 }, { x: 41, y: 30 }, { x: 41, y: 24 }, { x: 41, y: 18 },
  { x: 41, y: 12 }, { x: 47, y: 12 },
  { x: 50, y: 36 }, { x: 50, y: 34 }, { x: 50, y: 32 }, { x: 50, y: 30 },
  { x: 50, y: 28 }, { x: 50, y: 26 }, { x: 50, y: 24 }, { x: 50, y: 22 },
  { x: 50, y: 20 }, { x: 50, y: 18 }, { x: 50, y: 16 }, { x: 50, y: 14 },
  { x: 50, y: 12 }, { x: 50, y: 10 }, { x: 50, y: 8 }, { x: 50, y: 6 },
] as const;

const PARCHIS_LANES: Record<keyof typeof COLOR_META, Array<[number, number]>> = {
  rojo: Array.from({ length: 16 }, (_, index) => [50, 36 - index * 1.55]),
  amarillo: Array.from({ length: 16 }, (_, index) => [36 - index * 1.55, 50]),
  verde: Array.from({ length: 16 }, (_, index) => [50, 64 + index * 1.55]),
  azul: Array.from({ length: 16 }, (_, index) => [64 + index * 1.55, 50]),
 };

function parchisPoint(color: keyof typeof COLOR_META, progress: number): { x: number; y: number } {
  if (progress > 52) {
    const point = PARCHIS_LANES[color][Math.min(progress - 53, 15)] ?? [50, 50];
    const [x, y] = point;
    return { x, y };
  }
  const offset = { rojo: 0, amarillo: 13, verde: 26, azul: 39 }[color];
  return PARCHIS_COORDINATES[(progress + offset) % 52] ?? { x: 50, y: 50 };
}

function homePoint(color: keyof typeof COLOR_META, index: number): { x: number; y: number } {
  const points = {
    rojo: [{ x: 17, y: 17 }, { x: 26, y: 17 }, { x: 17, y: 26 }, { x: 26, y: 26 }],
    amarillo: [{ x: 74, y: 17 }, { x: 83, y: 17 }, { x: 74, y: 26 }, { x: 83, y: 26 }],
    azul: [{ x: 17, y: 74 }, { x: 26, y: 74 }, { x: 17, y: 83 }, { x: 26, y: 83 }],
    verde: [{ x: 74, y: 74 }, { x: 83, y: 74 }, { x: 74, y: 83 }, { x: 83, y: 83 }],
  } as const;
  return points[color][index] ?? points.rojo[0];
}

function LoadingScreen({ color }: { color: string }) {
  return <View style={styles.loading}><ActivityIndicator color={color} size="large" /></View>;
}

function ActivityLog({ entries, colors }: { entries: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.log, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.logTitle, { color: colors.foreground }]}>Actividad</Text>
      {entries.slice(-5).reverse().map((entry, index) => (
        <Text key={`${entry}-${index}`} style={[styles.logEntry, { color: colors.mutedForeground }]}>{entry}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0A0014" },
  container: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 27, marginTop: 4 },
  smallButton: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  board: { minHeight: 340, borderRadius: 22, borderWidth: 2, borderColor: "#5C2F86", backgroundColor: "#25103D", padding: 8, justifyContent: "center", overflow: "hidden" },
  assetBoard: { width: "100%", aspectRatio: 1, maxWidth: 620, alignSelf: "center", borderRadius: 22, overflow: "hidden", position: "relative", backgroundColor: "#f8e7bd" },
  assetToken: { position: "absolute", width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5, borderRadius: 5.5, borderWidth: 1, borderColor: "#fff8df", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: .35, shadowRadius: 3, elevation: 4 },
  assetTokenText: { color: "#fff", fontSize: 6, fontFamily: "Inter_700Bold" },
  assetCaption: { position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "#5f3b25", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: .8 },
  boardCenter: { position: "absolute", alignSelf: "center", alignItems: "center", justifyContent: "center", width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: "#FFB800", backgroundColor: "#1A0A2B", zIndex: 2 },
  centerMark: { color: "#FFB800", fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: 2 },
  centerSub: { color: "#C8B9D6", fontFamily: "Inter_400Regular", fontSize: 9, textAlign: "center", marginTop: 4 },
  track: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  trackSlot: { width: 48, height: 42, borderRadius: 8, borderWidth: 1, borderColor: "#68428D", backgroundColor: "#30184B", alignItems: "center", justifyContent: "center" },
  slotNumber: { color: "#BBA9CE", fontFamily: "Inter_600SemiBold", fontSize: 8 },
  status: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  turn: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 },
  help: { fontFamily: "Inter_400Regular", fontSize: 11 },
  piecesRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8 },
  pieceButton: { minWidth: 82, borderWidth: 1, borderRadius: 10, padding: 9, alignItems: "center", gap: 3 },
  pieceLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  error: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  winner: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  log: { borderWidth: 1, borderRadius: 13, padding: 13, gap: 5 },
  logTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 11 },
});