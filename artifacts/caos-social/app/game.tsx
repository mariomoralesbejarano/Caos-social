import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { GameCard, getCard } from "@/constants/cards";
import { useGame } from "@/contexts/GameContext";
import { useColors } from "@/hooks/useColors";

type Phase = "select-player" | "view-hand" | "throw" | "draw-anim";

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const game = useGame();
  const {
    players,
    pending,
    drawCard,
    throwCard,
    acceptPending,
    rejectPending,
    resolvePower,
    voteCancel,
  } = game;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [throwTo, setThrowTo] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [showPanic, setShowPanic] = useState(false);
  const [drawnPreview, setDrawnPreview] = useState<GameCard | null>(null);

  const shuffleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (errMsg) {
      const t = setTimeout(() => setErrMsg(null), 2500);
      return () => clearTimeout(t);
    }
  }, [errMsg]);

  const active = players.find((p) => p.id === activeId);

  const phase: Phase = useMemo(() => {
    if (!activeId) return "select-player";
    if (selectedCard && throwTo === null) return "throw";
    return "view-hand";
  }, [activeId, selectedCard, throwTo]);

  function handleDraw() {
    if (!active) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    const c = drawCard(active.id);
    if (!c) {
      setErrMsg("Mazo vacío o mano completa.");
      return;
    }
    setDrawnPreview(c);
    setTimeout(() => setDrawnPreview(null), 1800);
  }

  function handleThrow(targetId: string) {
    if (!active || !selectedCard) return;
    const res = throwCard(active.id, targetId, selectedCard);
    if (!res.ok) {
      setErrMsg(res.reason ?? "No se puede lanzar.");
      return;
    }
    setSelectedCard(null);
    setThrowTo(null);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (pending) {
    return (
      <PendingResolver
        onClose={() => {}}
        showPanic={showPanic}
        setShowPanic={setShowPanic}
      />
    );
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
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>
          {active ? `Turno de ${active.name}` : "Elige tu turno"}
        </Text>
        <Pressable onPress={() => router.push("/ranking")} hitSlop={10}>
          <Feather name="award" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {errMsg && (
        <View style={[styles.toast, { backgroundColor: colors.destructive }]}>
          <Text style={styles.toastText}>{errMsg}</Text>
        </View>
      )}

      {phase === "select-player" && (
        <ScrollView
          contentContainerStyle={[
            styles.selectorWrap,
            { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
          ]}
        >
          <Text style={[styles.selectorTitle, { color: colors.foreground }]}>
            ¿Quién juega ahora?
          </Text>
          <Text style={[styles.selectorSub, { color: colors.mutedForeground }]}>
            Pasa el dispositivo y selecciona tu nombre para ver tu mano.
          </Text>
          <View style={styles.selectorGrid}>
            {players.map((p) => {
              const shielded = p.shieldUntil > Date.now();
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setActiveId(p.id)}
                  style={({ pressed }) => [
                    styles.playerTile,
                    {
                      backgroundColor: colors.card,
                      borderColor: shielded ? colors.secondary : colors.border,
                      shadowColor: shielded ? colors.secondary : colors.primary,
                    },
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text style={[styles.tileName, { color: colors.foreground }]}>
                    {p.name}
                  </Text>
                  <View style={styles.tileMeta}>
                    <Text style={[styles.tileScore, { color: colors.primary }]}>
                      {p.score} pts
                    </Text>
                    <Text style={[styles.tileHand, { color: colors.mutedForeground }]}>
                      · {p.hand.length} cartas
                    </Text>
                  </View>
                  {shielded && (
                    <View style={styles.shieldBadge}>
                      <Feather name="shield" size={12} color={colors.secondary} />
                      <Text style={[styles.shieldText, { color: colors.secondary }]}>
                        ESCUDO
                      </Text>
                    </View>
                  )}
                  {p.multiplier > 1 && (
                    <Text style={[styles.multiplier, { color: colors.destructive }]}>
                      x{p.multiplier} próximo reto
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {active && phase === "view-hand" && (
        <ScrollView
          contentContainerStyle={[
            styles.handWrap,
            { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
          ]}
        >
          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                PUNTOS
              </Text>
              <Text style={[styles.scoreVal, { color: colors.primary }]}>
                {active.score}
              </Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                MANO
              </Text>
              <Text style={[styles.scoreVal, { color: colors.secondary }]}>
                {active.hand.length}/5
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setActiveId(null);
                setSelectedCard(null);
              }}
              style={[
                styles.exitTurn,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Feather name="log-out" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Central draw button */}
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
                disabled={active.hand.length >= 5}
                style={({ pressed }) => [
                  styles.drawBtn,
                  {
                    borderColor: colors.primary,
                    shadowColor: colors.primary,
                    opacity: active.hand.length >= 5 ? 0.4 : 1,
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
            TU MANO · toca para seleccionar
          </Text>

          {active.hand.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              Toca el botón central para robar tu primera carta.
            </Text>
          ) : (
            <View style={styles.handList}>
              {active.hand.map((cid) => {
                const card = getCard(cid);
                if (!card) return null;
                return (
                  <CardView
                    key={cid + Math.random()}
                    card={card}
                    selected={selectedCard === cid}
                    onPress={() =>
                      setSelectedCard(selectedCard === cid ? null : cid)
                    }
                  />
                );
              })}
            </View>
          )}

          {selectedCard && (
            <NeonButton
              label="Lanzar a un jugador →"
              onPress={() => setThrowTo("__pick__")}
              style={{ marginTop: 16 }}
            />
          )}
        </ScrollView>
      )}

      {/* Throw target selector modal */}
      <Modal
        visible={phase === "throw"}
        transparent
        animationType="fade"
        onRequestClose={() => setThrowTo(null)}
      >
        <Pressable
          style={styles.modalBg}
          onPress={() => setThrowTo(null)}
        >
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
            {players
              .filter((p) => p.id !== activeId)
              .map((p) => {
                const cd = game.cooldownLeft(activeId!, p.id);
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
                    <Text
                      style={[styles.targetName, { color: colors.foreground }]}
                    >
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
                      <Feather
                        name="zap"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            <NeonButton
              label="Cancelar"
              variant="ghost"
              small
              onPress={() => setThrowTo(null)}
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Drawn preview animation */}
      <Modal visible={!!drawnPreview} transparent animationType="fade">
        <View style={styles.modalBg} pointerEvents="none">
          {drawnPreview && (
            <View style={{ width: "85%", maxWidth: 380 }}>
              <CardView card={drawnPreview} />
              <Text
                style={[
                  styles.drawnLabel,
                  { color: colors.primary, textAlign: "center", marginTop: 8 },
                ]}
              >
                ¡NUEVA CARTA!
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function PendingResolver({
  showPanic,
  setShowPanic,
}: {
  onClose: () => void;
  showPanic: boolean;
  setShowPanic: (v: boolean) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const {
    pending,
    players,
    acceptPending,
    rejectPending,
    resolvePower,
    voteCancel,
  } = useGame();
  if (!pending) return null;
  const card = getCard(pending.cardId);
  const from = players.find((p) => p.id === pending.fromPlayerId);
  const to = players.find((p) => p.id === pending.toPlayerId);
  if (!card || !from || !to) return null;

  const targetHand = to.hand.map((id) => getCard(id)).filter(Boolean) as GameCard[];
  const counters = targetHand.filter((c) => c.isPower);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.pendingWrap,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 16,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 30,
        },
      ]}
    >
      <Text style={[styles.pendingFrom, { color: colors.mutedForeground }]}>
        {from.name} →
      </Text>
      <Text style={[styles.pendingTo, { color: colors.foreground }]}>
        {to.name}
      </Text>
      <Text style={[styles.pendingHint, { color: colors.secondary }]}>
        {to.name}, has recibido un reto
      </Text>

      <View style={{ marginVertical: 20 }}>
        <CardView card={card} />
      </View>

      <View style={styles.actionsRow}>
        <NeonButton
          label="Aceptar reto"
          onPress={acceptPending}
          style={{ flex: 1 }}
        />
        <NeonButton
          label="Rechazar (x2)"
          variant="danger"
          onPress={rejectPending}
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
                resolvePower(c.id as "reversa" | "espejo" | "bloqueo" | "robo-carta")
              }
              style={{ marginTop: 8 }}
              small
            />
          ))}
        </View>
      )}

      <Pressable
        onPress={() => setShowPanic(true)}
        style={[
          styles.panic,
          { borderColor: colors.destructive, backgroundColor: colors.card },
        ]}
      >
        <Feather name="alert-octagon" size={20} color={colors.destructive} />
        <Text style={[styles.panicText, { color: colors.destructive }]}>
          BOTÓN DE PÁNICO · Votar anular
        </Text>
      </Pressable>

      <Modal visible={showPanic} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.destructive },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              ¿Anular esta carta?
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Mayoría del grupo (excepto receptor) anula la carta.
            </Text>
            {players
              .filter((p) => p.id !== to.id)
              .map((p) => {
                const voted = pending.panicAgainst.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => voteCancel(p.id, !voted)}
                    style={[
                      styles.targetRow,
                      {
                        borderColor: voted ? colors.destructive : colors.border,
                        backgroundColor: voted
                          ? colors.destructive + "22"
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.targetName, { color: colors.foreground }]}
                    >
                      {p.name}
                    </Text>
                    <Feather
                      name={voted ? "check-square" : "square"}
                      size={18}
                      color={voted ? colors.destructive : colors.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            <Text style={[styles.voteCount, { color: colors.destructive }]}>
              {pending.panicAgainst.length} / {Math.floor((players.length - 1) / 2) + 1} necesarios
            </Text>
            <NeonButton
              label="Cerrar"
              variant="ghost"
              small
              onPress={() => setShowPanic(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  selectorWrap: {
    padding: 20,
    gap: 16,
  },
  selectorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  selectorSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 8,
  },
  selectorGrid: {
    gap: 12,
  },
  playerTile: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  tileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  tileMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  tileScore: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  tileHand: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  shieldText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  multiplier: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  handWrap: {
    padding: 20,
    gap: 16,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  scoreBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
  exitTurn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  drawSection: {
    alignItems: "center",
    paddingVertical: 12,
  },
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
    marginTop: 8,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: 30,
  },
  handList: {
    gap: 12,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 8,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  targetName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  drawnLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 2,
  },
  pendingWrap: {
    padding: 20,
    gap: 6,
  },
  pendingFrom: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  pendingTo: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
  },
  pendingHint: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  counterSection: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A1450",
    backgroundColor: "#15042A",
  },
  counterLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  panic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  panicText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
  },
  voteCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
