import { useArenaAction, useGetBarajaRoom, useLeaveBarajaRoom, type ArenaState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

type Mode = ArenaState["roundType"] | "impostor";
const MODES: Array<{ id: Mode; icon: string; title: string; hint: string; color: string }> = [
  { id: "tap", icon: "🥊", title: "Tap Battle", hint: "Machaca la pantalla durante 5 segundos", color: "#FF4F9A" },
  { id: "cronometro", icon: "⏱️", title: "Parar el Crono Exacto", hint: "Detén el contador lo más cerca de 5.000 s", color: "#55D6FF" },
  { id: "reflejos", icon: "🔴🟢", title: "Reflejos al Flash", hint: "Toca inmediatamente cuando cambie a verde", color: "#64E6A5" },
  { id: "stroop", icon: "🎨", title: "Color Maldito", hint: "Comprueba si el nombre coincide con la tinta", color: "#FF6BCE" },
  { id: "memoria", icon: "🧠", title: "Secuencia Flash", hint: "Repite la secuencia de colores", color: "#B026FF" },
  { id: "diana", icon: "🎯", title: "Diana Rápida", hint: "Toca objetivos durante 10 segundos", color: "#39FF14" },
  { id: "calculo", icon: "🧮", title: "Cálculo Relámpago", hint: "Resuelve antes de 4 segundos", color: "#FFB800" },
  { id: "impostor", icon: "🔢", title: "Impostor Numérico", hint: "Encuentra el número intruso entre 15", color: "#FF7A45" },
];

export default function MinigamesScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null); const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<Mode>("tap"); const [now, setNow] = useState(Date.now()); const [error, setError] = useState("");
  useEffect(() => { loadBarajaSession().then((s) => { setSession(s); setHydrated(true); }); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, []);
  const { data: room, isLoading } = useGetBarajaRoom(session?.roomCode ?? "", session?.playerId ?? "");
  const action = useArenaAction(); const leave = useLeaveBarajaRoom();
  if (!hydrated || (session && isLoading)) return <View style={styles.loading}><ActivityIndicator color="#FF4F9A" size="large" /></View>;
  if (!session || !room) return <BoardRoomLobby kind="arena" title="Arena de Minijuegos" subtitle="Elige un minijuego y compite en tiempo real." accent="#FF4F9A" maxPlayers={8} defaultMaxPlayers={4} onBack="/" />;
  const gs = room.gameState?.type === "arena" ? room.gameState : null;
  if (!gs) return <View style={styles.loading}><ActivityIndicator color="#FF4F9A" /></View>;
  const me = session.playerId; const meta = MODES.find((m) => m.id === selected) ?? MODES[0];
  const remaining = Math.max(0, gs.roundDeadline - now);
  const send = async (kind: Parameters<typeof action.mutateAsync>[0]["action"], points = 1, value?: number) => { try { setError(""); await action.mutateAsync({ code: room.code, playerId: me, action: kind, points, value }); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar"); } };
  const quit = async () => { await leave.mutateAsync({ code: room.code, playerId: me }); await clearBarajaSession(); router.replace("/"); };
  const ordered = [...gs.playerOrder].sort((a, b) => (gs.scores[b] ?? 0) - (gs.scores[a] ?? 0));
  const activeRound = gs.roundType;
  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.selector, { paddingTop: insets.top + 12 }]}>
      {MODES.map((mode) => <Pressable key={mode.id} onPress={() => setSelected(mode.id)} style={[styles.modeTab, selected === mode.id && { borderColor: mode.color, backgroundColor: `${mode.color}20` }]}><Text style={styles.modeIcon}>{mode.icon}</Text><Text style={[styles.modeName, selected === mode.id && { color: mode.color }]}>{mode.title}</Text></Pressable>)}
    </ScrollView>
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.header}><View><Text style={[styles.kicker, { color: meta.color }]}>ARENA · {selected.toUpperCase()}</Text><Text style={[styles.title, { color: colors.foreground }]}>⚡ MINIGAMES</Text></View><Pressable onPress={quit} style={styles.exit}><Text style={styles.exitText}>SALIR</Text></Pressable></View>
      <View style={[styles.challenge, { borderColor: meta.color, backgroundColor: `${meta.color}16` }]}><Text style={styles.icon}>{meta.icon}</Text><Text style={[styles.challengeTitle, { color: meta.color }]}>{meta.title}</Text><Text style={styles.hint}>{meta.hint}</Text><Text style={[styles.timer, { color: meta.color }]}>{(remaining / 1000).toFixed(1)}s</Text>
        {selected === "tap" && <Pressable onPress={() => void send("tap")} style={[styles.bigButton, { backgroundColor: meta.color }]}><Text style={styles.bigText}>¡TOCA! · {gs.tapCounts?.[me] ?? 0}</Text></Pressable>}
        {selected === "cronometro" && <Pressable onPress={() => void send("stopwatch")} style={[styles.bigButton, { backgroundColor: meta.color }]}><Text style={styles.bigText}>PARAR EN 5.000</Text></Pressable>}
        {selected === "reflejos" && <Pressable onPress={() => void send("tap", 3)} style={[styles.flash, { backgroundColor: activeRound === "reflejos" && gs.flashAt !== null && now >= gs.flashAt ? "#39FF14" : "#8B193B", borderColor: meta.color }]}><Text style={styles.bigText}>{activeRound === "reflejos" && gs.flashAt !== null && now >= gs.flashAt ? "¡YA!" : "ESPERA"}</Text></Pressable>}
        {selected === "stroop" && <><Text style={[styles.stroop, { color: ["#FF3434", "#4FA8FF", "#39FF14", "#FFD43B"][gs.stroopInk ?? 0] }]}>{gs.stroopWord ?? "ROJO"}</Text><View style={styles.options}>{["COINCIDE", "NO COINCIDE"].map((x, i) => <Pressable key={x} onPress={() => void send("stroop", i === 0 ? 3 : 1)} style={[styles.option, { borderColor: meta.color }]}><Text style={{ color: meta.color, fontFamily: "Inter_700Bold" }}>{x}</Text></Pressable>)}</View></>}
        {selected === "memoria" && <View style={styles.options}>{[0, 1, 2, 3].map((v) => <Pressable key={v} onPress={() => void send("memory-input", 4, v)} style={[styles.colorButton, { backgroundColor: ["#FF4F9A", "#55D6FF", "#39FF14", "#FFB800"][v] }]}><Text style={styles.bigText}>{v + 1}</Text></Pressable>)}</View>}
        {selected === "diana" && <Pressable onPress={() => void send("target", 2)} style={[styles.target, { left: `${gs.targetPosition?.x ?? 50}%`, top: `${gs.targetPosition?.y ?? 50}%` }]}><Text style={{ fontSize: 30 }}>🎯</Text></Pressable>}
        {selected === "calculo" && <><Text style={styles.question}>{gs.mathQuestion ?? "3 + 4 × 2"} = ?</Text><View style={styles.options}>{(gs.mathOptions ?? [11, 14, 10]).map((v) => <Pressable key={v} onPress={() => void send("answer", v === 11 ? 3 : 1)} style={[styles.option, { borderColor: meta.color }]}><Text style={{ color: meta.color, fontFamily: "Inter_700Bold", fontSize: 20 }}>{v}</Text></Pressable>)}</View></>}
        {selected === "impostor" && <><Text style={styles.question}>Encuentra el intruso</Text><View style={styles.numberGrid}>{[12, 12, 12, 12, 12, 12, 17, 12, 12, 12, 12, 12, 12, 12, 12].map((n, i) => <Pressable key={i} onPress={() => void send("answer", n === 17 ? 4 : 1)} style={[styles.number, { borderColor: meta.color }]}><Text style={styles.numberText}>{n}</Text></Pressable>)}</View></>}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.scoreCard}><Text style={styles.scoreTitle}>MARCADOR EN DIRECTO</Text>{ordered.map((id, i) => <View key={id} style={styles.scoreRow}><Text style={styles.rank}>{i + 1}</Text><Text style={styles.player}>{room.players.find((p) => p.id === id)?.name ?? "Jugador"}{id === me ? " (tú)" : ""}</Text><Text style={[styles.points, { color: meta.color }]}>{gs.scores[id] ?? 0}</Text></View>)}</View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0A0014" }, selector: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 }, modeTab: { width: 112, minHeight: 78, borderRadius: 12, borderWidth: 1, borderColor: "#3A2055", backgroundColor: "#15042A", padding: 8, alignItems: "center", justifyContent: "center", gap: 4 }, modeIcon: { fontSize: 24 }, modeName: { color: "#C9BDDB", fontFamily: "Inter_700Bold", fontSize: 10, textAlign: "center" }, container: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 16, gap: 16 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 }, title: { fontFamily: "Inter_700Bold", fontSize: 28 }, exit: { borderWidth: 1, borderColor: "#FF2D6F", borderRadius: 9, padding: 10 }, exitText: { color: "#FF2D6F", fontFamily: "Inter_700Bold", fontSize: 11 }, challenge: { minHeight: 330, borderWidth: 2, borderRadius: 20, padding: 20, alignItems: "center", justifyContent: "center", gap: 9, position: "relative" }, icon: { fontSize: 42 }, challengeTitle: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" }, hint: { color: "#C9BDDB", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }, timer: { fontFamily: "Inter_700Bold", fontSize: 30, marginVertical: 4 }, bigButton: { minWidth: 220, minHeight: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 14 }, bigText: { color: "#16091E", fontFamily: "Inter_700Bold", letterSpacing: 1 }, flash: { width: 150, height: 150, borderRadius: 75, borderWidth: 3, alignItems: "center", justifyContent: "center" }, options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }, option: { minWidth: 110, padding: 14, borderWidth: 2, borderRadius: 10, alignItems: "center" }, colorButton: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center" }, stroop: { fontFamily: "Inter_700Bold", fontSize: 42 }, question: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center" }, target: { position: "absolute", marginLeft: -20, marginTop: -20 }, numberGrid: { width: 280, flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }, number: { width: 48, height: 48, borderWidth: 2, borderRadius: 8, alignItems: "center", justifyContent: "center" }, numberText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 18 }, scoreCard: { borderRadius: 15, borderWidth: 1, borderColor: "#2A1450", backgroundColor: "#15042A", padding: 14, gap: 8 }, scoreTitle: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 13 }, scoreRow: { minHeight: 42, borderRadius: 8, backgroundColor: "#1A0833", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 10 }, rank: { color: "#FFCF62", width: 20, fontFamily: "Inter_700Bold" }, player: { color: "#FFF", flex: 1, fontFamily: "Inter_500Medium" }, points: { fontFamily: "Inter_700Bold", fontSize: 19 }, error: { color: "#FF2D6F", textAlign: "center", fontFamily: "Inter_600SemiBold" } });