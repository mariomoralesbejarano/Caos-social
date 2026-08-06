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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BoardRoomLobby from "@/components/BoardRoomLobby";
import DiceRoller from "@/components/DiceRoller";
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
        <DiceRoller
          values={gs.lastDice}
          count={2}
          onRoll={roll}
          disabled={!isMyTurn || rollMut.isPending || gs.phase === "ended"}
          accent="#45A3FF"
          label="TIRAR DADOS"
        />
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
  const specialKinds: Record<number, "goose" | "bridge" | "inn" | "well" | "maze" | "jail" | "death"> = {
    5: "goose", 6: "bridge", 9: "goose", 12: "bridge", 14: "goose", 19: "inn",
    23: "goose", 27: "goose", 31: "well", 32: "goose", 36: "goose", 41: "goose",
    42: "maze", 45: "goose", 50: "goose", 54: "goose", 56: "jail", 58: "death", 59: "goose",
  };
  return (
    <View style={styles.board}>
      <Svg width="100%" height={500} viewBox="0 0 560 560">
        <Rect x="3" y="3" width="554" height="554" rx="26" fill="#081B2D" stroke="#275C91" strokeWidth="3" />
        <Circle cx="280" cy="280" r="38" fill="#123A5C" stroke="#45A3FF" strokeWidth="2" />
        <SvgText x="280" y="277" textAnchor="middle" fill="#D8E8F8" fontSize="13" fontWeight="700">LA OCA</SvgText>
        <SvgText x="280" y="294" textAnchor="middle" fill="#A9D4F8" fontSize="8" fontWeight="600">63 CASILLAS</SvgText>
        {cells.map((cell) => {
          const { x, y } = ocaSpiralPosition(cell);
          const kind = specialKinds[cell];
          const playersHere = state.playerOrder.filter((id) => state.positions[id] === cell);
          const cellColor = cell === 63 ? "#39FF14" : kind ? "#45A3FF" : "#3975A9";
          return (
            <G key={cell}>
              <Circle cx={x} cy={y} r={cell <= 20 ? 18 : 16} fill={cell === 63 ? "#144B37" : kind ? "#173B5D" : "#102C49"} stroke={cellColor} strokeWidth={kind || cell === 63 ? 2 : 1} />
              <SvgText x={x} y={kind ? y - 6 : y + 4} textAnchor="middle" fill="#E6F2FF" fontSize={cell <= 20 ? "11" : kind ? "8" : "10"} fontWeight="700">{cell}</SvgText>
              {kind && <SpecialIcon kind={kind} x={x} y={y + 9} />}
              {playersHere.map((playerId, index) => (
                <Circle key={playerId} cx={x - 9 + (index % 3) * 9} cy={y + 12 + Math.floor(index / 3) * 8} r="3.5" fill={PLAYER_COLORS[state.playerOrder.indexOf(playerId) % PLAYER_COLORS.length]} stroke="#061321" strokeWidth="1" />
              ))}
            </G>
          );
        })}
        <Path d={spiralPath()} fill="none" stroke="#75BFFF" strokeWidth="1.2" opacity="0.24" />
      </Svg>
      <Text style={styles.boardLegend}>OCA → OCA · PUENTE → PUENTE · POSADA · CÁRCEL · POZO · LABERINTO · CALAVERA</Text>
    </View>
  );
}

function ocaSpiralPosition(cell: number) {
  const progress = (cell - 1) / 62;
  const angle = progress * Math.PI * 4.2 - Math.PI / 2;
  const radius = 32 + progress * 214;
  return { x: 280 + Math.cos(angle) * radius, y: 280 + Math.sin(angle) * radius };
}

function spiralPath() {
  return Array.from({ length: 63 }, (_, index) => {
    const point = ocaSpiralPosition(index + 1);
    return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(" ");
}

function SpecialIcon({ kind, x, y }: { kind: "goose" | "bridge" | "inn" | "well" | "maze" | "jail" | "death"; x: number; y: number }) {
  const stroke = "#BFE4FF";
  if (kind === "goose") return <G><Path d={`M${x - 5} ${y + 8}c-4-7 2-12 5-7 1-7 7-8 7-2 0 4-3 6-6 6`} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /><Circle cx={x + 5} cy={y - 2} r="1.2" fill={stroke} /></G>;
  if (kind === "bridge") return <G><Path d={`M${x - 10} ${y + 6}Q${x} ${y - 8} ${x + 10} ${y + 6}`} fill="none" stroke={stroke} strokeWidth="2" /><Line x1={x - 8} y1={y + 5} x2={x - 8} y2={y - 2} stroke={stroke} strokeWidth="1" /><Line x1={x + 8} y1={y + 5} x2={x + 8} y2={y - 2} stroke={stroke} strokeWidth="1" /></G>;
  if (kind === "inn") return <G><Path d={`M${x - 10} ${y - 3}L${x} ${y - 11}L${x + 10} ${y - 3}Z`} fill="#FFB800" /><Rect x={x - 7} y={y - 3} width="14" height="11" fill="none" stroke={stroke} strokeWidth="1.5" /></G>;
  if (kind === "well") return <G><Circle cx={x} cy={y + 2} r="9" fill="none" stroke={stroke} strokeWidth="2" /><Line x1={x - 8} y1={y - 7} x2={x + 8} y2={y - 7} stroke={stroke} strokeWidth="1.5" /></G>;
  if (kind === "maze") return <Path d={`M${x - 9} ${y - 8}h18v16H${x - 4}v-4h8v-8H${x - 5}v8h-4Z`} fill="none" stroke={stroke} strokeWidth="1.5" />;
  if (kind === "jail") return <G><Rect x={x - 9} y={y - 9} width="18" height="18" fill="none" stroke={stroke} strokeWidth="1.5" />{[-5, 0, 5].map((offset) => <Line key={offset} x1={x + offset} y1={y - 8} x2={x + offset} y2={y + 8} stroke={stroke} strokeWidth="1" />)}</G>;
  return <G><Circle cx={x} cy={y} r="9" fill="#172235" stroke="#DCE8F5" strokeWidth="1.5" /><Circle cx={x - 3} cy={y - 2} r="1.5" fill="#DCE8F5" /><Circle cx={x + 3} cy={y - 2} r="1.5" fill="#DCE8F5" /><Path d={`M${x - 4} ${y + 4}h8`} stroke="#DCE8F5" strokeWidth="1.5" /></G>;
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
  boardLegend: { color: "#A9C6E2", fontFamily: "Inter_600SemiBold", fontSize: 8, lineHeight: 13, textAlign: "center" },
  status: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  turn: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 },
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