import { useGetBarajaRoom, useLeaveBarajaRoom, useMonopolyAction } from "@workspace/api-client-react";
import type { MonopolyState } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
   async function action(action: "roll" | "buy" | "end-turn" | "jail" | "draw-luck" | "draw-community") {
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
         <MonopolyBoard state={gs} players={room.players} />
        <View style={styles.turnCard}><Text style={[styles.turn, { color: isMyTurn ? "#55d6ff" : colors.mutedForeground }]}>{isMyTurn ? "TU TURNO" : `Turno de ${current ?? "otro jugador"}`}</Text><Text style={styles.move}>{gs.lastMove}</Text></View>
        <View style={styles.players}>{gs.playerOrder.map((id) => { const player = room.players.find((item) => item.id === id); return <View key={id} style={[styles.playerRow, { borderColor: id === myId ? "#55d6ff" : colors.border }]}><Text style={styles.avatar}>{player?.avatar ?? "●"}</Text><View style={{ flex: 1 }}><Text style={styles.playerName}>{player?.name ?? "Jugador"}</Text><Text style={styles.playerMeta}>Casilla {gs.positions[id] ?? 0} · {gs.balances[id] ?? 0}€</Text></View>{gs.inJail[id] ? <Text style={styles.jail}>CÁRCEL</Text> : null}</View>; })}</View>
        {error && <Text style={styles.error}>{error}</Text>}
        {isMyTurn && <View style={styles.actions}>
          {!gs.dice && !gs.inJail[myId] && <Pressable onPress={() => action("roll")} style={[styles.action, { backgroundColor: "#55d6ff" }]}><Text style={styles.actionText}>TIRAR DADOS</Text></Pressable>}
          {gs.inJail[myId] ? <Pressable onPress={() => action("jail")} style={styles.action}><Text style={styles.actionText}>PAGAR 50€ · SALIR</Text></Pressable> : null}
           {gs.dice && gs.spaces.find((space) => space.id === gs.positions[myId])?.ownerId === null && ["property", "railroad", "utility"].includes(gs.spaces.find((space) => space.id === gs.positions[myId])?.type ?? "") && <Pressable onPress={() => action("buy")} style={[styles.action, { borderColor: "#55d6ff" }]}><Text style={[styles.actionText, { color: "#55d6ff" }]}>COMPRAR CASILLA</Text></Pressable>}
           {gs.canDraw === "luck" && <Pressable onPress={() => action("draw-luck")} style={[styles.action, { backgroundColor: "#f5b94c" }]}><Text style={styles.actionText}>ABRIR SUERTE</Text></Pressable>}
           {gs.canDraw === "community" && <Pressable onPress={() => action("draw-community")} style={[styles.action, { backgroundColor: "#67c5d4" }]}><Text style={styles.actionText}>ABRIR CAJA DE COMUNIDAD</Text></Pressable>}
          {gs.dice && <Pressable onPress={() => action("end-turn")} style={styles.action}><Text style={styles.actionText}>TERMINAR TURNO</Text></Pressable>}
        </View>}
         <Modal visible={!!gs.cardModal} transparent animationType="fade" onRequestClose={() => undefined}>
           <View style={styles.modalBackdrop}>
             <View style={styles.cardModal}>
               <Text style={styles.modalKicker}>{gs.cardModal?.deck === "luck" ? "SUERTE" : "CAJA DE COMUNIDAD"}</Text>
               <Text style={styles.modalTitle}>{gs.cardModal?.title}</Text>
               <Text style={styles.modalText}>{gs.cardModal?.text}</Text>
               <Pressable onPress={() => action("end-turn")} style={[styles.action, { backgroundColor: "#55d6ff", width: "100%" }]}>
                 <Text style={styles.actionText}>CONTINUAR</Text>
               </Pressable>
             </View>
           </View>
         </Modal>
        <Text style={styles.log}>{room.log.slice(-4).reverse().join("\n")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, loading: { flex: 1, backgroundColor: "#07121f", alignItems: "center", justifyContent: "center" },
  container: { width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { color: "#55d6ff", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 }, title: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 5 }, out: { borderWidth: 1, borderColor: "#31475c", borderRadius: 9, padding: 10 }, outText: { color: "#9cb4c9", fontFamily: "Inter_700Bold", fontSize: 11 },
  board: { width: "100%", aspectRatio: 1, borderRadius: 20, borderWidth: 2, borderColor: "#2d5368", overflow: "hidden", position: "relative", backgroundColor: "#e9d9a8" }, boardImage: { ...StyleSheet.absoluteFillObject }, boardCenter: { position: "absolute", left: "18%", top: "18%", width: "64%", height: "64%", alignItems: "center", justifyContent: "center" }, centerTitle: { color: "#5e4d30", fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 2 }, centerSub: { color: "#8f7647", fontFamily: "Inter_600SemiBold", fontSize: 8, marginTop: 5 }, centerDice: { color: "#5e4d30", fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 12 },
  space: { position: "absolute", width: "14%", height: "14%", marginLeft: "-7%", marginTop: "-7%", alignItems: "center", justifyContent: "center", padding: 2 }, spaceLabel: { color: "#263847", fontFamily: "Inter_700Bold", fontSize: 6, textAlign: "center" }, spacePrice: { color: "#6c5d3f", fontFamily: "Inter_600SemiBold", fontSize: 6 }, spaceOwner: { color: "#236f6a", fontFamily: "Inter_700Bold", fontSize: 5, textAlign: "center" }, tokens: { flexDirection: "row", gap: 2, position: "absolute", bottom: -5 }, token: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: "#fff" },
  turnCard: { borderRadius: 13, borderWidth: 1, borderColor: "#2d5368", backgroundColor: "#0e2636", padding: 14, alignItems: "center", gap: 5 }, turn: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 }, move: { color: "#b4d0df", fontFamily: "Inter_400Regular", textAlign: "center", fontSize: 12 }, players: { gap: 6 }, playerRow: { minHeight: 52, borderWidth: 1, borderRadius: 10, backgroundColor: "#0e1e2d", padding: 9, flexDirection: "row", alignItems: "center", gap: 8 }, avatar: { fontSize: 20, width: 26, textAlign: "center" }, playerName: { color: "#f5f8fb", fontFamily: "Inter_600SemiBold", fontSize: 13 }, playerMeta: { color: "#8ca8bb", fontSize: 10, marginTop: 2 }, jail: { color: "#ffb84d", fontFamily: "Inter_700Bold", fontSize: 9 }, actions: { gap: 8 }, action: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#4e6474", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, actionText: { color: "#dcebf3", fontFamily: "Inter_700Bold", letterSpacing: 1, fontSize: 11 }, error: { color: "#ff5e79", fontFamily: "Inter_600SemiBold", textAlign: "center" }, log: { color: "#7d98aa", fontSize: 10, lineHeight: 16, borderWidth: 1, borderColor: "#213c4d", borderRadius: 10, padding: 10 }, modalBackdrop: { flex: 1, backgroundColor: "#07121fcc", alignItems: "center", justifyContent: "center", padding: 24 }, cardModal: { width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 2, borderColor: "#55d6ff", backgroundColor: "#102638", padding: 24, alignItems: "center", gap: 10 }, modalKicker: { color: "#55d6ff", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 }, modalTitle: { color: "#f5f8fb", fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" }, modalText: { color: "#c9dce8", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 8 },
});

function MonopolyBoard({ state, players }: { state: MonopolyState; players: Array<{ id: string; name: string; avatar: string }> }) {
  return (
    <View style={styles.board}>
      <Image source={{ uri: "/assets/monopoly-board-real.png" }} resizeMode="cover" style={styles.boardImage} />
      <View style={styles.boardCenter}>
        <Text style={styles.centerTitle}>CAOS CITY</Text>
        <Text style={styles.centerSub}>COMPRA · COBRA · CRECE</Text>
        <Text style={styles.centerDice}>{state.dice ? `${state.dice[0]} + ${state.dice[1]}` : "—"}</Text>
      </View>
      {state.spaces.map((space) => {
        const point = monopolySpacePoint(space.id);
        const owner = players.find((player) => player.id === space.ownerId);
        const occupied = state.playerOrder.filter((id) => state.positions[id] === space.id);
        return (
          <View key={space.id} style={[styles.space, { left: `${point.x}%`, top: `${point.y}%` }]}>
            <Text style={styles.spaceLabel} numberOfLines={2}>{space.name}</Text>
            {space.price ? <Text style={styles.spacePrice}>{space.price}€</Text> : null}
            {owner ? <Text style={styles.spaceOwner} numberOfLines={1}>● {owner.name}</Text> : null}
            <View style={styles.tokens}>
              {occupied.map((id) => <View key={id} style={[styles.token, { backgroundColor: tokenColor(state.playerOrder.indexOf(id)) }]} />)}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function monopolySpacePoint(id: number) {
  if (id <= 10) return { x: 90 - id * 8, y: 90 };
  if (id <= 20) return { x: 10, y: 90 - (id - 10) * 8 };
  if (id <= 30) return { x: 10 + (id - 20) * 8, y: 10 };
  return { x: 90, y: 10 + (id - 30) * 8 };
}

function tokenColor(index: number) {
  return ["#d64648", "#2f72c4", "#e4b52f", "#55a17b", "#a65fc2", "#e98942"][index % 6];
}