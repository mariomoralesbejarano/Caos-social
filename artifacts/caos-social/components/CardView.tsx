import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

  return (
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
    </Pressable>
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
    marginVertical: 8,
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
});
