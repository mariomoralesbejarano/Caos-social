import { Feather } from "@expo/vector-icons";
import {
  CardTag,
  getGetRoomQueryKey,
  useAddCustomCard,
  useLeaveRoom,
  useResetRoom,
  useSetMyTags,
  useStartGame,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeonButton } from "@/components/NeonButton";
import { useRoom } from "@/contexts/RoomContext";
import { useColors } from "@/hooks/useColors";

const TAG_INFO: { id: CardTag; label: string; desc: string }[] = [
  { id: "abstemio", label: "Abstemio", desc: "Sin cartas de beber" },
  { id: "pareja", label: "Con pareja", desc: "Sin cartas de ligar" },
  { id: "hardcore", label: "Hardcore", desc: "Recibe todo · doble puntos" },
];

export default function LobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { session, room, isLoading, setSession } = useRoom();
  const qc = useQueryClient();

  const startMut = useStartGame();
  const tagsMut = useSetMyTags();
  const resetMut = useResetRoom();
  const customMut = useAddCustomCard();
  const leaveMut = useLeaveRoom();
  const [error, setError] = useState<string | null>(null);
  const [ccTitle, setCcTitle] = useState("");
  const [ccEffect, setCcEffect] = useState("");
  const [ccPoints, setCcPoints] = useState("2");

  // If active, send to game
  useEffect(() => {
    if (room?.status === "active") router.replace("/game");
  }, [room?.status, router]);

  if (isLoading || !room || !session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const me = room.players.find((p) => p.id === session.playerId);
  const isOwner = room.ownerId === session.playerId;

  function invalidate() {
    qc.invalidateQueries({
      queryKey: getGetRoomQueryKey(session!.roomCode, {
        playerId: session!.playerId,
      }),
    });
  }

  async function handleStart() {
    setError(null);
    try {
      await startMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId },
      });
      invalidate();
      router.replace("/game");
    } catch (e) {
      setError(extractErr(e));
    }
  }

  async function handleToggleTag(tag: CardTag) {
    if (!me) return;
    const has = me.tags.includes(tag);
    let next = has ? me.tags.filter((t) => t !== tag) : [...me.tags, tag];
    if (!has && tag === "hardcore") next = ["hardcore"];
    else if (!has) next = next.filter((t) => t !== "hardcore");
    try {
      await tagsMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId, tags: next },
      });
      invalidate();
    } catch (e) {
      setError(extractErr(e));
    }
  }

  async function handleAddCustom() {
    setError(null);
    const points = Math.max(1, Math.min(10, parseInt(ccPoints, 10) || 2));
    if (ccTitle.trim().length < 3 || ccEffect.trim().length < 3) {
      setError("Título y efecto requeridos (mínimo 3 caracteres)");
      return;
    }
    try {
      await customMut.mutateAsync({
        code: room!.code,
        data: {
          playerId: session!.playerId,
          title: ccTitle.trim().slice(0, 60),
          effect: ccEffect.trim().slice(0, 200),
          points,
        },
      });
      setCcTitle("");
      setCcEffect("");
      setCcPoints("2");
      invalidate();
    } catch (e) {
      setError(extractErr(e));
    }
  }

  async function handleLeave() {
    try {
      await leaveMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId },
      });
    } catch {}
    setSession(null);
    router.replace("/");
  }

  async function handleReset() {
    try {
      await resetMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId },
      });
      invalidate();
    } catch (e) {
      setError(extractErr(e));
    }
  }

  async function shareCode() {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard?.writeText(room!.code);
      } catch {}
      return;
    }
    try {
      await Share.share({
        message: `Únete a mi sala de CAOS SOCIAL con el código: ${room!.code}`,
      });
    } catch {}
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>
        <Pressable
          onPress={handleLeave}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.destructive,
          }}
        >
          <Feather name="log-out" size={14} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold", fontSize: 12 }}>
            SALIR
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={shareCode}
        style={[
          styles.codeBox,
          { borderColor: colors.primary, backgroundColor: colors.card },
        ]}
      >
        <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
          CÓDIGO DE SALA · toca para compartir
        </Text>
        <Text style={[styles.code, { color: colors.primary }]}>{room.code}</Text>
        <Feather name="share-2" size={18} color={colors.mutedForeground} />
      </Pressable>

      <View style={styles.sectionHead}>
        <Feather name="users" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Jugadores conectados
        </Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {room.players.length}
        </Text>
      </View>

      <View style={styles.playerList}>
        {room.players.map((p) => {
          const isMe = p.id === session.playerId;
          return (
            <View
              key={p.id}
              style={[
                styles.playerRow,
                {
                  backgroundColor: colors.card,
                  borderColor: isMe ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: p.connected ? colors.primary : colors.border },
                ]}
              />
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: isMe ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 6,
                }}
              >
                <Text style={{ fontSize: 24, lineHeight: 28, textAlign: "center" }}>
                  {p.avatar || "👤"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pName, { color: colors.foreground }]}>
                  {p.name} {isMe && "(tú)"}
                  {p.id === room.ownerId && (
                    <Text style={{ color: colors.secondary, fontSize: 11 }}>
                      {"  "}· anfitrión
                    </Text>
                  )}
                </Text>
                {(p.role || p.tags.length > 0) && (
                  <Text style={[styles.pTags, { color: colors.mutedForeground }]}>
                    {[p.role, ...p.tags].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionHead}>
        <Feather name="user" size={18} color={colors.secondary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Tu rol
        </Text>
      </View>

      <View style={styles.tagRow}>
        {TAG_INFO.map((t) => {
          const active = me?.tags.includes(t.id);
          return (
            <Pressable
              key={t.id}
              onPress={() => handleToggleTag(t.id)}
              style={[
                styles.tagChip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + "22" : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.tagChipText,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
              <Text
                style={[styles.tagChipDesc, { color: colors.mutedForeground }]}
              >
                {t.desc}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isOwner && room.status === "lobby" && (
        <View
          style={[
            styles.creatorBox,
            { borderColor: colors.secondary, backgroundColor: colors.card },
          ]}
        >
          <View style={styles.sectionHead}>
            <Feather name="edit-3" size={18} color={colors.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Crea cartas personalizadas
            </Text>
          </View>
          <Text style={[styles.pTags, { color: colors.mutedForeground }]}>
            Se mezclarán con el mazo al empezar la partida.
          </Text>
          <TextInput
            value={ccTitle}
            onChangeText={setCcTitle}
            placeholder="Título (ej: Brindis del jefe)"
            placeholderTextColor={colors.mutedForeground}
            maxLength={60}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <TextInput
            value={ccEffect}
            onChangeText={setCcEffect}
            placeholder="Efecto (qué tiene que hacer)"
            placeholderTextColor={colors.mutedForeground}
            maxLength={200}
            multiline
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                minHeight: 60,
                textAlignVertical: "top",
              },
            ]}
          />
          <TextInput
            value={ccPoints}
            onChangeText={(t) => setCcPoints(t.replace(/[^0-9]/g, ""))}
            placeholder="Puntos (1-10)"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={2}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <NeonButton
            label={`AÑADIR CARTA${room.customCards?.length ? ` · ${room.customCards.length} creadas` : ""}`}
            variant="secondary"
            small
            onPress={handleAddCustom}
            disabled={customMut.isPending}
          />
        </View>
      )}

      {error && (
        <Text style={{ color: colors.destructive, textAlign: "center" }}>
          {error}
        </Text>
      )}

      {isOwner ? (
        <NeonButton
          label={
            room.players.length < 2
              ? "Necesitas 2+ jugadores"
              : room.status === "active"
                ? "Ya en juego"
                : "EMPEZAR PARTIDA"
          }
          disabled={room.players.length < 2 || startMut.isPending}
          onPress={handleStart}
        />
      ) : (
        <View
          style={[
            styles.waiting,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <ActivityIndicator color={colors.secondary} />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Esperando que el anfitrión empiece...
          </Text>
        </View>
      )}

      <View style={styles.bottomActions}>
        {isOwner && room.status === "active" && (
          <NeonButton
            label="Reiniciar partida"
            variant="ghost"
            small
            onPress={handleReset}
            style={{ flex: 1 }}
          />
        )}
        <NeonButton
          label="Salir de la sala"
          variant="ghost"
          small
          onPress={handleLeave}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

function extractErr(e: unknown): string {
  const err = e as { data?: { error?: string }; message?: string };
  return err?.data?.error ?? err?.message ?? "Error";
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  codeBox: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 6,
    shadowColor: "#39FF14",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
  },
  codeLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  code: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    letterSpacing: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    flex: 1,
  },
  count: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  pTags: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  tagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tagChip: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagChipText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  tagChipDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
  waiting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  creatorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
});
