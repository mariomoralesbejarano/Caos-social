/**
 * SpanishCard — clean physical-style Spanish deck card.
 * Only the numeric value and a vector suit illustration are shown.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

export type Palo = "oros" | "copas" | "espadas" | "bastos";

export const PALO_COLOR: Record<Palo, string> = {
  oros: "#B7791F",
  copas: "#A35D18",
  espadas: "#315DA8",
  bastos: "#75451F",
};

export const PALO_BG: Record<Palo, string> = {
  oros: "#FFFDF5",
  copas: "#FFFDF5",
  espadas: "#FFFDF5",
  bastos: "#FFFDF5",
};

export const PALO_NAME: Record<Palo, string> = {
  oros: "Oros",
  copas: "Copas",
  espadas: "Espadas",
  bastos: "Bastos",
};

export const VALOR_SHORT: Record<number, string> = {
  1: "1", 2: "2", 3: "3", 4: "4", 5: "5",
  6: "6", 7: "7", 10: "10", 11: "11", 12: "12",
};

export const VALOR_PLURAL: Record<number, string> = {
  1: "Ases", 2: "Doses", 3: "Treses", 4: "Cuatros", 5: "Cincos",
  6: "Seises", 7: "Sietes", 10: "Sotas", 11: "Caballos", 12: "Reyes",
};

export const RANK_ORDER = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
export const VALID_CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;

type CardSize = "sm" | "md" | "lg";

const SIZES: Record<CardSize, {
  w: number;
  h: number;
  cornerNum: number;
  centerSym: number;
  cornerPad: number;
  borderRadius: number;
}> = {
  sm: { w: 52, h: 74, cornerNum: 14, centerSym: 22, cornerPad: 4, borderRadius: 8 },
  md: { w: 64, h: 92, cornerNum: 16, centerSym: 28, cornerPad: 5, borderRadius: 10 },
  lg: { w: 84, h: 120, cornerNum: 20, centerSym: 36, cornerPad: 7, borderRadius: 12 },
};

export interface SpanishCardProps {
  palo: Palo;
  valor: number;
  size?: CardSize;
  selected?: boolean;
  faceDown?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  onPress?: () => void;
}

export function SpanishCard({
  palo,
  valor,
  size = "sm",
  selected = false,
  faceDown = false,
  disabled = false,
  highlight = false,
  onPress,
}: SpanishCardProps) {
  if (!VALID_CARD_VALUES.includes(valor as (typeof VALID_CARD_VALUES)[number])) {
    return null;
  }

  const s = SIZES[size];
  const color = PALO_COLOR[palo];
  const short = VALOR_SHORT[valor];
  const bgColor = faceDown ? "#182033" : PALO_BG[palo];
  const borderColor = selected
    ? "#F59E0B"
    : highlight
      ? "#A855F7"
      : faceDown
        ? "#374151"
        : "#B8A98B";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: s.w,
          height: s.h,
          borderRadius: s.borderRadius,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: selected || highlight ? 2.5 : 1.5,
          opacity: disabled && !selected ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: selected ? 1.07 : 1 }],
          shadowColor: selected ? "#F59E0B" : highlight ? "#A855F7" : "#000",
          shadowOpacity: selected ? 0.6 : highlight ? 0.5 : 0.28,
          shadowRadius: selected ? 8 : 5,
          shadowOffset: { width: 0, height: selected ? 4 : 3 },
          elevation: selected ? 8 : 5,
        },
      ]}
    >
      {faceDown ? (
        <View style={[styles.faceDown, { borderRadius: s.borderRadius - 2 }]}>
          <CardBack size={s.centerSym * 1.5} />
        </View>
      ) : (
        <>
          <View style={[styles.corner, { top: s.cornerPad, left: s.cornerPad }]}>
            <Text style={[styles.cornerNum, { fontSize: s.cornerNum, color }]}>
              {short}
            </Text>
          </View>
          <View style={styles.center}>
            <SuitIllustration palo={palo} size={s.centerSym * 1.65} color={color} />
          </View>
          <View style={[styles.corner, styles.cornerBR, { bottom: s.cornerPad, right: s.cornerPad }]}>
            <Text style={[styles.cornerNum, { fontSize: s.cornerNum, color }]}>
              {short}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

function SuitIllustration({
  palo,
  size,
  color,
}: {
  palo: Palo;
  size: number;
  color: string;
}) {
  const goldEdge = "#8B5A17";
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {palo === "oros" && (
        <G>
          <Circle cx="24" cy="24" r="14" fill="#F4B728" stroke={goldEdge} strokeWidth="2" />
          <Circle cx="24" cy="24" r="9" fill="none" stroke="#FFE28A" strokeWidth="2" />
          <Path d="M19 18c3-2 7-2 10 0" fill="none" stroke="#FFF4BD" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="20" cy="27" r="1.5" fill="#FFF4BD" />
        </G>
      )}
      {palo === "copas" && (
        <G>
          <Path d="M10 10h28c0 11-5 17-12 18v7h7v4H15v-4h7v-7c-7-1-12-7-12-18Z" fill="#D8A629" stroke={goldEdge} strokeWidth="2" strokeLinejoin="round" />
          <Path d="M14 14h20c-1 6-4 10-10 11-6-1-9-5-10-11Z" fill="#F5D66B" />
          <Path d="M16 17c3 2 12 2 16 0" fill="none" stroke="#FFF2A8" strokeWidth="2" strokeLinecap="round" />
        </G>
      )}
      {palo === "espadas" && (
        <G stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M13 10 27 24 16 35" fill="none" />
          <Path d="M35 10 21 24 32 35" fill="none" />
          <Line x1="10" y1="34" x2="21" y2="23" />
          <Line x1="38" y1="34" x2="27" y2="23" />
          <Line x1="13" y1="37" x2="20" y2="37" />
          <Line x1="28" y1="37" x2="35" y2="37" />
        </G>
      )}
      {palo === "bastos" && (
        <G stroke="#75451F" strokeWidth="5" strokeLinecap="round">
          <Line x1="24" y1="38" x2="24" y2="16" />
          <Line x1="24" y1="23" x2="13" y2="12" />
          <Line x1="24" y1="27" x2="35" y2="15" />
          <Circle cx="12" cy="11" r="4" fill="#A9652D" strokeWidth="2" />
          <Circle cx="36" cy="14" r="4" fill="#A9652D" strokeWidth="2" />
          <Circle cx="24" cy="14" r="4" fill="#A9652D" strokeWidth="2" />
        </G>
      )}
    </Svg>
  );
}

function CardBack({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="4" y="4" width="40" height="40" rx="5" fill="none" stroke="#5C6B88" strokeWidth="2" />
      <Rect x="9" y="9" width="30" height="30" rx="3" fill="none" stroke="#33415F" strokeWidth="2" />
      <Path d="m24 12 4 12-4 12-4-12 4-12Z" fill="#5C6B88" opacity=".7" />
      <Circle cx="24" cy="24" r="3" fill="#A8B4CC" />
    </Svg>
  );
}

interface SpanishCardByIdProps extends Omit<SpanishCardProps, "palo" | "valor"> {
  cardId: string;
}

export function SpanishCardById({ cardId, ...rest }: SpanishCardByIdProps) {
  const [paloStr, valorStr] = cardId.split("-");
  const palo = (paloStr ?? "oros") as Palo;
  const valor = parseInt(valorStr ?? "1", 10);
  return <SpanishCard palo={palo} valor={valor} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
  },
  faceDown: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#374151",
  },
  corner: {
    position: "absolute",
    alignItems: "center",
  },
  cornerBR: {
    transform: [{ rotate: "180deg" }],
  },
  cornerNum: {
    fontFamily: "Inter_700Bold",
    lineHeight: undefined,
    includeFontPadding: false,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});