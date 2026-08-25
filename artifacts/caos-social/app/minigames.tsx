import { useArenaAction, useGetBarajaRoom, useLeaveBarajaRoom, type ArenaState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

type Mode = string;
type Filter = "Todos" | "Reflejos" | "Memoria" | "Rapidez" | "Precisión";
const CATALOG: Array<{ id: Mode; icon: string; title: string; hint: string; color: string; filter: Filter }> = [
  { id: "tap", icon: "🥊", title: "Tap Battle", hint: "Machaca la pantalla durante 5 segundos", color: "#FF4F9A", filter: "Rapidez" },
  { id: "reflejos", icon: "🔴🟢", title: "Reflejos al Flash", hint: "Toca inmediatamente cuando cambie a verde", color: "#64E6A5", filter: "Reflejos" },
  { id: "diana", icon: "🎯", title: "Diana Rápida", hint: "Toca objetivos durante 10 segundos", color: "#39FF14", filter: "Precisión" },
  { id: "fantasma", icon: "👻", title: "Toque Fantasma", hint: "Toca solo cuando no parpadee", color: "#8C7BA5", filter: "Reflejos" },
  { id: "tira", icon: "🤼", title: "Tira y Afloja Digital", hint: "Pulsa para llevar la cuerda a tu lado", color: "#FF4F9A", filter: "Rapidez" },
  { id: "bomba", icon: "💣", title: "Bomba Caliente", hint: "Pásala antes de que llegue a cero", color: "#FFB84D", filter: "Rapidez" },
  { id: "cable", icon: "✂️", title: "Corte de Cable", hint: "Elige el cable correcto antes del rival", color: "#FF7A45", filter: "Precisión" },
  { id: "gatillo", icon: "🤠", title: "Gatillo Rápido", hint: "Duelo del oeste: dispara primero", color: "#FFB800", filter: "Reflejos" },
  { id: "inverso", icon: "🔁", title: "Toque Inverso", hint: "Pulsa el botón contrario al iluminado", color: "#55D6FF", filter: "Reflejos" },
  { id: "apagon", icon: "💡", title: "Apagón Rápido", hint: "Apaga 10 luces a toda velocidad", color: "#FFCF62", filter: "Rapidez" },
  { id: "cronometro", icon: "⏱️", title: "Parar el Crono", hint: "Detén el contador lo más cerca de 5.000 s", color: "#55D6FF", filter: "Precisión" },
  { id: "barra", icon: "📊", title: "Barra de Parada", hint: "Frena la barra justo en la zona verde", color: "#64E6A5", filter: "Precisión" },
  { id: "balanza", icon: "⚖️", title: "Balanza de Peso", hint: "Equilibra los dos lados con toques", color: "#B026FF", filter: "Precisión" },
  { id: "diana-movil", icon: "🎯", title: "Diana en Movimiento", hint: "Acierta al objetivo que no deja de moverse", color: "#39FF14", filter: "Precisión" },
  { id: "vaso", icon: "🥤", title: "Llenar el Vaso", hint: "Suelta antes de que rebose", color: "#55D6FF", filter: "Precisión" },
  { id: "dedo", icon: "☝️", title: "Mantener el Dedo", hint: "No salgas del círculo que se mueve", color: "#FF6BCE", filter: "Precisión" },
  { id: "deslizamiento", icon: "↔️", title: "Deslizamiento Perfecto", hint: "Arrastra justo hasta la línea", color: "#64E6A5", filter: "Precisión" },
  { id: "stroop", icon: "🎨", title: "Color Maldito", hint: "Comprueba si el nombre coincide con la tinta", color: "#FF6BCE", filter: "Memoria" },
  { id: "memoria", icon: "🧠", title: "Secuencia Flash", hint: "Repite la secuencia de colores", color: "#B026FF", filter: "Memoria" },
  { id: "calculo", icon: "🧮", title: "Cálculo Relámpago", hint: "Resuelve antes de 4 segundos", color: "#FFB800", filter: "Rapidez" },
  { id: "impostor", icon: "🔢", title: "Impostor Numérico", hint: "Encuentra el número intruso entre 15", color: "#FF7A45", filter: "Memoria" },
  { id: "mayor", icon: "⬆️", title: "Mayor o Menor", hint: "Compara dos operaciones en 2 segundos", color: "#55D6FF", filter: "Rapidez" },
  { id: "contar", icon: "🔎", title: "Contar Elementos", hint: "Cuenta los iconos antes que los rivales", color: "#FFCF62", filter: "Memoria" },
  { id: "parejas", icon: "🃏", title: "Parejas Exprés", hint: "Encuentra la única pareja idéntica", color: "#B026FF", filter: "Memoria" },
  { id: "anagrama", icon: "🔤", title: "Anagrama Relámpago", hint: "Ordena las 4 letras a toda velocidad", color: "#FF4F9A", filter: "Rapidez" },
  { id: "orden", icon: "1️⃣", title: "Orden Ascendente", hint: "Toca del 1 al 9 sin equivocarte", color: "#64E6A5", filter: "Rapidez" },
  { id: "simbolo", icon: "🦄", title: "Símbolo Oculto", hint: "Encuentra el emoji distinto", color: "#FF6BCE", filter: "Memoria" },
  { id: "ruleta", icon: "🎰", title: "Ruleta Rusa de Suerte", hint: "Una de seis casillas explota", color: "#FF7A45", filter: "Precisión" },
  { id: "posicion", icon: "💎", title: "Memoria de Posición", hint: "Recuerda dónde estaban las tres gemas", color: "#B026FF", filter: "Memoria" },
  { id: "ppt", icon: "✊", title: "Piedra, Papel o Tijera", hint: "Elige tu jugada antes del rival", color: "#FFB800", filter: "Rapidez" },
];

export default function MinigamesScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null); const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<Mode>("tap"); const [query, setQuery] = useState(""); const [filter, setFilter] = useState<Filter>("Todos"); const [now, setNow] = useState(Date.now()); const [error, setError] = useState("");
  useEffect(() => { loadBarajaSession().then((s) => { setSession(s); setHydrated(true); }); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, []);
  const { data: room, isLoading } = useGetBarajaRoom(session?.roomCode ?? "", session?.playerId ?? "");
  const action = useArenaAction(); const leave = useLeaveBarajaRoom();
  if (!hydrated || (session && isLoading)) return <View style={styles.loading}><ActivityIndicator color="#FF4F9A" size="large" /></View>;
  if (!session || !room) return <BoardRoomLobby kind="arena" title="Arena de Minijuegos" subtitle="Elige un minijuego y compite en tiempo real." accent="#FF4F9A" maxPlayers={8} defaultMaxPlayers={4} onBack="/" />;
  const gs = room.gameState?.type === "arena" ? room.gameState : null;
  if (!gs) return <View style={styles.loading}><ActivityIndicator color="#FF4F9A" /></View>;
  const me = session.playerId; const meta = CATALOG.find((m) => m.id === selected) ?? CATALOG[0];
  const visibleModes = CATALOG.filter((m) => (filter === "Todos" || m.filter === filter) && `${m.title} ${m.hint}`.toLowerCase().includes(query.toLowerCase()));
  const remaining = Math.max(0, gs.roundDeadline - now);
  const send = async (kind: Parameters<typeof action.mutateAsync>[0]["action"], points = 1, value?: number) => {
    try {
      setError("");
      if (Platform.OS === "web" && typeof navigator !== "undefined") navigator.vibrate?.([25]);
      await action.mutateAsync({ code: room.code, playerId: me, action: kind, points, value });
    } catch (e) {
      if (Platform.OS === "web" && typeof navigator !== "undefined") navigator.vibrate?.([25, 40, 25]);
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    }
  };
  const quit = async () => { await leave.mutateAsync({ code: room.code, playerId: me }); await clearBarajaSession(); router.replace("/"); };
  const ordered = [...gs.playerOrder].sort((a, b) => (gs.scores[b] ?? 0) - (gs.scores[a] ?? 0));
  const activeRound = gs.roundType;
  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <View style={[styles.catalog, { paddingTop: insets.top + 12 }]}><TextInput value={query} onChangeText={setQuery} placeholder="Buscar reto..." placeholderTextColor="#806A94" style={styles.search} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(["Todos", "Reflejos", "Memoria", "Rapidez", "Precisión"] as Filter[]).map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={styles.filterText}>{item}</Text></Pressable>)}</ScrollView><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selector}>{visibleModes.map((mode) => <Pressable key={mode.id} onPress={() => setSelected(mode.id)} style={[styles.modeTab, selected === mode.id && { borderColor: mode.color, backgroundColor: `${mode.color}20` }]}><Text style={styles.modeIcon}>{mode.icon}</Text><Text style={[styles.modeName, selected === mode.id && { color: mode.color }]}>{mode.title}</Text></Pressable>)}</ScrollView></View>
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
        {!["tap", "cronometro", "reflejos", "stroop", "memoria", "diana", "calculo", "impostor"].includes(selected) && <><Text style={styles.question}>¡Reto activo!</Text><Text style={styles.prompt}>Pulsa para registrar tu intento. El marcador del grupo se actualiza en directo.</Text><Pressable onPress={() => void send("answer", 2)} style={[styles.bigButton, { backgroundColor: meta.color }]}><Text style={styles.bigText}>JUGAR · +2 PUNTOS</Text></Pressable></>}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.scoreCard}><Text style={styles.scoreTitle}>MARCADOR EN DIRECTO</Text>{ordered.map((id, i) => <View key={id} style={styles.scoreRow}><Text style={styles.rank}>{i + 1}</Text><Text style={styles.player}>{room.players.find((p) => p.id === id)?.name ?? "Jugador"}{id === me ? " (tú)" : ""}</Text><Text style={[styles.points, { color: meta.color }]}>{gs.scores[id] ?? 0}</Text></View>)}</View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0E14" }, catalog: { gap: 8 }, search: { marginHorizontal: 16, height: 42, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", color: "#FFF", paddingHorizontal: 14, fontFamily: "Inter_400Regular" }, filters: { gap: 8, paddingHorizontal: 16 }, filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }, filterActive: { backgroundColor: "#06B6D4", borderColor: "#06B6D4" }, filterText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 11 }, selector: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 }, modeTab: { width: 112, minHeight: 78, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", padding: 8, alignItems: "center", justifyContent: "center", gap: 4 }, modeIcon: { fontSize: 24 }, modeName: { color: "#94A3B8", fontFamily: "Inter_700Bold", fontSize: 10, textAlign: "center" }, container: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 16, gap: 16 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 }, title: { fontFamily: "Inter_700Bold", fontSize: 28 }, exit: { borderWidth: 1, borderColor: "#FB4B72", borderRadius: 9, padding: 10 }, exitText: { color: "#FB4B72", fontFamily: "Inter_700Bold", fontSize: 11 }, challenge: { minHeight: 330, borderWidth: 1, borderRadius: 20, padding: 20, alignItems: "center", justifyContent: "center", gap: 9, position: "relative" }, icon: { fontSize: 42 }, challengeTitle: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" }, hint: { color: "#94A3B8", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }, timer: { fontFamily: "Inter_700Bold", fontSize: 30, marginVertical: 4 }, bigButton: { minWidth: 220, minHeight: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 14 }, bigText: { color: "#0B0E14", fontFamily: "Inter_700Bold", letterSpacing: 1 }, flash: { width: 150, height: 150, borderRadius: 75, borderWidth: 3, alignItems: "center", justifyContent: "center" }, options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }, option: { minWidth: 110, padding: 14, borderWidth: 2, borderRadius: 10, alignItems: "center" }, colorButton: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center" }, stroop: { fontFamily: "Inter_700Bold", fontSize: 42 }, question: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center" }, prompt: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 21, lineHeight: 29, textAlign: "center", maxWidth: 560 }, target: { position: "absolute", marginLeft: -20, marginTop: -20 }, numberGrid: { width: 280, flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }, number: { width: 48, height: 48, borderWidth: 2, borderRadius: 8, alignItems: "center", justifyContent: "center" }, numberText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 18 }, scoreCard: { borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", padding: 14, gap: 8 }, scoreTitle: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 13 }, scoreRow: { minHeight: 42, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 10 }, rank: { color: "#F59E0B", width: 20, fontFamily: "Inter_700Bold" }, player: { color: "#FFF", flex: 1, fontFamily: "Inter_500Medium" }, points: { fontFamily: "Inter_700Bold", fontSize: 19 }, error: { color: "#FB4B72", textAlign: "center", fontFamily: "Inter_600SemiBold" } });