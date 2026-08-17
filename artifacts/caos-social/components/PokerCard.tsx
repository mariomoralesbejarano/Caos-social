import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

export type PokerCardSuit = "spades" | "hearts" | "diamonds" | "clubs";

const SUIT_COLOR: Record<PokerCardSuit, string> = {
  spades: "#172338",
  hearts: "#c63552",
  diamonds: "#c63552",
  clubs: "#172338",
};

function SuitMark({ suit, size }: { suit: PokerCardSuit; size: number }) {
  const color = SUIT_COLOR[suit];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {suit === "hearts" && <Path d="M24 39 7 22C-3 11 12 1 24 13 36 1 51 11 41 22Z" fill={color} />}
      {suit === "diamonds" && <Path d="M24 4 40 24 24 44 8 24Z" fill={color} />}
      {suit === "spades" && <Path d="M24 5 42 25c4 5-2 12-8 8l-5-3v8h6v5H13v-5h6v-8l-5 3c-6 4-12-3-8-8Z" fill={color} />}
      {suit === "clubs" && <G fill={color}><Circle cx="24" cy="14" r="9" /><Circle cx="14" cy="25" r="9" /><Circle cx="34" cy="25" r="9" /><Path d="M21 23h6v17h7v5H14v-5h7Z" /></G>}
    </Svg>
  );
}

export default function PokerCard({ rank, suit, hidden = false, large = false }: {
  rank?: string;
  suit?: PokerCardSuit;
  hidden?: boolean;
  large?: boolean;
}) {
  const width = large ? 64 : 52;
  const height = large ? 90 : 72;
  if (hidden || !rank || !suit) {
    return (
      <View style={[styles.card, { width, height }, styles.back]}>
        <Image source={{ uri: "/assets/card-back-real.png" }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
        <View style={styles.backWash} />
        <Svg width={width - 14} height={height - 14} viewBox="0 0 100 140">
          <Rect x="4" y="4" width="92" height="132" rx="8" fill="none" stroke="#f8d898" strokeWidth="3" />
          <Path d="m50 22 15 48-15 48-15-48Z" fill="none" stroke="#f8d898" strokeWidth="2" opacity=".9" />
        </Svg>
      </View>
    );
  }
  const color = SUIT_COLOR[suit];
  return <View style={[styles.card, { width, height }]}>
    <View style={styles.corner}><Text style={[styles.rank, { color, fontSize: large ? 22 : 18 }]}>{rank}</Text><SuitMark suit={suit} size={large ? 13 : 11} /></View>
    <SuitMark suit={suit} size={large ? 32 : 25} />
    <View style={[styles.corner, styles.bottom]}><Text style={[styles.rank, { color, fontSize: large ? 22 : 18 }]}>{rank}</Text><SuitMark suit={suit} size={large ? 13 : 11} /></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 9, backgroundColor: "#fffdf7", borderWidth: 1.5, borderColor: "#d7cdbd", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: .25, shadowRadius: 4, elevation: 3, position: "relative" },
  back: { backgroundColor: "#61233a", borderColor: "#f8d898", overflow: "hidden" },
  backWash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#61233a", opacity: 0.35 },
  corner: { position: "absolute", top: 5, left: 6, alignItems: "center", gap: 1 },
  bottom: { top: undefined, bottom: 5, left: undefined, right: 6, transform: [{ rotate: "180deg" }] },
  rank: { fontFamily: "Inter_700Bold", lineHeight: 22 },
});