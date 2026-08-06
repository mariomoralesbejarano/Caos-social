import { useGetBarajaRoom } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import BoardRoomLobby from "@/components/BoardRoomLobby";
import { useColors } from "@/hooks/useColors";
import { loadBarajaSession, type BarajaSession } from "@/lib/barajaSession";

export default function PokerGameScreen() {
  const colors = useColors();
  const router = useRouter();
  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

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

  useEffect(() => {
    if (room?.status !== "active") return;
    router.replace("/poker-room" as never);
  }, [room?.status, router]);

  if (!hydrated || (session && isLoading)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#B026FF" size="large" />
      </View>
    );
  }

  if (session && room?.status === "active") return null;

  return (
    <BoardRoomLobby
      kind="poker"
      title="Póker · Texas Hold'em"
      subtitle="Crea una mesa a tu medida, reparte dos cartas privadas y juega por el bote."
      accent="#B026FF"
      maxPlayers={8}
      defaultMaxPlayers={6}
      onBack="/"
    />
  );
}