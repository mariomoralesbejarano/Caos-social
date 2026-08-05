/**
 * SpanishCard — visual component for a single Baraja Española card.
 * Sizes: "sm" (hand), "md" (trick), "lg" (forehead/showcase).
 * Renders face-down variant when faceDown=true.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// ─── Design tokens ────────────────────────────────────────────────────────────

export type Palo = "oros" | "copas" | "espadas" | "bastos";

export const PALO_COLOR: Record<Palo, string> = {
  oros:    "#D97706", // amber-600
  copas:   "#DC2626", // red-600
  espadas: "#2563EB", // blue-600
  bastos:  "#16A34A", // green-600
};
export const PALO_BG: Record<Palo, string> = {
  oros:    "#FEF3C7", // amber-50
  copas:   "#FEE2E2", // red-50
  espadas: "#DBEAFE", // blue-50
  bastos:  "#DCFCE7", // green-50
};
export const PALO_SYMBOL: Record<Palo, string> = {
  oros:    "🟡",
  copas:   "🍷",
  espadas: "⚔️",
  bastos:  "🪵",
};
export const PALO_NAME: Record<Palo, string> = {
  oros:    "Oros",
  copas:   "Copas",
  espadas: "Espadas",
  bastos:  "Bastos",
};

export const VALOR_SHORT: Record<number, string> = {
  1: "1", 2: "2", 3: "3", 4: "4", 5: "5",
  6: "6", 7: "7", 10: "10", 11: "11", 12: "12",
};
export const VALOR_LONG: Record<number, string> = {
  1: "As", 2: "2", 3: "3", 4: "4", 5: "5",
  6: "6", 7: "7", 10: "Sota", 11: "Caballo", 12: "Rey",
};
export const VALOR_PLURAL: Record<number, string> = {
  1: "Ases", 2: "Doses", 3: "Treses", 4: "Cuatros", 5: "Cincos",
  6: "Seises", 7: "Sietes", 10: "Sotas", 11: "Caballos", 12: "Reyes",
};

// ─── Rank strength display (for help text) ────────────────────────────────────
// As > 3 > Rey > Caballo > Sota > 7 > 6 > 5 > 4 > 2
export const RANK_ORDER = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
export const VALID_CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;

// ─── Size presets ─────────────────────────────────────────────────────────────
type CardSize = "sm" | "md" | "lg";

const SIZES: Record<CardSize, {
  w: number; h: number;
  cornerNum: number; cornerSym: number;
  centerSym: number; figureText: number;
  cornerPad: number; borderRadius: number;
}> = {
  sm: { w: 52,  h: 74,  cornerNum: 14, cornerSym: 13, centerSym: 22, figureText: 9,  cornerPad: 4,  borderRadius: 8  },
  md: { w: 64,  h: 92,  cornerNum: 16, cornerSym: 15, centerSym: 28, figureText: 10, cornerPad: 5,  borderRadius: 10 },
  lg: { w: 84,  h: 120, cornerNum: 20, cornerSym: 18, centerSym: 36, figureText: 12, cornerPad: 7,  borderRadius: 12 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface SpanishCardProps {
  palo: Palo;
  valor: number;
  size?: CardSize;
  selected?: boolean;
  faceDown?: boolean;
  disabled?: boolean;
  /** Show a glow highlight (e.g. trick winner) */
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
  // The Spanish deck has no 8 or 9. Do not render an invalid card even if a
  // stale or malformed room payload reaches the component.
  if (!VALID_CARD_VALUES.includes(valor as (typeof VALID_CARD_VALUES)[number])) {
    return null;
  }

  const s = SIZES[size];
  const color  = PALO_COLOR[palo];
  const bgColor = faceDown ? "#1e1e2e" : "#FFFDF5";
  const short  = VALOR_SHORT[valor] ?? String(valor);
  const sym    = PALO_SYMBOL[palo];
  const isFigure = valor >= 10;
  const longName = VALOR_LONG[valor] ?? String(valor);

  const borderColor = selected
    ? "#F59E0B"      // gold when selected
    : highlight
    ? "#A855F7"      // purple for trick winner
    : faceDown
    ? "#374151"      // dark back
    : "#B8A98B";

  const elevation = selected ? 8 : 3;

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
        // ── Back of card ──
        <View style={[styles.faceDown, { borderRadius: s.borderRadius - 2 }]}>
          <Text style={{ fontSize: s.centerSym * 0.7, opacity: 0.4 }}>🃏</Text>
        </View>
      ) : (
        <>
          {/* ── Top-left corner ── */}
          <View style={[styles.corner, { top: s.cornerPad, left: s.cornerPad }]}>
            <Text style={[styles.cornerNum, { fontSize: s.cornerNum, color }]}>
              {short}
            </Text>
            <Text style={[styles.cornerSym, { fontSize: s.cornerSym }]}>
              {sym}
            </Text>
          </View>

          {/* ── Center ── */}
          <View style={styles.center}>
            {isFigure ? (
              <View style={styles.figureCenter}>
                <Text style={[styles.centerSymText, { fontSize: s.centerSym * 0.9 }]}>
                  {sym}
                </Text>
                <Text
                  style={[
                    styles.figureLabel,
                    { fontSize: s.figureText, color, letterSpacing: 0.5 },
                  ]}
                >
                  {longName.toUpperCase()}
                </Text>
              </View>
            ) : (
              <Text style={[styles.centerSymText, { fontSize: s.centerSym }]}>
                {sym}
              </Text>
            )}
          </View>

          {/* ── Bottom-right corner (rotated) ── */}
          <View
            style={[
              styles.corner,
              styles.cornerBR,
              { bottom: s.cornerPad, right: s.cornerPad },
            ]}
          >
            <Text style={[styles.cornerNum, { fontSize: s.cornerNum, color }]}>
              {short}
            </Text>
            <Text style={[styles.cornerSym, { fontSize: s.cornerSym }]}>
              {sym}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

// ─── Convenience: render from a card ID ("oros-7", "copas-12", etc.) ─────────

interface SpanishCardByIdProps
  extends Omit<SpanishCardProps, "palo" | "valor"> {
  cardId: string;
}

export function SpanishCardById({ cardId, ...rest }: SpanishCardByIdProps) {
  const [paloStr, valorStr] = cardId.split("-");
  const palo = (paloStr ?? "oros") as Palo;
  const valor = parseInt(valorStr ?? "1", 10);
  return <SpanishCard palo={palo} valor={valor} {...rest} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  cornerSym: {
    lineHeight: undefined,
    includeFontPadding: false,
    marginTop: -2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerSymText: {
    lineHeight: undefined,
    textAlign: "center",
  },
  figureCenter: {
    alignItems: "center",
    gap: 2,
  },
  figureLabel: {
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    color: "#171717",
  },
});
