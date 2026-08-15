import { useGetBarajaRoom, useLeaveBarajaRoom, useMonopolyAction } from "@workspace/api-client-react";
import type { MonopolyState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { clearBarajaSession, loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

const PROPERTY_COLORS: Record<string, string> = {
  brown: "#9b5b35", lightblue: "#76c7dd", pink: "#dd7098", orange: "#df803b",
  red: "#d64648", yellow: "#e2ba3d", green: "#55a17b", blue: "#4d72bd",
};

export default function MonopolyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadBarajaSession().then((value) => { setSession(value); setHydrated(true); }); }, []);
  const { data: room, isLoading } = useGetBarajaRoom(session?.roomCode ?? "", session?.playerId ?? "");
  const actionMut = useMonopolyAction();
  const leaveMut = useLeaveBarajaRoom();
  const gs = room?.gameState?.type === "monopoly" ? room.gameState as MonopolyState : null;
  const myId = session?.playerId ?? "";
  const isMyTurn = !!gs && gs.playerOrder[gs.currentIdx] === myId;
  async function action(action: "roll" | "buy" | "end-turn" | "jail") {
    if (!session) return;
    setError(null);
    try { await actionMut.mutateAsync({ code: session.roomCode, playerId: session.playerId, action }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function leave() {
    if (session) await leaveMut.mutateAsync({ code: session.roomCode, playerId: session.playerId });
    await clearBarajaSession(); router.replace("/");
  }
  if (!hydrated || (session && isLoading)) return <View style={styles.loading}><ActivityIndicator color="#55d6ff" size="large" /></View>;
  if (!session || !room) return <BoardRoomLobby kind="monopoly" title="Monopoly Social" subtitle="Compra calles, cobra alquileres y deja a tus amigos en bancarrota." accent="#55d6ff" maxPlayers={6} defaultMaxPlayers={4} onBack="/" />;
  if (!gs) return <View style={styles.loading}><ActivityIndicator color="#55d6ff" size="large" /></View>;
  const current = room.players.find((player) => player.id === gs.playerOrder[gs.currentIdx])?.name;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.header}><View><Text style={styles.kicker}>MONOPOLY SOCIAL · {room.code}</Text><Text style={[styles.title, { color: colors.foreground }]}>La ciudad es tuya</Text></View><Pressable onPress={leave} style={styles.out}><Text style={styles.outText}>SALIR</Text></Pressable></View>
        <View style={styles.board}>
          <View style={styles.boardCenter}><Text style={styles.centerTitle}>CAOS CITY</Text><Text style={styles.centerSub}>COMPRA · COBRA · CRECE</Text><Text style={styles.centerDice}>{gs.dice ? `${gs.dice[0]} + ${gs.dice[1]}` : "—"}</Text></View>
          {gs.properties.map((property) => {
            const owner = room.players.find((player) => player.id === property.ownerId);
            const occupied = gs.playerOrder.filter((id) => gs.positions[id] === property.id);
            return <View key={property.id} style={[styles.property, { borderColor: PROPERTY_COLORS[property.color] }]}>
              <View style={[styles.propertyBand, { backgroundColor: PROPERTY_COLORS[property.color] }]} />
              <Text style={styles.propertyId}>{property.id}</Text><Text style={styles.propertyName}>{property.name}</Text><Text style={styles.propertyPrice}>{property.price}€</Text>
              {owner && <Text style={styles.owner}>● {owner.name}</Text>}
              <View style={styles.tokens}>{occupied.map((id) => <View key={id} style={[styles.token, { backgroundColor: room.players.find((p) => p.id === id)?.avatar ? "#ffdf6b" : "#fff" }]} />)}</View>
            </View>;
          })}
        </View>
        <View style={styles.turnCard}><Text style={[styles.turn, { color: isMyTurn ? "#55d6ff" : colors.mutedForeground }]}>{isMyTurn ? "TU TURNO" : `Turno de ${current ?? "otro jugador"}`}</Text><Text style={styles.move}>{gs.lastMove}</Text></View>
        <View style={styles.players}>{gs.playerOrder.map((id) => { const player = room.players.find((item) => item.id === id); return <View key={id} style={[styles.playerRow, { borderColor: id === myId ? "#55d6ff" : colors.border }]}><Text style={styles.avatar}>{player?.avatar ?? "●"}</Text><View style={{ flex: 1 }}><Text style={styles.playerName}>{player?.name ?? "Jugador"}</Text><Text style={styles.playerMeta}>Casilla {gs.positions[id] ?? 0} · {gs.balances[id] ?? 0}€</Text></View>{gs.inJail[id] ? <Text style={styles.jail}>CÁRCEL</Text> : null}</View>; })}</View>
        {error && <Text style={styles.error}>{error}</Text>}
        {isMyTurn && <View style={styles.actions}>
          {!gs.dice && !gs.inJail[myId] && <Pressable onPress={() => action("roll")} style={[styles.action, { backgroundColor: "#55d6ff" }]}><Text style={styles.actionText}>TIRAR DADOS</Text></Pressable>}
          {gs.inJail[myId] ? <Pressable onPress={() => action("jail")} style={styles.action}><Text style={styles.actionText}>PAGAR 50€ · SALIR</Text></Pressable> : null}
          {gs.dice && gs.properties.find((property) => property.id === gs.positions[myId])?.ownerId === null && <Pressable onPress={() => action("buy")} style={[styles.action, { borderColor: "#55d6ff" }]}><Text style={[styles.actionText, { color: "#55d6ff" }]}>COMPRAR CALLE</Text></Pressable>}
          {gs.dice && <Pressable onPress={() => action("end-turn")} style={styles.action}><Text style={styles.actionText}>TERMINAR TURNO</Text></Pressable>}
        </View>}
        <Text style={styles.log}>{room.log.slice(-4).reverse().join("\n")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, loading: { flex: 1, backgroundColor: "#07121f", alignItems: "center", justifyContent: "center" },
  container: { width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { color: "#55d6ff", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 }, title: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 5 }, out: { borderWidth: 1, borderColor: "#31475c", borderRadius: 9, padding: 10 }, outText: { color: "#9cb4c9", fontFamily: "Inter_700Bold", fontSize: 11 },
  board: { flexDirection: "row", flexWrap: "wrap", borderRadius: 20, borderWidth: 2, borderColor: "#2d5368", backgroundColor: "#d9c992", padding: 7, gap: 5, minHeight: 310 }, boardCenter: { position: "absolute", left: "31%", top: "27%", width: "38%", height: "45%", borderRadius: 18, backgroundColor: "#e8ddb0", borderWidth: 2, borderColor: "#aa8c45", alignItems: "center", justifyContent: "center", zIndex: 2 }, centerTitle: { color: "#172b3a", fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 2 }, centerSub: { color: "#7e6e43", fontFamily: "Inter_600SemiBold", fontSize: 8, marginTop: 5 }, centerDice: { color: "#172b3a", fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 12 },
  property: { width: "23.5%", minHeight: 102, backgroundColor: "#fff7dc", borderWidth: 2, borderRadius: 8, padding: 6, position: "relative" }, propertyBand: { height: 14, borderRadius: 4, marginBottom: 4 }, propertyId: { color: "#8d7547", fontSize: 8, fontFamily: "Inter_700Bold" }, propertyName: { color: "#172b3a", fontFamily: "Inter_700Bold", fontSize: 10, minHeight: 26 }, propertyPrice: { color: "#6c5d3f", fontSize: 10 }, owner: { color: "#236f6a", fontSize: 8, marginTop: 2 }, tokens: { flexDirection: "row", position: "absolute", right: 5, bottom: 5, gap: 2 }, token: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: "#263847" },
  turnCard: { borderRadius: 13, borderWidth: 1, borderColor: "#2d5368", backgroundColor: "#0e2636", padding: 14, alignItems: "center", gap: 5 }, turn: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 }, move: { color: "#b4d0df", fontFamily: "Inter_400Regular", textAlign: "center", fontSize: 12 }, players: { gap: 6 }, playerRow: { minHeight: 52, borderWidth: 1, borderRadius: 10, backgroundColor: "#0e1e2d", padding: 9, flexDirection: "row", alignItems: "center", gap: 8 }, avatar: { fontSize: 20, width: 26, textAlign: "center" }, playerName: { color: "#f5f8fb", fontFamily: "Inter_600SemiBold", fontSize: 13 }, playerMeta: { color: "#8ca8bb", fontSize: 10, marginTop: 2 }, jail: { color: "#ffb84d", fontFamily: "Inter_700Bold", fontSize: 9 }, actions: { gap: 8 }, action: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#4e6474", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, actionText: { color: "#dcebf3", fontFamily: "Inter_700Bold", letterSpacing: 1, fontSize: 11 }, error: { color: "#ff5e79", fontFamily: "Inter_600SemiBold", textAlign: "center" }, log: { color: "#7d98aa", fontSize: 10, lineHeight: 16, borderWidth: 1, borderColor: "#213c4d", borderRadius: 10, padding: 10 },
});