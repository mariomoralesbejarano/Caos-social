/**
 * CustomDeckModal — Crea un mazo personalizado:
 *   · Pestaña "Nueva carta": rellena título, efecto y puntos desde cero.
 *   · Pestaña "Importar carta": busca en los mazos oficiales, selecciona una
 *     carta, edita su texto/puntos y añádela al mazo personalizado.
 * Todas las cartas se guardan en room.customCards vía useAddCustomCard.
 */
import { Feather } from "@expo/vector-icons";
import {
  ALL_CARDS,
  GameCard,
  PackId,
  RoomState,
  getPackCardIds,
  useAddCustomCard,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { NeonButton } from "@/components/NeonButton";
import { useColors } from "@/hooks/useColors";

// ── helpers ────────────────────────────────────────────────────────────────

const PACK_LABELS: Record<string, string> = {
  banco: "El Banco",
  after: "After",
  "tercer-tiempo": "Tercer Tiempo",
  clasico: "Clásico",
  discoteca: "Discoteca",
  cena: "Cena",
  gimnasio: "Gimnasio",
  tardeo: "Tardeo",
  feria: "Feria",
  familiar: "Familiar",
  noche: "Noche",
  estrategico: "Estratégico",
};

// ── component ──────────────────────────────────────────────────────────────

export function CustomDeckModal({
  room,
  session,
  onClose,
  onChanged,
}: {
  room: RoomState;
  session: { playerId: string; roomCode: string };
  onClose: () => void;
  onChanged: () => void;
}) {
  const colors = useColors();
  const addMut = useAddCustomCard();

  // ── Tab state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"new" | "import">("new");

  // ── "Nueva carta" state ────────────────────────────────────────────────
  const [deckName, setDeckName] = useState("Mazo Local");
  const [newTitle, setNewTitle] = useState("");
  const [newEffect, setNewEffect] = useState("");
  const [newPoints, setNewPoints] = useState("2");
  const [newCooldown, setNewCooldown] = useState("15");
  const [newErr, setNewErr] = useState<string | null>(null);
  const [newOk, setNewOk] = useState(false);

  // ── "Importar carta" state ─────────────────────────────────────────────
  const [filterPack, setFilterPack] = useState<PackId | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GameCard | null>(null);
  const [impTitle, setImpTitle] = useState("");
  const [impEffect, setImpEffect] = useState("");
  const [impPoints, setImpPoints] = useState("2");
  const [impCooldown, setImpCooldown] = useState("15");
  const [impErr, setImpErr] = useState<string | null>(null);
  const [impOk, setImpOk] = useState(false);

  // All official packs (excluding "allin" which is a meta-pack)
  const officialPacks = useMemo(
    () =>
      Object.keys(PACK_LABELS).filter(
        (p) => p !== "allin",
      ) as PackId[],
    [],
  );

  // Cards visible in the import list
  const importCards = useMemo(() => {
    const packIds = filterPack ? [filterPack] : officialPacks;
    const ids = packIds.flatMap((p) => getPackCardIds(p));
    const unique = Array.from(new Set(ids));
    const cards = unique
      .map((id) => ALL_CARDS.find((c) => c.id === id))
      .filter(Boolean) as GameCard[];
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.effect.toLowerCase().includes(q),
    );
  }, [filterPack, search, officialPacks]);

  // ── "Nueva carta" handler ──────────────────────────────────────────────
  async function handleAddNew() {
    setNewErr(null);
    setNewOk(false);
    if (newTitle.trim().length < 3 || newEffect.trim().length < 3) {
      setNewErr("Título y efecto requeridos (mín. 3 caracteres)");
      return;
    }
    const pts = Math.max(1, parseInt(newPoints, 10) || 2);
    const cooldownMinutes = Math.max(1, parseInt(newCooldown, 10) || 15);
    try {
      await addMut.mutateAsync({
        code: room.code,
        data: {
          playerId: session.playerId,
          title: newTitle.trim().slice(0, 60),
          effect: newEffect.trim().slice(0, 200),
          points: pts,
          cooldownMinutes,
        },
      });
      setNewTitle("");
      setNewEffect("");
      setNewPoints("2");
      setNewCooldown("15");
      setNewOk(true);
      setTimeout(() => setNewOk(false), 2000);
      onChanged();
    } catch (e: unknown) {
      const err = e as { data?: { error?: string }; message?: string };
      setNewErr(err?.data?.error ?? err?.message ?? "Error al añadir");
    }
  }

  // ── "Importar carta" handler ───────────────────────────────────────────
  function handleSelectCard(card: GameCard) {
    setSelected(card);
    setImpTitle(card.title);
    setImpEffect(card.effect);
    setImpPoints(String(card.points));
    setImpCooldown(String(card.cooldownMinutes ?? 15));
    setImpErr(null);
    setImpOk(false);
  }

  async function handleImport() {
    if (!selected) return;
    setImpErr(null);
    setImpOk(false);
    if (impTitle.trim().length < 3 || impEffect.trim().length < 3) {
      setImpErr("Título y efecto requeridos (mín. 3 caracteres)");
      return;
    }
    const pts = Math.max(1, parseInt(impPoints, 10) || selected.points);
    const cooldownMinutes = Math.max(1, parseInt(impCooldown, 10) || selected.cooldownMinutes || 15);
    try {
      await addMut.mutateAsync({
        code: room.code,
        data: {
          playerId: session.playerId,
          title: impTitle.trim().slice(0, 60),
          effect: impEffect.trim().slice(0, 200),
          points: pts,
          cooldownMinutes,
        },
      });
      setImpOk(true);
      setTimeout(() => { setImpOk(false); setSelected(null); }, 1800);
      onChanged();
    } catch (e: unknown) {
      const err = e as { data?: { error?: string }; message?: string };
      setImpErr(err?.data?.error ?? err?.message ?? "Error al importar");
    }
  }

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.overlay]}>
        {/* Header */}
        <View
          style={[
            s.header,
            { borderBottomColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[s.headerTitle, { color: colors.foreground }]}>
            ➕ Crear Mazo Personalizado
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Deck name row */}
        <View
          style={[
            s.deckNameRow,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <Feather name="box" size={14} color={colors.secondary} style={{ marginTop: 2 }} />
          <TextInput
            value={deckName}
            onChangeText={setDeckName}
            placeholder="Nombre del mazo"
            placeholderTextColor={colors.mutedForeground}
            maxLength={40}
            style={[s.deckNameInput, { color: colors.foreground }]}
          />
          {room.customCards?.length > 0 && (
            <Text style={[s.cardCount, { color: colors.primary }]}>
              {room.customCards.length} carta{room.customCards.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {/* Tabs */}
        <View
          style={[s.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        >
          {(["new", "import"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                s.tabBtn,
                tab === t && { borderBottomColor: colors.secondary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  s.tabLabel,
                  { color: tab === t ? colors.secondary : colors.mutedForeground },
                ]}
              >
                {t === "new" ? "✏️  Nueva carta" : "📦  Importar de mazos"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Tab: Nueva carta ── */}
        {tab === "new" && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.tabContent, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>TÍTULO</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Ej: Brindis del jefe"
              placeholderTextColor={colors.mutedForeground}
              maxLength={60}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>EFECTO / RETO</Text>
            <TextInput
              value={newEffect}
              onChangeText={setNewEffect}
              placeholder="Describe qué tiene que hacer el jugador..."
              placeholderTextColor={colors.mutedForeground}
              maxLength={200}
              multiline
              style={[
                s.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  minHeight: 80,
                  textAlignVertical: "top",
                },
              ]}
            />

            <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>PUNTOS / CASTIGO</Text>
            <TextInput
              value={newPoints}
              onChangeText={(v) => setNewPoints(v.replace(/[^0-9]/g, ""))}
              placeholder="2"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={3}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
              COOLDOWN (minutos) · ⏱ cuánto esperar antes de poder tirarla de nuevo
            </Text>
            <View style={s.cooldownRow}>
              {[5, 10, 15, 20, 30].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setNewCooldown(String(v))}
                  style={[
                    s.cdChip,
                    {
                      borderColor: newCooldown === String(v) ? colors.secondary : colors.border,
                      backgroundColor: newCooldown === String(v) ? colors.secondary + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={[s.cdChipText, { color: newCooldown === String(v) ? colors.secondary : colors.mutedForeground }]}>
                    {v} min
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={newCooldown}
              onChangeText={(v) => setNewCooldown(v.replace(/[^0-9]/g, ""))}
              placeholder="15"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={3}
              style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 6 }]}
            />

            {newErr && (
              <Text style={[s.errText, { color: colors.destructive }]}>{newErr}</Text>
            )}
            {newOk && (
              <Text style={[s.okText, { color: colors.primary }]}>✓ Carta añadida al mazo</Text>
            )}

            <NeonButton
              label={addMut.isPending ? "Añadiendo…" : "➕ AÑADIR AL MAZO"}
              variant="secondary"
              onPress={handleAddNew}
              disabled={addMut.isPending}
              style={{ marginTop: 8 }}
            />
          </ScrollView>
        )}

        {/* ── Tab: Importar de mazos ── */}
        {tab === "import" && (
          <View style={{ flex: 1 }}>
            {/* Pack filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ maxHeight: 44, flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 8, gap: 8 }}
            >
              <Pressable
                onPress={() => setFilterPack(null)}
                style={[
                  s.chip,
                  {
                    borderColor: !filterPack ? colors.primary : colors.border,
                    backgroundColor: !filterPack ? colors.primary + "22" : "transparent",
                  },
                ]}
              >
                <Text style={[s.chipText, { color: !filterPack ? colors.primary : colors.mutedForeground }]}>
                  TODOS
                </Text>
              </Pressable>
              {officialPacks.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setFilterPack(filterPack === p ? null : p)}
                  style={[
                    s.chip,
                    {
                      borderColor: filterPack === p ? colors.primary : colors.border,
                      backgroundColor: filterPack === p ? colors.primary + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={[s.chipText, { color: filterPack === p ? colors.primary : colors.mutedForeground }]}>
                    {(PACK_LABELS[p] ?? p).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Search */}
            <View style={[s.searchRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="search" size={14} color={colors.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar carta…"
                placeholderTextColor={colors.mutedForeground}
                style={[s.searchInput, { color: colors.foreground }]}
              />
            </View>

            {/* Card list + edit panel */}
            {selected ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[s.tabContent, { paddingBottom: 40 }]}
                keyboardShouldPersistTaps="handled"
              >
                <Pressable onPress={() => setSelected(null)} style={s.backBtn}>
                  <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                  <Text style={[s.backBtnText, { color: colors.mutedForeground }]}>Volver a la lista</Text>
                </Pressable>
                <Text style={[s.impCardOrigin, { color: colors.mutedForeground }]}>
                  Importando desde: <Text style={{ color: colors.secondary }}>{selected.pack?.toUpperCase() ?? "OFICIAL"}</Text>
                </Text>

                <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 10 }]}>TÍTULO (editable)</Text>
                <TextInput
                  value={impTitle}
                  onChangeText={setImpTitle}
                  maxLength={60}
                  style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />

                <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>EFECTO / RETO (editable)</Text>
                <TextInput
                  value={impEffect}
                  onChangeText={setImpEffect}
                  maxLength={200}
                  multiline
                  style={[
                    s.input,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      minHeight: 80,
                      textAlignVertical: "top",
                    },
                  ]}
                />

                <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>PUNTOS</Text>
                <TextInput
                  value={impPoints}
                  onChangeText={(v) => setImpPoints(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />

                <Text style={[s.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
                  COOLDOWN (minutos) · ⏱ cooldown original: {selected?.cooldownMinutes ?? 15} min
                </Text>
                <View style={s.cooldownRow}>
                  {[5, 10, 15, 20, 30].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setImpCooldown(String(v))}
                      style={[
                        s.cdChip,
                        {
                          borderColor: impCooldown === String(v) ? colors.secondary : colors.border,
                          backgroundColor: impCooldown === String(v) ? colors.secondary + "22" : "transparent",
                        },
                      ]}
                    >
                      <Text style={[s.cdChipText, { color: impCooldown === String(v) ? colors.secondary : colors.mutedForeground }]}>
                        {v} min
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={impCooldown}
                  onChangeText={(v) => setImpCooldown(v.replace(/[^0-9]/g, ""))}
                  placeholder="15"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 6 }]}
                />

                {impErr && (
                  <Text style={[s.errText, { color: colors.destructive }]}>{impErr}</Text>
                )}
                {impOk && (
                  <Text style={[s.okText, { color: colors.primary }]}>✓ Carta importada al mazo</Text>
                )}

                {addMut.isPending ? (
                  <ActivityIndicator color={colors.secondary} style={{ marginTop: 12 }} />
                ) : (
                  <NeonButton
                    label="➕ AÑADIR AL MAZO"
                    variant="secondary"
                    onPress={handleImport}
                    style={{ marginTop: 8 }}
                  />
                )}
              </ScrollView>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, gap: 6, paddingBottom: 40 }}
              >
                {importCards.length === 0 && (
                  <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 32, fontFamily: "Inter_400Regular" }}>
                    Sin resultados
                  </Text>
                )}
                {importCards.map((card) => (
                  <Pressable
                    key={card.id}
                    onPress={() => handleSelectCard(card)}
                    style={[
                      s.cardRow,
                      { borderColor: colors.border, backgroundColor: colors.card },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
                      <Text style={[s.cardEffect, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {card.effect}
                      </Text>
                      <Text style={[s.cardMeta, { color: colors.mutedForeground }]}>
                        {PACK_LABELS[card.pack ?? ""] ?? card.pack} · {card.points} pts · ⏱ {card.cooldownMinutes ?? 15} min
                      </Text>
                    </View>
                    <Feather name="plus-circle" size={20} color={colors.secondary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.93)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  deckNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  deckNameInput: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  cardCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabContent: {
    padding: 20,
    gap: 4,
  },
  fieldLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  errText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  okText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  cardEffect: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  cardMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  impCardOrigin: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  cooldownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  cdChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  cdChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
});
