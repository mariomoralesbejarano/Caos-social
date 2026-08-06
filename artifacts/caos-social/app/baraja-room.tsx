/**
 * Baraja Room — lobby/waiting screen before the game starts.
 * Shows connected players, room code, and a Start button for the owner.
 * Auto-navigates to the game screen when status becomes "active".
 */
import {
  getBarajaRoomQueryKey,
  useGetBarajaRoom,
  useLeaveBarajaRoom,
  useStartBarajaGame,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  BarajaSession,
  clearBarajaSession,
  loadBarajaSession,
} from "@/lib/barajaSession";

export default function BarajaRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<BarajaSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const navigatedRef = useRef(false);

  useEffect(() => {
    loadBarajaSession().then((s) => {
      setSession(s);
      setHydrated(true);
    });
  }, []);

  const { data: room, isLoading } = useGetBarajaRoom(
    session?.roomCode ?? "",
    session?.playerId ?? "",
  );

  const startMut = useStartBarajaGame();
  const leaveMut = useLeaveBarajaRoom();

  // Auto-navigate when game starts
  useEffect(() => {
    if (!room || navigatedRef.current) return;
    if (room.status === "active") {
      navigatedRef.current = true;
      const gameId = room.gameId;
      if (gameId === "apuestas") {
        router.replace("/baraja-apuestas" as never);
      } else if (gameId === "mentiroso") {
        router.replace("/baraja-mentiroso" as never);
      } else if (gameId === "poker") {
        router.replace("/poker-room" as never);
      } else {
        // Generic fallback: go to rules/waiting view
        router.replace("/baraja" as never);
      }
    }
  }, [room, router]);

  async function handleCopy() {
    if (!room) return;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined") {
        await navigator.clipboard.writeText(room.code);
      } else {
        Clipboard.setString(room.code);
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStart() {
    if (!session || !room) return;
    setStartError(null);
    try {
      await startMut.mutateAsync({ code: room.code, playerId: session.playerId });
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleLeave() {
    if (!session || !room) return;
    await leaveMut.mutateAsync({ code: room.code, playerId: session.playerId });
    await clearBarajaSession();
    router.replace("/baraja" as never);
  }

  if (!hydrated || (session && isLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session || !room) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          No se pudo cargar la sala.
        </Text>
        <Pressable
          onPress={() => router.replace("/baraja" as never)}
          style={[styles.btn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold" }}>
            ← Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = room.ownerId === session.playerId;
  const canStart = isOwner && room.players.length >= 2;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 24, paddingBottom: 48 },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.heroRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            · SALA MULTIJUGADOR ·
          </Text>
          <Text style={[styles.gameTitle, { color: colors.primary }]}>
            {room.gameTitle}
          </Text>
        </View>
        <Pressable
          onPress={handleLeave}
          style={[styles.leaveBtn, { borderColor: colors.destructive }]}
        >
          <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold", fontSize: 12 }}>
            SALIR
          </Text>
        </Pressable>
      </View>

      {/* ── Room code ── */}
      <Pressable
        onPress={handleCopy}
        style={[styles.codeCard, { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}
      >
        <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
          CÓDIGO DE SALA (toca para copiar)
        </Text>
        <Text style={[styles.codeValue, { color: colors.primary }]}>
          {room.code}
        </Text>
        {copied && (
          <Text style={[styles.codeCopied, { color: colors.primary }]}>
            ✓ Copiado
          </Text>
        )}
      </Pressable>

      {/* ── Players ── */}
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          👥 Jugadores ({room.players.length}/8)
        </Text>
        {room.players.map((p) => (
          <View
            key={p.id}
            style={[
              styles.playerRow,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={styles.playerAvatar}>{p.avatar}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.playerName, { color: colors.foreground }]}>
                {p.name}
                {p.id === room.ownerId && (
                  <Text style={{ color: colors.primary }}> 👑</Text>
                )}
                {p.id === session.playerId && (
                  <Text style={{ color: colors.secondary }}> (tú)</Text>
                )}
              </Text>
            </View>
            <View
              style={[
                styles.connDot,
                { backgroundColor: p.connected ? colors.primary : colors.mutedForeground },
              ]}
            />
          </View>
        ))}
      </View>

      {/* ── Start or waiting ── */}
      {isOwner ? (
        <View style={{ gap: 10 }}>
          {room.players.length < 2 && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Esperando más jugadores (mínimo 2)…
            </Text>
          )}
          {startError && (
            <Text style={[styles.hint, { color: colors.destructive }]}>{startError}</Text>
          )}
          <Pressable
            onPress={handleStart}
            disabled={!canStart || startMut.isPending}
            style={[
              styles.startBtn,
              {
                borderColor: colors.primary,
                backgroundColor: colors.primary + (canStart ? "33" : "11"),
                shadowColor: colors.primary,
                opacity: canStart ? 1 : 0.45,
              },
            ]}
          >
            {startMut.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.startBtnText, { color: colors.primary }]}>
                🚀  INICIAR JUEGO
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.waitingCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ActivityIndicator color={colors.secondary} size="small" />
          <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
            Esperando al anfitrión para iniciar…
          </Text>
        </View>
      )}

      {/* ── Log ── */}
      {room.log.length > 0 && (
        <View style={[styles.logCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8 }]}>
            📋 Actividad
          </Text>
          {room.log.slice().reverse().slice(0, 8).map((entry, i) => (
            <Text key={i} style={[styles.logEntry, { color: colors.mutedForeground }]}>
              {entry}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  errorText: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },

  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 },
  gameTitle: { fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, marginTop: 4 },
  leaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    marginTop: 8,
  },

  codeCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  codeLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.5 },
  codeValue: { fontFamily: "Inter_700Bold", fontSize: 42, letterSpacing: 8 },
  codeCopied: { fontFamily: "Inter_500Medium", fontSize: 12 },

  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 0 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 12 },

  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerAvatar: { fontSize: 28, lineHeight: 34 },
  playerName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  connDot: { width: 8, height: 8, borderRadius: 4 },

  hint: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 1.5 },

  waitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  waitingText: { fontFamily: "Inter_400Regular", fontSize: 14 },

  logCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  logEntry: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
});
