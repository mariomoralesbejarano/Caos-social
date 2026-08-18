/**
 * SpanishCard — clean physical-style Spanish deck card.
 * Only the numeric value and a vector suit illustration are shown.
 */
import React from "react";
import { Image, Pressable, StyleSheet } from "react-native";

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
          backgroundColor: faceDown ? "#182033" : PALO_BG[palo],
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
      <Image
        source={{
          uri: faceDown
            ? "/cards/spanish/card-back.png"
            : `/cards/spanish/${palo}-${valor}.png`,
        }}
        resizeMode="cover"
        style={[styles.cardImage, { borderRadius: s.borderRadius - 2 }]}
      />
    </Pressable>
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
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
});