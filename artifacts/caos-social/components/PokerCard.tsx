import React from "react";
import { Image, StyleSheet, View } from "react-native";

export type PokerCardSuit = "spades" | "hearts" | "diamonds" | "clubs";

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
        <Image source={{ uri: "/cards/poker/card-back.png" }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      </View>
    );
  }
  return (
    <View style={[styles.card, { width, height }]}>
      <Image
        source={{ uri: `/cards/poker/${suit}-${rank}.png` }}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 9, backgroundColor: "#fffdf7", borderWidth: 1.5, borderColor: "#d7cdbd", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: .25, shadowRadius: 4, elevation: 3, position: "relative" },
  back: { backgroundColor: "#61233a", borderColor: "#f8d898", overflow: "hidden" },
});