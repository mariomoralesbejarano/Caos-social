import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

type DiceRollerProps = {
  values: number[] | null;
  count?: number;
  onRoll: () => Promise<void> | void;
  disabled?: boolean;
  accent?: string;
  label?: string;
};

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[31, 31], [69, 69]],
  3: [[31, 31], [50, 50], [69, 69]],
  4: [[31, 31], [69, 31], [31, 69], [69, 69]],
  5: [[31, 31], [69, 31], [50, 50], [31, 69], [69, 69]],
  6: [[31, 28], [31, 50], [31, 72], [69, 28], [69, 50], [69, 72]],
};

function DiceFace({ value, accent, index }: { value: number | null; accent: string; index: number }) {
  const gradientId = `dice-gradient-${index}`;
  const pips = value ? PIPS[Math.max(1, Math.min(6, value))] : [];
  return (
    <Svg width={74} height={74} viewBox="0 0 100 100" accessibilityLabel={`Dado ${value ?? "sin resultado"}`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor="#F1F3F8" />
          <Stop offset="1" stopColor="#A9B4C9" />
        </LinearGradient>
      </Defs>
      <Rect x="6" y="8" width="88" height="88" rx="19" fill="#09101F" opacity={0.35} />
      <Rect x="4" y="3" width="88" height="88" rx="19" fill={`url(#${gradientId})`} stroke={accent} strokeWidth="3" />
      <Rect x="10" y="9" width="76" height="7" rx="3.5" fill="#FFFFFF" opacity={0.72} />
      {pips.map(([cx, cy], pipIndex) => (
        <Circle
          key={`${cx}-${cy}-${pipIndex}`}
          cx={cx}
          cy={cy}
          r="7.5"
          fill="#182235"
          stroke="#5D6B83"
          strokeWidth="1.5"
        />
      ))}
      {!value && <SvgText x="50" y="64" textAnchor="middle" fill="#182235" fontSize="38" fontWeight="700">?</SvgText>}
    </Svg>
  );
}

export default function DiceRoller({
  values,
  count = values?.length || 1,
  onRoll,
  disabled = false,
  accent = "#FFB800",
  label = "TIRAR DADO",
}: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [displayValues, setDisplayValues] = useState<number[]>(
    values?.length ? values : Array.from({ length: count }, () => 1),
  );
  const latestValues = useRef(values);
  const spin = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    latestValues.current = values;
    if (!rolling && values?.length) setDisplayValues(values);
  }, [values, rolling]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function handleRoll() {
    if (rolling || disabled) return;
    setRolling(true);
    spin.setValue(0);
    timer.current = setInterval(() => {
      setDisplayValues(Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1));
    }, 78);
    Animated.timing(spin, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const startedAt = Date.now();
    try {
      await onRoll();
    } finally {
      const remaining = Math.max(0, 720 - (Date.now() - startedAt));
      await new Promise((resolve) => setTimeout(resolve, remaining));
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setRolling(false);
      const result = latestValues.current;
      if (result?.length) setDisplayValues(result);
    }
  }

  const shown = Array.from({ length: count }, (_, index) => displayValues[index] ?? null);
  return (
    <View style={styles.wrapper}>
      <View style={styles.diceRow}>
        {shown.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.die,
              {
                transform: [
                  { perspective: 480 },
                  { rotateX: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${index % 2 ? 540 : 720}deg`] }) },
                  { rotateY: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${index % 2 ? -720 : 540}deg`] }) },
                  { scale: spin.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0.82, 1] }) },
                ],
              },
            ]}
          >
            <DiceFace value={rolling ? value : values?.[index] ?? null} accent={accent} index={index} />
          </Animated.View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={handleRoll}
        disabled={disabled || rolling}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: accent, opacity: disabled || rolling ? 0.55 : pressed ? 0.72 : 1 },
        ]}
      >
        {rolling ? <ActivityIndicator color="#12051D" /> : <Text style={styles.buttonText}>{label}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 10 },
  diceRow: { minHeight: 84, flexDirection: "row", justifyContent: "center", gap: 9 },
  die: { width: 74, height: 74, alignItems: "center", justifyContent: "center" },
  button: { minWidth: 190, borderRadius: 11, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center" },
  buttonText: { color: "#12051D", fontFamily: "Inter_700Bold", letterSpacing: 1 },
});