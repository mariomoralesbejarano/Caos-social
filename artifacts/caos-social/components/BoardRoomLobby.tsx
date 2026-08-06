import {
  useCreateBarajaRoom,
  useJoinBarajaRoom,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { saveBarajaSession } from "@/lib/barajaSession";

const AVATARS = ["🦄", "🐙", "🦊", "🐲", "🦋", "🐸", "🦝", "🐼"];

export type BoardLobbyKind = "poker" | "parchis" | "oca";

interface BoardRoomLobbyProps {
  kind: BoardLobbyKind;
  title: string;
  subtitle: string;
  accent: string;
  maxPlayers: number;
  defaultMaxPlayers: number;
  onBack: string;
}

export default function BoardRoomLobby({
  kind,
  title,
  subtitle,
  accent,
  maxPlayers,
  defaultMaxPlayers,
  onBack,
}: BoardRoomLobbyProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [startingStack, setStartingStack] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(defaultMaxPlayers);
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateBarajaRoom();
  const joinMut = useJoinBarajaRoom();
  const busy = createMut.isPending || joinMut.isPending;
  const isPoker = kind === "poker";

  async function createRoom() {
    setError(null);
    if (!name.trim()) {
      setError("Escribe tu nombre");
      return;
    }
    if (isPoker && bigBlind <= smallBlind) {
      setError("La ciega grande debe ser mayor que la pequeña");
      return;
    }
    try {
      const result = await createMut.mutateAsync({
        gameId: kind,
        gameTitle: title,
        name: name.trim(),
        avatar,
        tableConfig: {
          maxPlayers: roomMaxPlayers,
          ...(isPoker
            ? { startingStack, smallBlind, bigBlind }
            : {}),
        },
      });
      await saveBarajaSession({
        roomCode: result.code,
        playerId: result.playerId,
        name: name.trim(),
        avatar,
      });
      router.replace("/baraja-room" as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function joinRoom() {
    setError(null);
    if (!name.trim() || !code.trim()) {
      setError("Necesitas nombre y código de sala");
      return;
    }
    try {
      const result = await joinMut.mutateAsync({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        avatar,
      });
      await saveBarajaSession({
        roomCode: result.code,
        playerId: result.playerId,
        name: name.trim(),
        avatar,
      });
      router.replace("/baraja-room" as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: (Platform.OS === "web" ? 60 : insets.top) + 18,
          paddingBottom: (Platform.OS === "web" ? 30 : insets.bottom) + 40,
        },
      ]}
    >
      <Pressable onPress={() => router.replace(onBack as never)} style={styles.back}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold" }}>
          ← Volver
        </Text>
      </Pressable>

      <View style={[styles.hero, { borderColor: accent + "55", backgroundColor: accent + "12" }]}>
        <Text style={[styles.kicker, { color: accent }]}>SALA MULTIJUGADOR</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>

      <View style={[styles.tabs, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {(["create", "join"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setMode(item);
              setError(null);
            }}
            style={[
              styles.tab,
              mode === item && { backgroundColor: accent + "25", borderColor: accent },
            ]}
          >
            <Text style={{ color: mode === item ? accent : colors.mutedForeground, fontFamily: "Inter_700Bold" }}>
              {item === "create" ? "CREAR SALA" : "UNIRSE"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.section, { color: colors.foreground }]}>Tu perfil</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre de jugador"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          maxLength={20}
        />
        <View style={styles.avatarRow}>
          {AVATARS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setAvatar(item)}
              style={[
                styles.avatar,
                {
                  borderColor: avatar === item ? accent : colors.border,
                  backgroundColor: avatar === item ? accent + "24" : colors.background,
                },
              ]}
            >
              <Text style={styles.avatarText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "join" ? (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Código de sala</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="ABCDE"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              style={[styles.input, styles.codeInput, { color: colors.foreground, borderColor: colors.border }]}
              maxLength={5}
            />
          </>
        ) : (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>Ajustes de sala</Text>
            <OptionRow
              label="Jugadores máximos"
              value={roomMaxPlayers}
              options={Array.from({ length: maxPlayers - 1 }, (_, index) => index + 2)}
              onChange={setRoomMaxPlayers}
              accent={accent}
              colors={colors}
            />
            {isPoker && (
              <>
                <OptionRow
                  label="Stack inicial por jugador"
                  value={startingStack}
                  options={[100, 500, 1000, 2500]}
                  onChange={setStartingStack}
                  accent={accent}
                  colors={colors}
                />
                <OptionRow
                  label="Ciega pequeña"
                  value={smallBlind}
                  options={[5, 10, 25, 50]}
                  onChange={setSmallBlind}
                  accent={accent}
                  colors={colors}
                />
                <OptionRow
                  label="Ciega grande"
                  value={bigBlind}
                  options={[10, 20, 50, 100]}
                  onChange={setBigBlind}
                  accent={accent}
                  colors={colors}
                />
              </>
            )}
          </>
        )}

        {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
        <Pressable
          onPress={mode === "create" ? createRoom : joinRoom}
          disabled={busy}
          style={[styles.cta, { backgroundColor: accent, opacity: busy ? 0.55 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator color="#12051D" />
          ) : (
            <Text style={styles.ctaText}>{mode === "create" ? "CREAR SALA" : "UNIRME A LA SALA"}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function OptionRow({
  label,
  value,
  options,
  onChange,
  accent,
  colors,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
  accent: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.option}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.optionButton,
              {
                borderColor: value === option ? accent : colors.border,
                backgroundColor: value === option ? accent + "24" : colors.background,
              },
            ]}
          >
            <Text style={{ color: value === option ? accent : colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12 }}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, gap: 14 },
  back: { alignSelf: "flex-start", paddingVertical: 6 },
  hero: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 6 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 4, gap: 5 },
  tab: { flex: 1, borderWidth: 1, borderColor: "transparent", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  section: { fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 3 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 3 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 14 },
  codeInput: { letterSpacing: 3, fontFamily: "Inter_700Bold" },
  avatarRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  avatar: { width: 42, height: 42, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22 },
  option: { gap: 6 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  optionButton: { minWidth: 58, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, alignItems: "center" },
  error: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  cta: { borderRadius: 10, alignItems: "center", paddingVertical: 14, marginTop: 4 },
  ctaText: { color: "#12051D", fontFamily: "Inter_700Bold", letterSpacing: 1 },
});