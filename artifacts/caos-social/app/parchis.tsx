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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
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

        <ParchisBoard state={gs} />
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

function ParchisBoard({ state }: { state: ParchisState }) {
  const occupied = new Map<number, Array<{ color: string; playerId: string }>>();
  for (const playerId of state.playerOrder) {
    for (const piece of state.pieces[playerId] ?? []) {
      if (piece < 1 || piece >= 68) continue;
      const track = (piece + ({ rojo: 0, amarillo: 13, verde: 26, azul: 39 }[state.colors[playerId]]) % 52) % 52;
      occupied.set(track, [...(occupied.get(track) ?? []), { color: state.colors[playerId], playerId }]);
    }
  }
  const track = [
    [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5],
    [11, 5], [12, 5], [13, 5], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [13, 10],
    [12, 10], [11, 10], [10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [9, 14], [8, 14], [7, 14],
    [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10],
    [0, 10], [0, 9], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    [6, 6], [7, 6], [8, 6], [9, 6],
  ];
  const homes = [
    { x: 1, y: 1, color: COLOR_META.rojo, label: "ROJO", playerId: state.playerOrder.find((id) => state.colors[id] === "rojo") },
    { x: 9, y: 1, color: COLOR_META.amarillo, label: "AMARILLO", playerId: state.playerOrder.find((id) => state.colors[id] === "amarillo") },
    { x: 1, y: 9, color: COLOR_META.azul, label: "AZUL", playerId: state.playerOrder.find((id) => state.colors[id] === "azul") },
    { x: 9, y: 9, color: COLOR_META.verde, label: "VERDE", playerId: state.playerOrder.find((id) => state.colors[id] === "verde") },
  ];
  const homePieces = (playerId?: string) => (playerId ? state.pieces[playerId] ?? [] : []);
  const cell = 20;
  return (
    <View style={styles.board}>
      <Svg width="100%" height={330} viewBox="0 0 300 300">
        <Rect x="2" y="2" width="296" height="296" rx="12" fill="#170B2A" stroke="#5C2F86" strokeWidth="3" />
        <Rect x="0" y="0" width="100" height="100" fill={COLOR_META.rojo} opacity="0.9" />
        <Rect x="200" y="0" width="100" height="100" fill={COLOR_META.amarillo} opacity="0.9" />
        <Rect x="0" y="200" width="100" height="100" fill={COLOR_META.azul} opacity="0.9" />
        <Rect x="200" y="200" width="100" height="100" fill={COLOR_META.verde} opacity="0.9" />
        <Rect x="100" y="0" width="100" height="300" fill="#F5F2E9" opacity="0.94" />
        <Rect x="0" y="100" width="300" height="100" fill="#F5F2E9" opacity="0.94" />
        {track.map(([x, y], index) => {
          const safe = [0, 8, 13, 21, 26, 34, 39, 47].includes(index);
          const pieces = occupied.get(index) ?? [];
          return (
            <G key={`track-${index}`}>
              <Rect x={x * cell} y={y * cell} width={cell} height={cell} fill={safe ? "#FFE09A" : "#FFFFFF"} stroke="#B8AFC1" strokeWidth="0.8" />
              {safe && <Circle cx={x * cell + 10} cy={y * cell + 10} r="4" fill="#FFB800" opacity="0.75" />}
              {pieces.map((piece, pieceIndex) => (
                <Circle key={`${piece.playerId}-${pieceIndex}`} cx={x * cell + 6 + (pieceIndex % 2) * 7} cy={y * cell + 6 + Math.floor(pieceIndex / 2) * 7} r="3.2" fill={COLOR_META[piece.color as keyof typeof COLOR_META]} stroke="#1A1126" strokeWidth="0.8" />
              ))}
            </G>
          );
        })}
        <Path d="M100 100H200V120H180V140H160V160H140V180H120V200H100Z" fill={COLOR_META.rojo} opacity="0.7" />
        <Path d="M200 100V200H180V180H160V160H140V140H120V120H100V100Z" fill={COLOR_META.amarillo} opacity="0.7" />
        <Path d="M200 200H100V180H120V160H140V140H160V120H180V100H200Z" fill={COLOR_META.verde} opacity="0.7" />
        <Path d="M100 200V100H120V120H140V140H160V160H180V180H200V200Z" fill={COLOR_META.azul} opacity="0.7" />
        <Rect x="100" y="100" width="100" height="100" fill="#241334" stroke="#FFB800" strokeWidth="2" />
        <SvgText x="150" y="146" textAnchor="middle" fill="#FFB800" fontSize="13" fontWeight="700">META</SvgText>
        <SvgText x="150" y="162" textAnchor="middle" fill="#F5D7FF" fontSize="6" fontWeight="600">20 · 10</SvgText>
        {homes.map((home) => (
          <G key={home.label}>
            <Rect x={home.x * cell} y={home.y * cell} width="100" height="100" rx="15" fill={home.color} opacity="0.22" stroke={home.color} strokeWidth="2" />
            {[0, 1, 2, 3].map((index) => (
              <Circle key={index} cx={home.x * cell + 28 + (index % 2) * 44} cy={home.y * cell + 30 + Math.floor(index / 2) * 42} r="12" fill="#21102E" stroke={home.color} strokeWidth="3" opacity={(homePieces(home.playerId)[index] ?? -1) < 0 ? 0.95 : 0.55} />
            ))}
            <SvgText x={home.x * cell + 50} y={home.y * cell + 94} textAnchor="middle" fill={home.color} fontSize="8" fontWeight="700">{home.label}</SvgText>
          </G>
        ))}
      </Svg>
      <Text style={styles.boardCaption}>CRUZ CLÁSICA · CASILLAS DORADAS = SEGURO · SALIDA CON 5 O 6</Text>
    </View>
  );
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
  boardCaption: { color: "#C8B9D6", fontFamily: "Inter_600SemiBold", fontSize: 8, textAlign: "center", letterSpacing: 0.4 },
  error: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  winner: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  log: { borderWidth: 1, borderRadius: 13, padding: 13, gap: 5 },
  logTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 11 },
});