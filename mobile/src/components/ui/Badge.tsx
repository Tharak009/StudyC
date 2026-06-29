import React from "react";
import { StyleSheet, Text, TextStyle, useColorScheme, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

interface BadgeProps {
  label: string;
  variant?: "primary" | "success" | "warning" | "error" | "gray";
  style?: ViewStyle;
}

export function Badge({ label, variant = "primary", style }: BadgeProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const getStyles = () => {
    const badgeStyle: ViewStyle = {};
    const textStyle: TextStyle = {};

    switch (variant) {
      case "primary":
        badgeStyle.backgroundColor = themeColors.primaryLight;
        textStyle.color = themeColors.primary;
        break;
      case "success":
        badgeStyle.backgroundColor = scheme === "dark" ? "#064e3b" : "#d1fae5";
        textStyle.color = themeColors.success;
        break;
      case "warning":
        badgeStyle.backgroundColor = scheme === "dark" ? "#78350f" : "#fef3c7";
        textStyle.color = themeColors.warning;
        break;
      case "error":
        badgeStyle.backgroundColor = scheme === "dark" ? "#7f1d1d" : "#fee2e2";
        textStyle.color = themeColors.error;
        break;
      case "gray":
        badgeStyle.backgroundColor = scheme === "dark" ? "#374151" : "#f3f4f6";
        textStyle.color = themeColors.textSecondary;
        break;
    }

    return { badgeStyle, textStyle };
  };

  const { badgeStyle, textStyle } = getStyles();

  return (
    <View style={[styles.badge, badgeStyle, style]}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  text: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 11,
  },
});
