import { Feather } from "@expo/vector-icons";
import {
  ALL_CARDS,
  CardTag,
  GameCard,
  getGetRoomQueryKey,
  getPackCardIds,
  useAddCustomCard,
  useEditCard,
  useLeaveRoom,
  useResetRoom,
  useSetMyTags,
  useStartGame,
  useToggleCard,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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

import { CustomDeckModal } from "@/components/CustomDeckModal";
import { NeonButton } from "@/components/NeonButton";
import { useRoom } from "@/contexts/RoomContext";
import { useColors } from "@/hooks/useColors";

const TELEGRAM_INVITE_URL = "https://t.me/+UW7Ayt57Qm04NmY0";

// ── TelegramInviteButton ───────────────────────────────────────────────────
function TelegramInviteButton() {
  return (
    <Pressable
      onPress={() => Linking.openURL(TELEGRAM_INVITE_URL)}
      style={({ pressed }) => [telegramStyles.btn, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={telegramStyles.btnText}>📲 Unirse al grupo de Telegram</Text>
      <Text style={telegramStyles.sub}>Recibe avisos de la partida en tiempo real</Text>
    </Pressable>
  );
}

const telegramStyles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#2AABEE",
    backgroundColor: "rgba(42,171,238,0.12)",
    gap: 4,
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
    color: "#2AABEE",
    textAlign: "center",
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#888",
    textAlign: "center",
  },
});
// ───────────────────────────────────────────────────────────────────────────

// ── CardManager ────────────────────────────────────────────────────────────
function CardManager({
  room,
  session,
  onClose,
  onChanged,
}: {
  room: import("@workspace/api-client-react").RoomState;
  session: { playerId: string; roomCode: string };
  onClose: () => void;
  onChanged: () => void;
}) {
  const colors = useColors();
  const toggleMut = useToggleCard();
  const editMut = useEditCard();

  const [editingCard, setEditingCard] = useState<GameCard | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEffect, setEditEffect] = useState("");
  const [filterPack, setFilterPack] = useState<string | null>(null);

  const isOwner = room.ownerId === session.playerId;

  // Collect all cards from selected packs
  const packCards: { packId: string; cards: GameCard[] }[] = (room.packs ?? [room.pack]).map((packId) => {
    const ids = getPackCardIds(packId);
    const cards = ids.map((id) => {
      const override = room.cardOverrides?.[id];
      const base = ALL_CARDS.find((c) => c.id === id);
      if (!base) return null;
      return override ? { ...base, title: override.title, effect: override.effect } : base;
    }).filter(Boolean) as GameCard[];
    return { packId, cards };
  });

  const packs = filterPack ? packCards.filter((p) => p.packId === filterPack) : packCards;
  const disabled = new Set(room.disabledCards ?? []);

  function handleToggle(cardId: string) {
    toggleMut.mutate(
      { code: room.code, data: { playerId: session.playerId, cardId } },
      { onSuccess: onChanged },
    );
  }

  function openEdit(card: GameCard) {
    setEditingCard(card);
    setEditTitle(card.title);
    setEditEffect(card.effect);
  }

  function handleSaveEdit() {
    if (!editingCard) return;
    editMut.mutate(
      { code: room.code, data: { playerId: session.playerId, cardId: editingCard.id, title: editTitle, effect: editEffect } },
      { onSuccess: () => { setEditingCard(null); onChanged(); } },
    );
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>🃏 Gestor de Cartas</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        {/* Pack filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
          <Pressable
            onPress={() => setFilterPack(null)}
            style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: !filterPack ? colors.primary : colors.border, backgroundColor: !filterPack ? colors.primary + "22" : "transparent" }}
          >
            <Text style={{ color: !filterPack ? colors.primary : colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 11 }}>TODOS</Text>
          </Pressable>
          {(room.packs ?? [room.pack]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setFilterPack(filterPack === p ? null : p)}
              style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: filterPack === p ? colors.primary : colors.border, backgroundColor: filterPack === p ? colors.primary + "22" : "transparent" }}
            >
              <Text style={{ color: filterPack === p ? colors.primary : colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 11 }}>{p.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {/* Cards list */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {packs.map(({ packId, cards }) => (
            <View key={packId}>
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginTop: 8 }}>
                {packId.toUpperCase()} · {cards.length} cartas
              </Text>
              {cards.map((card) => {
                const isDisabled = disabled.has(card.id);
                const hasOverride = !!room.cardOverrides?.[card.id];
                return (
                  <View key={card.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: isDisabled ? colors.border : colors.primary + "55", backgroundColor: isDisabled ? "rgba(80,80,80,0.1)" : "rgba(57,255,20,0.04)", marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isDisabled ? colors.mutedForeground : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 13, opacity: isDisabled ? 0.5 : 1 }}>
                        {card.title} {hasOverride ? "✏️" : ""}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2, opacity: isDisabled ? 0.4 : 0.8 }} numberOfLines={2}>
                        {card.effect}
                      </Text>
                    </View>
                    {isOwner && (
                      <>
                        <Pressable onPress={() => openEdit(card)} hitSlop={8}>
                          <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                        </Pressable>
                        <Pressable onPress={() => handleToggle(card.id)} hitSlop={8}>
                          <Feather name={isDisabled ? "toggle-left" : "toggle-right"} size={22} color={isDisabled ? colors.border : colors.primary} />
                        </Pressable>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 16 }}>
            {disabled.size} cartas desactivadas · activa/desactiva antes de empezar
          </Text>
        </ScrollView>
        {/* Edit modal */}
        {editingCard && (
          <Modal visible animationType="fade" transparent onRequestClose={() => setEditingCard(null)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: 24 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.secondary, gap: 12 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>✏️ Editar carta</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Título"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={80}
                  style={{ color: colors.foreground, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontFamily: "Inter_500Medium", backgroundColor: colors.background }}
                />
                <TextInput
                  value={editEffect}
                  onChangeText={setEditEffect}
                  placeholder="Efecto/descripción"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={250}
                  multiline
                  style={{ color: colors.foreground, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontFamily: "Inter_400Regular", backgroundColor: colors.background, minHeight: 80, textAlignVertical: "top" }}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable onPress={() => setEditingCard(null)} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold" }}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={handleSaveEdit} disabled={editMut.isPending} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.secondary, alignItems: "center" }}>
                    <Text style={{ color: "#000", fontFamily: "Inter_700Bold" }}>{editMut.isPending ? "..." : "Guardar"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}
// ───────────────────────────────────────────────────────────────────────────

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
  const [ccCooldown, setCcCooldown] = useState("15");
  const [cardManagerOpen, setCardManagerOpen] = useState(false);
  const [customDeckOpen, setCustomDeckOpen] = useState(false);

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
    const cooldownMinutes = Math.max(1, parseInt(ccCooldown, 10) || 15);
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
          cooldownMinutes,
        },
      });
      setCcTitle("");
      setCcEffect("");
      setCcPoints("2");
      setCcCooldown("15");
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
    await setSession(null);   // awaited: clears storage + query cache
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
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 13 }}>🏠</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12 }}>
            MENÚ
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
                {p.tags.length > 0 && (
                  <Text style={[styles.pTags, { color: colors.mutedForeground }]}>
                    {p.tags.join(" · ")}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionHead}>
        <Feather name="tag" size={18} color={colors.secondary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Tus preferencias
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
        <Pressable
          onPress={() => setCardManagerOpen(true)}
          style={[styles.creatorBox, { borderColor: colors.primary, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 12 }]}
        >
          <Feather name="layers" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 14 }]}>
              Gestor de Cartas
            </Text>
            <Text style={[styles.pTags, { color: colors.mutedForeground }]}>
              Activa, desactiva y edita cartas del mazo · {(room.disabledCards?.length ?? 0) > 0 ? `${room.disabledCards.length} desactivadas` : "todas activas"}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      )}

      {cardManagerOpen && session && (
        <CardManager
          room={room}
          session={{ playerId: session.playerId, roomCode: session.roomCode }}
          onClose={() => setCardManagerOpen(false)}
          onChanged={invalidate}
        />
      )}

      {isOwner && room.status === "lobby" && (
        <Pressable
          onPress={() => setCustomDeckOpen(true)}
          style={[styles.creatorBox, { borderColor: colors.secondary, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 12 }]}
        >
          <Feather name="plus-square" size={22} color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 14 }]}>
              Crear Mazo Personalizado
            </Text>
            <Text style={[styles.pTags, { color: colors.mutedForeground }]}>
              Crea cartas desde cero o importa de mazos oficiales · {room.customCards?.length ? `${room.customCards.length} carta${room.customCards.length !== 1 ? "s" : ""} añadidas` : "sin cartas aún"}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      )}

      {customDeckOpen && session && (
        <CustomDeckModal
          room={room}
          session={{ playerId: session.playerId, roomCode: session.roomCode }}
          onClose={() => setCustomDeckOpen(false)}
          onChanged={invalidate}
        />
      )}

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
          <TextInput
            value={ccCooldown}
            onChangeText={(t) => setCcCooldown(t.replace(/[^0-9]/g, ""))}
            placeholder="Cooldown en minutos (ej: 15)"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={3}
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

      {/* ── Invitación Telegram ──────────────────────────────────── */}
      <TelegramInviteButton />

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
