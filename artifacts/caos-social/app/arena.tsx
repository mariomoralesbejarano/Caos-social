import { useArenaAction, useGetBarajaRoom, useLeaveBarajaRoom } from "@workspace/api-client-react";
import type { ArenaState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

const ROUND_META = {
  reflejos: { title: "Duelo de Reflejos", hint: "Pulsa cuando aparezca el flash", color: "#ff4f9a" },
  bomba: { title: "Bomba de Tiempo", hint: "Pasa el artefacto antes de que explote", color: "#ffb84d" },
  memoria: { title: "Memoria Rápida", hint: "Repite la secuencia y suma puntos", color: "#64e6a5" },
} as const;

export default function ArenaScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null); const [hydrated, setHydrated] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadBarajaSession().then((value) => { setSession(value); setHydrated(true); }); }, []);
  const { data: room, isLoading } = useGetBarajaRoom(session?.roomCode ?? "", session?.playerId ?? "");
  const scoreMut = useArenaAction(); const leaveMut = useLeaveBarajaRoom();
  const gs = room?.gameState?.type === "arena" ? room.gameState as ArenaState : null; const myId = session?.playerId ?? "";
  async function score(points = 1) { if (!session) return; try { await scoreMut.mutateAsync({ code: session.roomCode, playerId: myId, action: "score", points }); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }
  async function leave() { if (session) await leaveMut.mutateAsync({ code: session.roomCode, playerId: myId }); await clearBarajaSession(); router.replace("/"); }
  if (!hydrated || (session && isLoading)) return <View style={styles.loading}><ActivityIndicator color="#ff4f9a" size="large" /></View>;
  if (!session || !room) return <BoardRoomLobby kind="arena" title="Arena de Minijuegos" subtitle="Rondas cortas, reflejos y marcador grupal en directo." accent="#ff4f9a" maxPlayers={8} defaultMaxPlayers={4} onBack="/" />;
  if (!gs) return <View style={styles.loading}><ActivityIndicator color="#ff4f9a" size="large" /></View>;
  const meta = ROUND_META[gs.roundType]; const leader = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0];
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}>
    <View style={styles.header}><View><Text style={[styles.kicker, { color: meta.color }]}>ARENA · RONDA {Math.min(gs.round, 9)}/9</Text><Text style={[styles.title, { color: colors.foreground }]}>Playus de barrio</Text></View><Pressable onPress={leave} style={styles.out}><Text style={styles.outText}>SALIR</Text></Pressable></View>
    <View style={[styles.challenge, { borderColor: meta.color, backgroundColor: `${meta.color}18` }]}><Text style={[styles.challengeTitle, { color: meta.color }]}>{meta.title}</Text><Text style={styles.challengeHint}>{meta.hint}</Text><View style={[styles.flash, { backgroundColor: meta.color }]} /><Pressable onPress={() => score(gs.roundType === "memoria" ? 2 : 1)} style={[styles.playButton, { backgroundColor: meta.color }]}><Text style={styles.playText}>{gs.roundType === "bomba" ? "PASAR BOMBA" : "¡TOCAR!"}</Text></Pressable></View>
    <View style={styles.scoreCard}><View style={styles.scoreHeader}><Text style={styles.section}>MARCADOR EN DIRECTO</Text><Text style={styles.leader}>LÍDER · {room.players.find((p) => p.id === leader)?.name ?? "—"}</Text></View>{gs.playerOrder.map((id, index) => <View key={id} style={styles.scoreRow}><Text style={[styles.rank, { color: index === 0 ? "#ffcf62" : "#7d98aa" }]}>{index + 1}</Text><Text style={styles.player}>{room.players.find((p) => p.id === id)?.name ?? "Jugador"}</Text><Text style={[styles.points, { color: meta.color }]}>{gs.scores[id] ?? 0}</Text></View>)}</View>
    {gs.phase === "ended" && <Text style={styles.winner}>GANADOR · {room.players.find((p) => p.id === gs.winnerId)?.name ?? "Jugador"}</Text>}{error && <Text style={styles.error}>{error}</Text>}
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0014" }, container: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, gap: 16 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.7 }, title: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 5 }, out: { borderWidth: 1, borderColor: "#3d2b55", borderRadius: 9, padding: 10 }, outText: { color: "#9a8fb8", fontFamily: "Inter_700Bold", fontSize: 11 }, challenge: { borderWidth: 2, borderRadius: 20, padding: 22, alignItems: "center", gap: 7 }, challengeTitle: { fontFamily: "Inter_700Bold", fontSize: 23, textAlign: "center" }, challengeHint: { color: "#c9bddb", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }, flash: { width: 88, height: 88, borderRadius: 44, marginVertical: 12, shadowColor: "#fff", shadowOpacity: .65, shadowRadius: 25 }, playButton: { minHeight: 52, borderRadius: 10, minWidth: 190, alignItems: "center", justifyContent: "center" }, playText: { color: "#14091c", fontFamily: "Inter_700Bold", letterSpacing: 1.2 }, scoreCard: { borderRadius: 15, borderWidth: 1, borderColor: "#2a1450", backgroundColor: "#15042a", padding: 14, gap: 8 }, scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, section: { color: "#f5f5ff", fontFamily: "Inter_700Bold", fontSize: 13 }, leader: { color: "#ffcf62", fontFamily: "Inter_700Bold", fontSize: 9 }, scoreRow: { minHeight: 43, borderRadius: 8, backgroundColor: "#1a0833", flexDirection: "row", alignItems: "center", paddingHorizontal: 9, gap: 10 }, rank: { width: 18, fontFamily: "Inter_700Bold", textAlign: "center" }, player: { color: "#f5f5ff", fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }, points: { fontFamily: "Inter_700Bold", fontSize: 18 }, winner: { color: "#64e6a5", fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 1.5 }, error: { color: "#ff2d6f", fontFamily: "Inter_600SemiBold", textAlign: "center" },
});