import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  small?: boolean;
}

export function NeonButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
  small,
}: Props) {
  const colors = useColors();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, glow: colors.primary },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, glow: colors.secondary },
    danger: { bg: colors.destructive, fg: colors.destructiveForeground, glow: colors.destructive },
    ghost: { bg: "transparent", fg: colors.foreground, glow: colors.border },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        {
          backgroundColor: palette.bg,
          shadowColor: palette.glow,
          opacity: disabled ? 0.4 : 1,
          borderColor: variant === "ghost" ? colors.border : palette.bg,
        },
        pressed && !disabled && { transform: [{ scale: 0.96 }] },
        style as ViewStyle,
      ]}
    >
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          { color: palette.fg },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 6,
  },
  btnSmall: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 12,
  },
});
