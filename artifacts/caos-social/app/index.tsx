import { Feather } from "@expo/vector-icons";
import {
  CardTag,
  PackId,
  useCreateRoom,
  useJoinRoom,
} from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { NeonButton } from "@/components/NeonButton";
import { PACKS } from "@/constants/cards";
import { useRoom } from "@/contexts/RoomContext";
import { useColors } from "@/hooks/useColors";

const TAGS: { id: CardTag; label: string }[] = [
  { id: "abstemio", label: "Abstemio" },
  { id: "pareja", label: "Con pareja" },
  { id: "hardcore", label: "Hardcore" },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { session, room, hydrated, setSession } = useRoom();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pack, setPack] = useState<PackId>("allin");
  const [tags, setTags] = useState<CardTag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateRoom();
  const joinMut = useJoinRoom();

  // If session already loaded, jump to right screen
  useEffect(() => {
    if (!hydrated || !session || !room) return;
    if (room.status === "active") router.replace("/game");
    else router.replace("/players");
  }, [hydrated, session, room, router]);

  function toggleTag(tag: CardTag) {
    setTags((prev) => {
      const has = prev.includes(tag);
      let next = has ? prev.filter((t) => t !== tag) : [...prev, tag];
      if (!has && tag === "hardcore") next = ["hardcore"];
      else if (!has) next = next.filter((t) => t !== "hardcore");
      return next;
    });
  }

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError("Pon tu nombre");
      return;
    }
    try {
      const res = await createMut.mutateAsync({
        data: { name: name.trim(), pack, tags },
      });
      await setSession({
        roomCode: res.room.code,
        playerId: res.playerId,
        name: name.trim(),
      });
      router.replace("/players");
    } catch (e) {
      setError(extractErr(e));
    }
  }

  async function handleJoin() {
    setError(null);
    if (!name.trim() || !code.trim()) {
      setError("Necesitas nombre y código");
      return;
    }
    try {
      const res = await joinMut.mutateAsync({
        code: code.trim().toUpperCase(),
        data: { name: name.trim(), tags },
      });
      await setSession({
        roomCode: res.room.code,
        playerId: res.playerId,
        name: name.trim(),
      });
      router.replace(res.room.status === "active" ? "/game" : "/players");
    } catch (e) {
      setError(extractErr(e));
    }
  }

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const busy = createMut.isPending || joinMut.isPending;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 20,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 40,
        },
      ]}
    >
      <View style={styles.hero}>
        <Text style={[styles.tag, { color: colors.primary }]}>
          PARTY ONLINE · 18+
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          CAOS{"\n"}
          <Text style={{ color: colors.secondary }}>SOCIAL</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Crea una sala, comparte el código y mandad cartas a vuestros amigos
          desde cada móvil cuando queráis.
        </Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setMode("create")}
          style={[
            styles.tab,
            {
              borderColor: mode === "create" ? colors.primary : colors.border,
              backgroundColor: mode === "create" ? colors.primary + "22" : colors.card,
            },
          ]}
        >
          <Feather
            name="plus-circle"
            size={16}
            color={mode === "create" ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: mode === "create" ? colors.primary : colors.mutedForeground },
            ]}
          >
            Crear sala
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("join")}
          style={[
            styles.tab,
            {
              borderColor: mode === "join" ? colors.secondary : colors.border,
              backgroundColor: mode === "join" ? colors.secondary + "22" : colors.card,
            },
          ]}
        >
          <Feather
            name="log-in"
            size={16}
            color={mode === "join" ? colors.secondary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: mode === "join" ? colors.secondary : colors.mutedForeground },
            ]}
          >
            Unirme
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          TU NOMBRE
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Cómo te llaman"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
      </View>

      {mode === "join" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            CÓDIGO DE SALA
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABCDE"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            maxLength={5}
            style={[
              styles.input,
              styles.codeInput,
              {
                color: colors.primary,
                borderColor: colors.primary,
                backgroundColor: colors.card,
              },
            ]}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          ROL (puedes cambiarlo después)
        </Text>
        <View style={styles.tagRow}>
          {TAGS.map((t) => {
            const active = tags.includes(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => toggleTag(t.id)}
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
              </Pressable>
            );
          })}
        </View>
      </View>

      {mode === "create" && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            PACK DE CARTAS
          </Text>
          {PACKS.map((p) => {
            const active = pack === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPack(p.id)}
                style={[
                  styles.packCard,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: colors.card,
                    shadowColor: active ? colors.primary : "transparent",
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    active
                      ? p.id === "allin"
                        ? ["#3d0a1e", "#15042A"]
                        : ["#1a4d0a", "#15042A"]
                      : ["#15042A", "#15042A"]
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.packHead}>
                    <Text style={[styles.packName, { color: colors.foreground }]}>
                      {p.name}
                    </Text>
                    {p.id === "allin" && (
                      <Text
                        style={[
                          styles.packBadge,
                          {
                            color: colors.destructive,
                            borderColor: colors.destructive,
                          },
                        ]}
                      >
                        TODO MEZCLADO
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.packDesc, { color: colors.mutedForeground }]}>
                    {p.description}
                  </Text>
                </View>
                {active && (
                  <Feather name="check-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {error && (
        <View style={[styles.errorBox, { borderColor: colors.destructive }]}>
          <Text style={{ color: colors.destructive, textAlign: "center" }}>
            {error}
          </Text>
        </View>
      )}

      <NeonButton
        label={
          busy
            ? "..."
            : mode === "create"
              ? "CREAR SALA"
              : "ENTRAR EN LA SALA"
        }
        onPress={mode === "create" ? handleCreate : handleJoin}
        disabled={busy}
        variant={mode === "create" ? "primary" : "secondary"}
        style={{ marginTop: 4 }}
      />

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Sin alcohol, sin riesgos, sin gastos. Solo caos del bueno.
      </Text>
    </ScrollView>
  );
}

function extractErr(e: unknown): string {
  const err = e as { data?: { error?: string }; message?: string };
  return err?.data?.error ?? err?.message ?? "Error inesperado";
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { gap: 8 },
  tag: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 3 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  tabText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  section: { gap: 8 },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  codeInput: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: 8,
    textAlign: "center",
    borderWidth: 2,
  },
  tagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tagChip: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  tagChipText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  packCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    marginBottom: 8,
  },
  packHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  packName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  packBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  packDesc: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});
