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

        <OcaBoardImage state={gs} />
        <View style={[styles.status, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.turn, { color: isMyTurn ? "#45A3FF" : colors.mutedForeground }]}>
            {isMyTurn ? "TU TURNO" : `Turno de ${currentName ?? "otro jugador"}`}
          </Text>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            {gs.lastMove ?? "Tira los dados para avanzar"}
          </Text>
          {gs.partyMode && gs.partyEvent && (
            <View style={styles.partyEvent}>
              <Text style={styles.partyEventKicker}>MODO FIESTA</Text>
              <Text style={styles.partyEventText}>{gs.partyEvent}</Text>
            </View>
          )}
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

function OcaBoardImage({ state }: { state: OcaState }) {
  return (
    <View style={styles.assetBoard}>
      <Image source={{ uri: "/assets/oca-board-real.png" }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      {Array.from({ length: 63 }, (_, index) => index + 1).map((cell) => {
        const point = ocaBoardPoint(cell);
        const playersHere = state.playerOrder.filter((id) => (state.positions[id] ?? 0) === cell);
        return (
          <View key={cell} style={[styles.ocaCell, { left: `${point.x}%`, top: `${point.y}%` }]}>
            {playersHere.map((playerId, index) => (
              <View key={playerId} style={[styles.ocaToken, { backgroundColor: PLAYER_COLORS[state.playerOrder.indexOf(playerId) % PLAYER_COLORS.length], marginLeft: index * 9 }]}>
                <Text style={styles.assetTokenText}>{state.playerOrder.indexOf(playerId) + 1}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <View style={styles.assetLegend}>
        <Text style={styles.assetLegendText}>63 CASILLAS</Text>
        <Text style={styles.assetLegendSub}>OCAS · PUENTE · POSADA · POZO · LABERINTO · CÁRCEL · CALAVERA</Text>
      </View>
    </View>
  );
}

function ocaBoardPoint(cell: number) {
  const progress = (cell - 1) / 62;
  const angle = progress * Math.PI * 5.8 - Math.PI / 2;
  const radius = 8 + progress * 40;
  return {
    x: 50 + Math.cos(angle) * radius * 1.08,
    y: 50 + Math.sin(angle) * radius * 0.92,
  };
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
  assetBoard: { width: "100%", aspectRatio: 1, maxWidth: 760, alignSelf: "center", borderRadius: 20, overflow: "hidden", position: "relative", backgroundColor: "#fdf3ca" },
  ocaCell: { position: "absolute", width: 22, height: 22, marginLeft: -11, marginTop: -11, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  ocaToken: { position: "absolute", top: 12, width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: "#fff8df", alignItems: "center", justifyContent: "center" },
  assetTokenText: { color: "#fff", fontSize: 7, fontFamily: "Inter_700Bold" },
  assetLegend: { position: "absolute", bottom: 9, left: 0, right: 0, alignItems: "center", gap: 2 },
  assetLegendText: { color: "#6d4029", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: .7 },
  assetLegendSub: { color: "#7d5030", fontFamily: "Inter_600SemiBold", fontSize: 6, letterSpacing: .25 },
  partyEvent: { marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: "#FF7A45", backgroundColor: "#FF7A4518", padding: 10, width: "100%", alignItems: "center" },
  partyEventKicker: { color: "#FF7A45", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.5 },
  partyEventText: { color: "#FFD2BD", fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 3, textAlign: "center" },
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