import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useColorScheme,
  ViewStyle,
} from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const getStyles = () => {
    const buttonStyle: ViewStyle = {};
    const textStyle: TextStyle = { color: "#ffffff" };

    switch (variant) {
      case "primary":
        buttonStyle.backgroundColor = themeColors.primary;
        break;
      case "secondary":
        buttonStyle.backgroundColor = themeColors.primaryLight;
        textStyle.color = themeColors.primary;
        break;
      case "danger":
        buttonStyle.backgroundColor = themeColors.error;
        break;
      case "outline":
        buttonStyle.backgroundColor = "transparent";
        buttonStyle.borderWidth = 1;
        buttonStyle.borderColor = themeColors.border;
        textStyle.color = themeColors.text;
        break;
    }

    if (disabled) {
      buttonStyle.opacity = 0.5;
    }

    return { buttonStyle, textStyle };
  };

  const { buttonStyle, textStyle } = getStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, styles[size], buttonStyle, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textStyle.color as string} size="small" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  text: {
    ...typography.button,
  },
});
