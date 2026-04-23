import { Feather } from "@expo/vector-icons";
import {
  GameCard,
  PendingThrow,
  RoomPlayer,
  getGetRoomQueryKey,
  useDrawCard,
  useLeaveRoom,
  useMarkDone,
  usePanicVote,
  useRespondToThrow,
  useThrowCard,
  useUsePower,
  useVerifyVote,
  PANIC_WINDOW_MS,
  VERIFY_WINDOW_MS,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardView } from "@/components/CardView";
import { NeonButton } from "@/components/NeonButton";
import { useRoom } from "@/contexts/RoomContext";
import { useColors } from "@/hooks/useColors";
import {
  ensureServiceWorker,
  isWebNotifSupported,
  notifPermission,
  showCaosNotification,
} from "@/lib/notifications";

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { session, room, isLoading, setSession } = useRoom();
  const qc = useQueryClient();

  const drawMut = useDrawCard();
  const throwMut = useThrowCard();
  const respondMut = useRespondToThrow();
  const panicMut = usePanicVote();
  const powerMut = useUsePower();
  const markDoneMut = useMarkDone();
  const verifyMut = useVerifyVote();
  const leaveMut = useLeaveRoom();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [throwTo, setThrowTo] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [drawnPreview, setDrawnPreview] = useState<GameCard | null>(null);
  const [activeInbox, setActiveInbox] = useState<PendingThrow | null>(null);
  const [panicFor, setPanicFor] = useState<PendingThrow | null>(null);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  useEffect(() => {
    if (notifMsg) {
      const t = setTimeout(() => setNotifMsg(null), 4500);
      return () => clearTimeout(t);
    }
  }, [notifMsg]);

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

  const shuffleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (errMsg) {
      const t = setTimeout(() => setErrMsg(null), 2500);
      return () => clearTimeout(t);
    }
  }, [errMsg]);

  // Tick para refrescar cuentas atrás (Tribunal y pánico) cada segundo.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => (x + 1) % 1000000), 1000);
    return () => clearInterval(t);
  }, []);

  // Notificaciones push (web): registrar SW al entrar al juego.
  const lastInboxIds = useRef<Set<string>>(new Set());
  const lastTribunalIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isWebNotifSupported()) return;
    ensureServiceWorker();
  }, []);
  useEffect(() => {
    if (!room) return;
    const inboxIds = new Set(room.myInbox.map((t) => t.id));
    const isFirst = lastInboxIds.current.size === 0 && lastTribunalIds.current.size === 0;
    const granted = notifPermission() === "granted";
    for (const t of room.myInbox) {
      if (!lastInboxIds.current.has(t.id) && !isFirst) {
        const body = `${t.fromName} te ha lanzado: ${t.card.title}`;
        setNotifMsg(`⚠️ ${body}`);
        if (granted) {
          showCaosNotification({
            title: "⚠️ ¡CAOS!",
            body,
            tag: "inbox-" + t.id,
            requireInteraction: true,
          });
        }
      }
    }
    lastInboxIds.current = inboxIds;

    const tribIds = new Set((room.tribunal ?? []).map((t) => t.id));
    for (const t of room.tribunal ?? []) {
      if (!lastTribunalIds.current.has(t.id) && !isFirst) {
        const body = `Vota: ¿"${t.card.title}" cumplido?`;
        setNotifMsg(`🧑‍⚖️ ${body}`);
        if (granted) {
          showCaosNotification({
            title: "🧑‍⚖️ Tribunal del Caos",
            body,
            tag: "trib-" + t.id,
            requireInteraction: true,
          });
        }
      }
    }
    lastTribunalIds.current = tribIds;
  }, [room?.myInbox, room?.tribunal]);

  useEffect(() => {
    if (!session) router.replace("/");
    else if (room && room.status !== "active") router.replace("/players");
  }, [room, session, router]);

  if (isLoading || !room || !session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const me = room.players.find((p) => p.id === session.playerId);
  if (!me) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 16, padding: 24 }]}>
        <Feather name="eye" size={32} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" }}>
          {session.spectator ? "Modo espectador" : "No estás en esta sala"}
        </Text>
        <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
          {session.spectator
            ? "La partida está en marcha. Mira el ranking en vivo."
            : "Vuelve al inicio para entrar de nuevo."}
        </Text>
        <Pressable
          onPress={() => router.replace(session.spectator ? "/ranking" : "/")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
            {session.spectator ? "VER RANKING" : "VOLVER"}
          </Text>
        </Pressable>
      </View>
    );
  }

  const others = room.players.filter((p) => p.id !== session.playerId);

  function invalidate() {
    qc.invalidateQueries({
      queryKey: getGetRoomQueryKey(session!.roomCode, {
        playerId: session!.playerId,
      }),
    });
  }

  async function handleDraw() {
    if (!me || me.handCount >= 5) return;
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(shuffleAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(shuffleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    try {
      const res = await drawMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId },
      });
      invalidate();
      setDrawnPreview(res.drawnCard);
      setTimeout(() => setDrawnPreview(null), 1800);
    } catch (e) {
      setErrMsg(extractErr(e));
    }
  }

  async function handleThrow(targetId: string) {
    if (!selectedCard) return;
    try {
      await throwMut.mutateAsync({
        code: room!.code,
        data: {
          playerId: session!.playerId,
          toPlayerId: targetId,
          cardId: selectedCard,
        },
      });
      invalidate();
      setSelectedCard(null);
      setThrowTo(false);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setErrMsg(extractErr(e));
    }
  }

  async function handleUsePower(cardId: string, targetPlayerId?: string) {
    try {
      await powerMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId, cardId, targetPlayerId },
      });
      invalidate();
      setSelectedCard(null);
    } catch (e) {
      setErrMsg(extractErr(e));
    }
  }

  async function handleRespond(
    pending: PendingThrow,
    action:
      | "accept"
      | "reject"
      | "reversa"
      | "espejo"
      | "bloqueo"
      | "robo-carta"
      | "comodin",
  ) {
    try {
      await respondMut.mutateAsync({
        code: room!.code,
        data: {
          playerId: session!.playerId,
          throwId: pending.id,
          action,
        },
      });
      invalidate();
      setActiveInbox(null);
    } catch (e) {
      setErrMsg(extractErr(e));
    }
  }

  async function handleVerify(throwId: string, ok: boolean) {
    try {
      await verifyMut.mutateAsync({
        code: room!.code,
        data: { playerId: session!.playerId, throwId, ok },
      });
      invalidate();
    } catch (e) {
      setErrMsg(extractErr(e));
    }
  }

  async function handlePanic(throwId: string, against: boolean) {
    try {
      await panicMut.mutateAsync({
        code: room!.code,
        data: {
          playerId: session!.playerId,
          throwId,
          against,
        },
      });
      invalidate();
    } catch (e) {
      setErrMsg(extractErr(e));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.push("/players")} hitSlop={10}>
          <Feather name="users" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            {(me.avatar ? me.avatar + "  " : "") + me.name}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Pressable onPress={() => router.push("/ranking")} hitSlop={10}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
          </Pressable>
          <Pressable
            onPress={handleLeave}
            hitSlop={10}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.destructive,
            }}
          >
            <Text style={{ fontSize: 14 }}>🚪</Text>
            <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold", fontSize: 11 }}>
              SALIR
            </Text>
          </Pressable>
        </View>
      </View>

      {errMsg && (
        <View style={[styles.toast, { backgroundColor: colors.destructive }]}>
          <Text style={styles.toastText}>{errMsg}</Text>
        </View>
      )}
      {notifMsg && (
        <View style={[styles.toast, { backgroundColor: colors.primary }]}>
          <Text style={styles.toastText}>{notifMsg}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
        ]}
      >
        {/* Inbox */}
        {room.myInbox.length > 0 && (
          <View
            style={[
              styles.inboxBox,
              { borderColor: colors.destructive, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.inboxTitle, { color: colors.destructive }]}>
              ⚡ {room.myInbox.length} CARTA{room.myInbox.length > 1 ? "S" : ""} PARA TI
            </Text>
            {room.myInbox.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setActiveInbox(t)}
                style={[
                  styles.inboxRow,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inboxFrom, { color: colors.mutedForeground }]}>
                    De {t.fromName}
                  </Text>
                  <Text style={[styles.inboxCard, { color: colors.foreground }]}>
                    {t.card.title}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Tribunal del Caos: votar verificaciones de otros */}
        {(room.tribunal ?? []).length > 0 && (
          <View
            style={[
              styles.inboxBox,
              { borderColor: colors.secondary, backgroundColor: colors.card, shadowColor: colors.secondary },
            ]}
          >
            <Text style={[styles.inboxTitle, { color: colors.secondary }]}>
              🧑‍⚖️ TRIBUNAL DEL CAOS · {(room.tribunal ?? []).length} en juicio
            </Text>
            {(room.tribunal ?? []).map((t) => {
              const owner = room.players.find((p) => p.id === t.toPlayerId);
              const left = Math.max(0, t.verifyEndsAt - Date.now());
              const mins = Math.floor(left / 60000);
              const secs = Math.floor((left % 60000) / 1000);
              const myVote = t.verifyVotes.find((v) => v.voterId === session.playerId);
              const yes = t.verifyVotes.filter((v) => v.ok).length;
              const no = t.verifyVotes.filter((v) => !v.ok).length;
              return (
                <View
                  key={t.id}
                  style={[
                    styles.inboxRow,
                    { borderColor: colors.border, backgroundColor: colors.background, flexDirection: "column", alignItems: "stretch", gap: 8 },
                  ]}
                >
                  <Text style={[styles.inboxFrom, { color: colors.mutedForeground }]}>
                    {owner?.name ?? "?"} dice haber cumplido · {mins}:{secs.toString().padStart(2, "0")} restantes
                  </Text>
                  <Text style={[styles.inboxCard, { color: colors.foreground }]}>
                    {t.secret ? "🕶️ Reto secreto" : t.card.title}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <NeonButton
                      label={`✅ Superado${myVote?.ok ? " ✓" : ""} (${yes})`}
                      onPress={() => handleVerify(t.id, true)}
                      small
                      style={{ flex: 1 }}
                    />
                    <NeonButton
                      label={`❌ Falso${myVote && !myVote.ok ? " ✓" : ""} (${no})`}
                      variant="danger"
                      onPress={() => handleVerify(t.id, false)}
                      small
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Score */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
              PUNTOS
            </Text>
            <Text style={[styles.scoreVal, { color: colors.primary }]}>
              {me.score}
            </Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
              MANO
            </Text>
            <Text style={[styles.scoreVal, { color: colors.secondary }]}>
              {me.handCount}/5
            </Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
              RETOS
            </Text>
            <Text style={[styles.scoreVal, { color: colors.foreground }]}>
              {me.challengesCompleted}
            </Text>
          </View>
        </View>

        {me.shieldUntil > Date.now() && (
          <View style={[styles.shieldBanner, { borderColor: colors.secondary }]}>
            <Feather name="shield" size={16} color={colors.secondary} />
            <Text style={{ color: colors.secondary, fontFamily: "Inter_700Bold" }}>
              ESCUDO ACTIVO
            </Text>
          </View>
        )}
        {me.multiplier > 1 && (
          <View style={[styles.shieldBanner, { borderColor: colors.destructive }]}>
            <Feather name="alert-triangle" size={16} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold" }}>
              x{me.multiplier} en tu próximo reto cumplido
            </Text>
          </View>
        )}

        {/* Draw button */}
        <View style={styles.drawSection}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: shuffleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
                {
                  scale: shuffleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.15, 1],
                  }),
                },
              ],
            }}
          >
            <Pressable
              onPress={handleDraw}
              disabled={me.handCount >= 5 || drawMut.isPending}
              style={({ pressed }) => [
                styles.drawBtn,
                {
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                  opacity: me.handCount >= 5 ? 0.4 : 1,
                },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <LinearGradient
                colors={["#1a4d0a", "#2a0a3d"]}
                style={StyleSheet.absoluteFill}
              />
              <Feather name="layers" size={36} color={colors.primary} />
              <Text style={[styles.drawText, { color: colors.foreground }]}>
                ROBAR{"\n"}CARTA
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <Text style={[styles.handLabel, { color: colors.mutedForeground }]}>
          TU MANO · toca para seleccionar y lanzar
        </Text>

        {room.myHand.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Toca el botón central para robar tu primera carta.
          </Text>
        ) : (
          <View style={styles.handList}>
            {room.myHand.map((card, i) => (
              <CardView
                key={card.id + i}
                card={card}
                selected={selectedCard === card.id}
                onPress={() =>
                  setSelectedCard(selectedCard === card.id ? null : card.id)
                }
              />
            ))}
          </View>
        )}

        {selectedCard && (() => {
          const card = room.myHand.find((c) => c.id === selectedCard);
          const isProactivePower =
            card?.isPower &&
            !["reversa", "espejo", "bloqueo", "robo-carta"].includes(card.id);
          const needsTarget = ["ladron", "escudo-grupal", "regalo"].includes(
            selectedCard,
          );
          if (isProactivePower) {
            return (
              <View style={{ gap: 8, marginTop: 16 }}>
                {needsTarget ? (
                  <>
                    <Text
                      style={[
                        styles.handLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      ELIGE OBJETIVO
                    </Text>
                    {others.map((p) => (
                      <NeonButton
                        key={p.id}
                        label={`USAR EN ${p.name.toUpperCase()}`}
                        variant="secondary"
                        onPress={() => handleUsePower(selectedCard, p.id)}
                        style={{ marginTop: 4 }}
                      />
                    ))}
                  </>
                ) : (
                  <NeonButton
                    label={`USAR ${(card?.title ?? "PODER").toUpperCase()} ✦`}
                    variant="secondary"
                    onPress={() => handleUsePower(selectedCard)}
                  />
                )}
              </View>
            );
          }
          if (card?.isPower) {
            return (
              <Text
                style={{
                  color: colors.mutedForeground,
                  textAlign: "center",
                  marginTop: 16,
                  fontSize: 12,
                }}
              >
                Este poder solo se activa al recibir un reto.
              </Text>
            );
          }
          return (
            <NeonButton
              label="Lanzar a un jugador →"
              onPress={() => setThrowTo(true)}
              style={{ marginTop: 16 }}
            />
          );
        })()}

        {/* Other players preview */}
        <Text style={[styles.handLabel, { color: colors.mutedForeground, marginTop: 18 }]}>
          OTROS JUGADORES
        </Text>
        <View style={styles.othersList}>
          {others.map((p) => (
            <PlayerStrip key={p.id} player={p} />
          ))}
        </View>
      </ScrollView>

      {/* Throw target modal */}
      <Modal
        visible={throwTo}
        transparent
        animationType="fade"
        onRequestClose={() => setThrowTo(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setThrowTo(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.primary },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              ¿A quién?
            </Text>
            {others.map((p) => {
              const cdKey = `${session.playerId}->${p.id}`;
              const last = room.cooldowns[cdKey] ?? 0;
              const cd = Math.max(0, 10 * 60 * 1000 - (Date.now() - last));
              const shielded = p.shieldUntil > Date.now();
              const disabled = cd > 0 || shielded;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => !disabled && handleThrow(p.id)}
                  style={[
                    styles.targetRow,
                    {
                      borderColor: colors.border,
                      opacity: disabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.targetName, { color: colors.foreground }]}>
                    {p.name}
                  </Text>
                  {shielded ? (
                    <Text style={{ color: colors.secondary, fontSize: 11 }}>
                      ESCUDO
                    </Text>
                  ) : cd > 0 ? (
                    <Text style={{ color: colors.destructive, fontSize: 11 }}>
                      Cooldown {Math.ceil(cd / 60000)}m
                    </Text>
                  ) : (
                    <Feather name="zap" size={16} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
            <NeonButton
              label="Cancelar"
              variant="ghost"
              small
              onPress={() => setThrowTo(false)}
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Drawn card preview */}
      <Modal visible={!!drawnPreview} transparent animationType="fade">
        <View style={styles.modalBg} pointerEvents="none">
          {drawnPreview && (
            <View style={{ width: "85%", maxWidth: 380 }}>
              <CardView card={drawnPreview} />
              <Text
                style={[
                  styles.drawnLabel,
                  { color: colors.primary, marginTop: 8 },
                ]}
              >
                ¡NUEVA CARTA!
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Inbox resolution modal */}
      <Modal
        visible={!!activeInbox}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveInbox(null)}
      >
        {activeInbox && (
          <ResolveInbox
            pending={activeInbox}
            myHand={room.myHand}
            onClose={() => setActiveInbox(null)}
            onAction={(act) => handleRespond(activeInbox, act)}
            onPanic={() => {
              setPanicFor(activeInbox);
              setActiveInbox(null);
            }}
            busy={respondMut.isPending}
          />
        )}
      </Modal>

      {/* Panic vote modal */}
      <Modal
        visible={!!panicFor}
        transparent
        animationType="slide"
        onRequestClose={() => setPanicFor(null)}
      >
        {panicFor && (
          <PanicVote
            pending={panicFor}
            players={room.players}
            myId={session.playerId}
            onClose={() => setPanicFor(null)}
            onVote={(against) => handlePanic(panicFor.id, against)}
          />
        )}
      </Modal>
    </View>
  );
}

function PlayerStrip({ player }: { player: RoomPlayer }) {
  const colors = useColors();
  const shielded = player.shieldUntil > Date.now();
  return (
    <View
      style={[
        styles.otherRow,
        {
          backgroundColor: colors.card,
          borderColor: shielded ? colors.secondary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: player.connected ? colors.primary : colors.border },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>
          {player.name}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
          {player.handCount} cartas · {player.score} pts
          {shielded ? " · ESCUDO" : ""}
          {player.multiplier > 1 ? ` · x${player.multiplier}` : ""}
        </Text>
      </View>
    </View>
  );
}

function ResolveInbox({
  pending,
  myHand,
  onClose,
  onAction,
  onPanic,
  busy,
}: {
  pending: PendingThrow;
  myHand: GameCard[];
  onClose: () => void;
  onAction: (
    action:
      | "accept"
      | "reject"
      | "reversa"
      | "espejo"
      | "bloqueo"
      | "robo-carta"
      | "comodin",
  ) => void;
  onPanic: () => void;
  busy: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const COUNTER_IDS = new Set([
    "reversa",
    "espejo",
    "bloqueo",
    "robo-carta",
    "comodin",
  ]);
  const counters = myHand.filter((c) => c.isPower && COUNTER_IDS.has(c.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.resolveWrap,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 16,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 40,
        },
      ]}
    >
      <View style={styles.resolveHeader}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.resolveTop, { color: colors.mutedForeground }]}>
          De {pending.fromName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ marginVertical: 16 }}>
        <CardView card={pending.card} />
      </View>

      <View style={styles.actionsRow}>
        <NeonButton
          label="✅ Hecho"
          onPress={() => onAction("accept")}
          disabled={busy}
          style={{ flex: 1 }}
        />
        <NeonButton
          label="Rechazar (x2)"
          variant="danger"
          onPress={() => onAction("reject")}
          disabled={busy}
          style={{ flex: 1 }}
        />
      </View>

      {counters.length > 0 && (
        <View style={styles.counterSection}>
          <Text style={[styles.counterLabel, { color: colors.mutedForeground }]}>
            CONTRAATACA CON UN PODER
          </Text>
          {counters.map((c) => (
            <NeonButton
              key={c.id}
              label={c.title.toUpperCase()}
              variant="secondary"
              onPress={() =>
                onAction(
                  c.id as
                    | "reversa"
                    | "espejo"
                    | "bloqueo"
                    | "robo-carta"
                    | "comodin",
                )
              }
              disabled={busy}
              style={{ marginTop: 8 }}
              small
            />
          ))}
        </View>
      )}

      <Pressable
        onPress={onPanic}
        style={[
          styles.panic,
          { borderColor: colors.destructive, backgroundColor: colors.card },
        ]}
      >
        <Feather name="alert-octagon" size={20} color={colors.destructive} />
        <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold" }}>
          BOTÓN DE PÁNICO · pedir anulación
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function PanicVote({
  pending,
  players,
  myId,
  onClose,
  onVote,
}: {
  pending: PendingThrow;
  players: RoomPlayer[];
  myId: string;
  onClose: () => void;
  onVote: (against: boolean) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const eligible = players.length - 1;
  const needed = Math.floor(eligible / 2) + 1;
  const myVote = pending.panicAgainst.includes(myId);
  const left = Math.max(0, (pending.panicEndsAt ?? 0) - Date.now());
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const expired = left <= 0;

  return (
    <View
      style={[styles.modalBg, { paddingTop: (isWeb ? 67 : insets.top) + 16 }]}
    >
      <View
        style={[
          styles.modalCard,
          { backgroundColor: colors.card, borderColor: colors.destructive },
        ]}
      >
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>
          ¿Anular esta carta?
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Mayoría del grupo (excepto el receptor) anula la carta.
        </Text>
        <Text style={{ color: expired ? colors.destructive : colors.primary, fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 4 }}>
          {expired ? "⏱️ Ventana de pánico cerrada" : `⏱️ ${mins}:${secs.toString().padStart(2, "0")} para votar`}
        </Text>
        <Pressable
          onPress={() => onVote(!myVote)}
          style={[
            styles.targetRow,
            {
              borderColor: myVote ? colors.destructive : colors.border,
              backgroundColor: myVote
                ? colors.destructive + "22"
                : "transparent",
              marginTop: 12,
            },
          ]}
        >
          <Text style={[styles.targetName, { color: colors.foreground }]}>
            Mi voto: {myVote ? "ANULAR" : "Permitir"}
          </Text>
          <Feather
            name={myVote ? "check-square" : "square"}
            size={20}
            color={myVote ? colors.destructive : colors.mutedForeground}
          />
        </Pressable>
        <Text style={[styles.voteCount, { color: colors.destructive }]}>
          {pending.panicAgainst.length} / {needed} votos para anular
        </Text>
        <NeonButton
          label="Cerrar"
          variant="ghost"
          small
          onPress={onClose}
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  );
}

function extractErr(e: unknown): string {
  const err = e as { data?: { error?: string }; message?: string };
  return err?.data?.error ?? err?.message ?? "Error";
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  topTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
  toast: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toastText: {
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
  scroll: { padding: 20, gap: 14 },
  inboxBox: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: "#FF2D6F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  inboxTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
  },
  inboxRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inboxFrom: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  inboxCard: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginTop: 2,
  },
  scoreRow: { flexDirection: "row", gap: 10 },
  scoreBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#15042A",
    borderWidth: 1,
    borderColor: "#2A1450",
  },
  scoreLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  scoreVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  shieldBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  drawSection: { alignItems: "center", paddingVertical: 12 },
  drawBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 12,
    gap: 8,
  },
  drawText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  handLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: 30,
  },
  handList: { gap: 12 },
  othersList: { gap: 8 },
  otherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 18,
    borderWidth: 2,
    gap: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  targetName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  drawnLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
  },
  resolveWrap: { padding: 20, gap: 12 },
  resolveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resolveTop: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  actionsRow: { flexDirection: "row", gap: 10 },
  counterSection: { marginTop: 16 },
  counterLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  panic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 20,
  },
  voteCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});
