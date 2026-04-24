import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GameCard } from "@/constants/cards";
import { useColors } from "@/hooks/useColors";

interface Props {
  card: GameCard;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

const categoryColors: Record<string, [string, string]> = {
  reto: ["#39FF14", "#0a3d0a"],
  beber: ["#FF2D6F", "#3d0a1e"],
  ligar: ["#FF6BD6", "#3d0a2e"],
  fisico: ["#FFB800", "#3d2a0a"],
  poder: ["#B026FF", "#2a0a3d"],
  social: ["#26C9FF", "#0a2a3d"],
};

export function CardView({ card, onPress, selected, compact }: Props) {
  const colors = useColors();
  const grad = categoryColors[card.category] ?? ["#39FF14", "#0a3d0a"];
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrap,
          compact && styles.wrapCompact,
          selected && {
            borderColor: colors.primary,
            shadowColor: colors.primary,
            shadowOpacity: 0.9,
          },
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        <LinearGradient
          colors={[grad[1], "#0A0014"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: grad[0] }]} />
          <Text style={[styles.cat, { color: grad[0] }]}>
            {card.category.toUpperCase()}
          </Text>
          <Text style={[styles.points, { color: colors.foreground }]}>
            {card.points} pts
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {card.title}
        </Text>
        {!compact && (
          <>
            <Text style={[styles.effect, { color: colors.mutedForeground }]}>
              {card.effect}
            </Text>
            <View style={[styles.divider, { backgroundColor: grad[0] }]} />
            <Text style={[styles.powerLabel, { color: grad[0] }]}>PODER</Text>
            <Text style={[styles.power, { color: colors.foreground }]}>
              {card.power}
            </Text>
          </>
        )}

        {/* Botón de información (esquina superior derecha) */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setInfoOpen(true);
          }}
          hitSlop={14}
          accessibilityLabel="Más información"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.infoBtn,
            compact && styles.infoBtnCompact,
            {
              borderColor: grad[0],
              shadowColor: grad[0],
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Feather
            name="info"
            size={compact ? 14 : 18}
            color={grad[0]}
          />
        </Pressable>
      </Pressable>

      {/* Modal de detalle */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setInfoOpen(false)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                borderColor: grad[0],
                shadowColor: grad[0],
              },
            ]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <LinearGradient
              colors={[grad[1], "#0A0014"]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.modalHeader}>
              <View style={[styles.dot, { backgroundColor: grad[0] }]} />
              <Text style={[styles.cat, { color: grad[0] }]}>
                {card.category.toUpperCase()}
              </Text>
              <Text style={[styles.points, { color: colors.foreground }]}>
                {card.points} pts
              </Text>
              <Pressable
                onPress={() => setInfoOpen(false)}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityLabel="Cerrar"
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <Text
              style={[
                styles.modalTitle,
                {
                  color: "#FFFFFF",
                  textShadowColor: grad[0],
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 14,
                },
              ]}
            >
              {card.title}
            </Text>

            <ScrollView
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sectionLabel, { color: grad[0] }]}>
                EFECTO
              </Text>
              <Text style={[styles.sectionText, { color: colors.foreground }]}>
                {card.effect}
              </Text>

              <View
                style={[styles.divider, { backgroundColor: grad[0], opacity: 0.5 }]}
              />

              <Text style={[styles.sectionLabel, { color: grad[0] }]}>
                PODER / DETALLE
              </Text>
              <Text style={[styles.sectionText, { color: colors.foreground, fontStyle: "italic" }]}>
                {card.power}
              </Text>

              <View
                style={[styles.divider, { backgroundColor: grad[0], opacity: 0.5 }]}
              />

              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Text style={[styles.metaPillLabel, { color: grad[0] }]}>
                    PUNTOS
                  </Text>
                  <Text style={[styles.metaPillValue, { color: colors.foreground }]}>
                    {card.points}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={[styles.metaPillLabel, { color: grad[0] }]}>
                    CATEGORÍA
                  </Text>
                  <Text style={[styles.metaPillValue, { color: colors.foreground }]}>
                    {card.category}
                  </Text>
                </View>
                {card.isPower && (
                  <View style={styles.metaPill}>
                    <Text style={[styles.metaPillLabel, { color: grad[0] }]}>
                      TIPO
                    </Text>
                    <Text style={[styles.metaPillValue, { color: colors.foreground }]}>
                      Carta de poder
                    </Text>
                  </View>
                )}
                {card.custom && (
                  <View style={styles.metaPill}>
                    <Text style={[styles.metaPillLabel, { color: grad[0] }]}>
                      ORIGEN
                    </Text>
                    <Text style={[styles.metaPillValue, { color: colors.foreground }]}>
                      Personalizada
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setInfoOpen(false)}
              style={({ pressed }) => [
                styles.modalAction,
                {
                  borderColor: grad[0],
                  shadowColor: grad[0],
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.modalActionText,
                  {
                    color: grad[0],
                    textShadowColor: grad[0],
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                ENTENDIDO
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2A1450",
    padding: 18,
    overflow: "hidden",
    backgroundColor: "#15042A",
    shadowColor: "#B026FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
    minHeight: 220,
  },
  wrapCompact: {
    minHeight: 110,
    padding: 12,
    borderRadius: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingRight: 36,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cat: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    flex: 1,
  },
  points: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 8,
  },
  effect: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    opacity: 0.4,
    marginVertical: 12,
  },
  powerLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 4,
  },
  power: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  infoBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: "rgba(10, 0, 20, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  infoBtnCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    top: 6,
    right: 6,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(5, 0, 15, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 2,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#15042A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 28,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2.5,
    marginBottom: 6,
    marginTop: 4,
  },
  sectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  metaPillLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  metaPillValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "capitalize",
  },
  modalAction: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  modalActionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 3,
  },
});
