import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export function CaosSplash({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: false }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
      ),
    ]).start();

    const fadeT = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: false }).start();
    }, 1900);
    const doneT = setTimeout(() => onDone(), 2300);
    return () => {
      clearTimeout(fadeT);
      clearTimeout(doneT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shadow = glow.interpolate({ inputRange: [0, 1], outputRange: [10, 32] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      <LinearGradient
        colors={["#0A0014", "#1A0033", "#3D0A6B", "#0A0014"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.gridOverlay} pointerEvents="none" />
      <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
        <Text style={styles.tag}>· PARTY ONLINE 18+ ·</Text>
        <Animated.Text
          style={[
            styles.title,
            {
              textShadowColor: "#39FF14",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: shadow as unknown as number,
            },
          ]}
        >
          CAOS
        </Animated.Text>
        <Animated.Text
          style={[
            styles.titlePink,
            {
              textShadowColor: "#FF00E5",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: shadow as unknown as number,
            },
          ]}
        >
          SOCIAL
        </Animated.Text>
        <Text style={styles.subtitle}>v3.5 · multi-pack mix</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: "transparent",
  },
  tag: {
    color: "#39FF14",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 16,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 84,
    letterSpacing: -2,
    lineHeight: 88,
  },
  titlePink: {
    color: "#FF00E5",
    fontFamily: "Inter_700Bold",
    fontSize: 84,
    letterSpacing: -2,
    lineHeight: 88,
    marginTop: -10,
  },
  subtitle: {
    color: "#A78BFA",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 18,
    textTransform: "uppercase",
  },
});
