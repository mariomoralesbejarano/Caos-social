import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
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
import { CardTag } from "@/constants/cards";
import { useGame } from "@/contexts/GameContext";
import { useColors } from "@/hooks/useColors";

const TAG_INFO: { id: CardTag; label: string; desc: string }[] = [
  { id: "abstemio", label: "Abstemio", desc: "No recibe cartas de beber" },
  { id: "pareja", label: "Con Pareja", desc: "No recibe cartas de ligar" },
  { id: "hardcore", label: "Hardcore", desc: "Recibe todo · doble puntos" },
];

export default function PlayersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { players, addPlayer, removePlayer, togglePlayerTag } = useGame();
  const [name, setName] = useState("");
  const isWeb = Platform.OS === "web";

  function submit() {
    if (!name.trim()) return;
    addPlayer(name);
    setName("");
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: (isWeb ? 34 : insets.bottom) + 40 },
      ]}
    >
      <View style={styles.row}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre del jugador"
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={submit}
          returnKeyType="done"
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
        <NeonButton label="Añadir" onPress={submit} small />
      </View>

      {players.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Feather name="user-plus" size={40} color={colors.mutedForeground} />
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Añade jugadores para comenzar a jugar.
          </Text>
        </View>
      ) : (
        players.map((p) => (
          <View
            key={p.id}
            style={[
              styles.playerCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.playerHead}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {p.name}
              </Text>
              <Pressable
                onPress={() => removePlayer(p.id)}
                hitSlop={10}
                style={styles.deleteBtn}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            </View>
            <Text style={[styles.tagLabel, { color: colors.mutedForeground }]}>
              ETIQUETAS DE ROL
            </Text>
            <View style={styles.tagsRow}>
              {TAG_INFO.map((t) => {
                const active = p.tags.includes(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => togglePlayerTag(p.id, t.id)}
                    style={[
                      styles.tag,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active
                          ? colors.primary + "22"
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: active ? colors.primary : colors.mutedForeground,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text
                      style={[
                        styles.tagDesc,
                        {
                          color: active
                            ? colors.foreground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {t.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  playerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  playerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  deleteBtn: {
    padding: 4,
  },
  tagLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  tagDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
});
