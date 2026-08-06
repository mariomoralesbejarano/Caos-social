import {
  useGetBarajaRoom,
  useLeaveBarajaRoom,
  useTraditionalPlay,
} from "@workspace/api-client-react";
import type { TraditionalState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SpanishCardById } from "@/components/SpanishCard";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

const VARIANT_COPY: Record<string, { title: string; help: string; accent: string }> = {
  brisca: { title: "Brisca", help: "Juega una carta por turno y gana bazas con el triunfo.", accent: "#FFB800" },
  escoba: { title: "Escoba", help: "Limpia la mesa con combinaciones de cartas.", accent: "#45A3FF" },
  culo: { title: "Culo / El Rey", help: "Descarta tus cartas antes que el resto.", accent: "#FF4D67" },
  mico: { title: "El Mico", help: "Descarta parejas y evita quedarte con la carta maldita.", accent: "#FF4D67" },
  pesca: { title: "La Pesca", help: "Completa familias de cuatro cartas y pesca cuando no encuentres una.", accent: "#45A3FF" },
  cuatrola: { title: "Cuatrola", help: "Forma equipos y gana las bazas con el triunfo.", accent: "#FFB800" },
  tute: { title: "Tute", help: "Juega bazas, canta y suma más puntos que tus rivales.", accent: "#B026FF" },
  "7ymedio": { title: "7½", help: "Acércate a siete y medio sin pasarte.", accent: "#39FF14" },
  chinchon: { title: "Chinchón", help: "Forma escaleras y grupos para cerrar tu mano.", accent: "#B026FF" },
  burro: { title: "Burro", help: "Reúne cuatro cartas del mismo valor y evita quedarte el último.", accent: "#FF7A45" },
  chanchullo: { title: "Chanchullo", help: "Intercambia cartas y completa tus combinaciones antes que nadie.", accent: "#FF7A45" },
  golfo: { title: "Golfo", help: "Descarta tus cartas y fuerza a tus rivales a robar.", accent: "#39FF14" },
  cauca: { title: "Cauca", help: "Juega por turnos y quédate sin cartas primero.", accent: "#45A3FF" },
  rueda: { title: "La Rueda", help: "Pasa cartas en círculo y busca la combinación ganadora.", accent: "#B026FF" },
  cinquillo: { title: "Cinquillo", help: "Empieza con un 5 y continúa las escaleras por palo.", accent: "#39FF14" },
  pocha: { title: "Pocha", help: "Juega por bazas y demuestra que sabes leer la mano.", accent: "#B026FF" },
  remigio: { title: "Remigio", help: "Forma combinaciones y vacía tu mano.", accent: "#FF7A45" },
  relojito: { title: "El Relojito", help: "Voltea y juega rápido para vaciar tu mazo.", accent: "#FFB800" },
};

function titleFor(id: string) {
  return VARIANT_COPY[id] ?? { title: "Baraja Española", help: "Juega tus cartas por turnos.", accent: "#B026FF" };
}

export default function TraditionalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadBarajaSession().then((value) => { setSession(value); setHydrated(true); }); }, []);
  const { data: room, isLoading } = useGetBarajaRoom(session?.roomCode ?? "", session?.playerId ?? "");
  const playMut = useTraditionalPlay();
  const leaveMut = useLeaveBarajaRoom();
  const gs = room?.gameState?.type === "traditional" ? room.gameState as TraditionalState : null;
  const myId = session?.playerId ?? "";
  const meta = titleFor(room?.gameId ?? "");
  const isMyTurn = !!gs && gs.playerOrder[gs.currentIdx] === myId;
  useEffect(() => {
    if (session && room?.status === "lobby") router.replace("/baraja-room" as never);
  }, [room?.status, router, session]);

  async function play(cardId: string) {
    if (!session) return;
    setError(null);
    try {
      await playMut.mutateAsync({ code: session.roomCode, playerId: session.playerId, cardId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  async function leave() {
    if (session) await leaveMut.mutateAsync({ code: session.roomCode, playerId: session.playerId });
    await clearBarajaSession();
    router.replace("/");
  }

  if (!hydrated || (session && isLoading)) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={meta.accent} /></View>;
  if (!session || !room) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Entra desde un juego de Baraja Española.</Text></View>;
  }
  if (!gs) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={meta.accent} /></View>;
  const currentName = room.players.find((player) => player.id === gs.playerOrder[gs.currentIdx])?.name;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.header}>
          <View><Text style={[styles.kicker, { color: meta.accent }]}>{meta.title.toUpperCase()} · SALA {room.code}</Text><Text style={[styles.title, { color: colors.foreground }]}>{meta.title}</Text></View>
          <Pressable onPress={leave} style={styles.exit}><Text style={styles.exitText}>Salir</Text></Pressable>
        </View>
        <View style={[styles.status, { borderColor: meta.accent + "70" }]}>
          <Text style={[styles.turn, { color: isMyTurn ? meta.accent : colors.mutedForeground }]}>{isMyTurn ? "TU TURNO" : `Turno de ${currentName ?? "otro jugador"}`}</Text>
          <Text style={styles.help}>{meta.help}</Text>
          {gs.lastMove && <Text style={styles.lastMove}>{gs.lastMove}</Text>}
        </View>
        <View style={styles.table}>
          <Text style={styles.tableTitle}>Mesa · {gs.playedCards.length} cartas jugadas</Text>
          <View style={styles.tableCards}>
            {gs.playedCards.slice(-8).map((cardId) => <SpanishCardById key={cardId} cardId={cardId} size="sm" />)}
          </View>
        </View>
        <View style={styles.handHeader}><Text style={[styles.handTitle, { color: colors.foreground }]}>Tu mano</Text><Text style={{ color: colors.mutedForeground }}>{room.myHand.length} cartas</Text></View>
        <View style={styles.hand}>
          {room.myHand.map((card) => (
            <Pressable key={card.id} onPress={() => play(card.id)} disabled={!isMyTurn || playMut.isPending || gs.phase === "ended"} style={{ opacity: isMyTurn ? 1 : 0.55 }}>
              <SpanishCardById cardId={card.id} size="md" />
            </Pressable>
          ))}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        {gs.phase === "ended" && <Text style={[styles.winner, { color: meta.accent }]}>Ganador: {room.players.find((player) => player.id === gs.winnerId)?.name ?? "Jugador"}</Text>}
        <View style={styles.log}>{room.log.slice(-5).reverse().map((entry, index) => <Text key={`${entry}-${index}`} style={styles.logText}>{entry}</Text>)}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  container: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 4 },
  exit: { borderWidth: 1, borderColor: "#3B2A47", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  exitText: { color: "#B9ADC2", fontFamily: "Inter_700Bold" },
  status: { borderWidth: 1, borderRadius: 14, padding: 14, backgroundColor: "#160C21", gap: 5 },
  turn: { fontFamily: "Inter_700Bold", letterSpacing: 1 },
  help: { color: "#B9ADC2", fontFamily: "Inter_400Regular", lineHeight: 19 },
  lastMove: { color: "#F7F1FA", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  table: { minHeight: 155, borderRadius: 18, backgroundColor: "#142D32", borderWidth: 1, borderColor: "#2E6B68", padding: 16, gap: 14 },
  tableTitle: { color: "#C5E8E2", fontFamily: "Inter_700Bold", fontSize: 12 },
  tableCards: { flexDirection: "row", flexWrap: "wrap", gap: 7, alignItems: "center" },
  handHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  handTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  hand: { flexDirection: "row", flexWrap: "wrap", gap: 9, justifyContent: "center", padding: 14, borderWidth: 1, borderColor: "#3B2A47", borderRadius: 14, backgroundColor: "#160C21" },
  error: { color: "#FF6179", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  winner: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  log: { borderWidth: 1, borderColor: "#3B2A47", borderRadius: 12, padding: 12, gap: 5 },
  logText: { color: "#8E8099", fontFamily: "Inter_400Regular", fontSize: 12 },
});