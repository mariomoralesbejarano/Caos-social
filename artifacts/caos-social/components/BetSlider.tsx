import React, { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

type BetSliderProps = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accent?: string;
};

export default function BetSlider({ min, max, value, onChange, disabled = false, accent = "#C84BFF" }: BetSliderProps) {
  const [width, setWidth] = useState(1);
  const widthRef = useRef(1);
  const range = Math.max(1, max - min);
  const percentage = Math.max(0, Math.min(1, (value - min) / range));
  const updateFromX = (locationX: number) => {
    const next = min + Math.round(Math.max(0, Math.min(widthRef.current, locationX)) / widthRef.current * range);
    onChange(Math.max(min, Math.min(max, next)));
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => updateFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => updateFromX(event.nativeEvent.locationX),
  }), [disabled, min, max, range, onChange]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.labels}>
        <Text style={styles.label}>MÍN. {min.toLocaleString("es-ES")}</Text>
        <Text style={[styles.amount, { color: accent }]}>{value.toLocaleString("es-ES")}</Text>
        <Text style={styles.label}>ALL-IN {max.toLocaleString("es-ES")}</Text>
      </View>
      <Pressable
        {...responder.panHandlers}
        disabled={disabled}
        onLayout={(event) => {
          const nextWidth = Math.max(1, event.nativeEvent.layout.width);
          widthRef.current = nextWidth;
          setWidth(nextWidth);
        }}
        style={[styles.track, { opacity: disabled ? 0.4 : 1 }]}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: value }}
      >
        <View style={[styles.fill, { width: `${percentage * 100}%`, backgroundColor: accent }]} />
        <View style={[styles.thumb, { left: Math.max(0, percentage * width - 10), borderColor: accent, backgroundColor: "#190B2B" }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  labels: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: "#9D8EAA", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.6 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 18 },
  track: { height: 28, justifyContent: "center", position: "relative" },
  fill: { position: "absolute", left: 0, top: 10, height: 8, borderRadius: 5 },
  thumb: { position: "absolute", top: 3, width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
});