import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  ViewStyle,
  TextInputProps,
} from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

interface InputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  multiline,
  ...rest
}: InputProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: themeColors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: scheme === "dark" ? "#1e293b" : "#f1f5f9",
            borderColor: error ? themeColors.error : themeColors.border,
            height: multiline ? undefined : 48,
            minHeight: multiline ? 80 : undefined,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={themeColors.textSecondary}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          style={[
            styles.input,
            {
              color: themeColors.text,
              paddingTop: multiline ? 12 : 0,
              paddingBottom: multiline ? 12 : 0,
            },
            style,
          ]}
          {...rest}
        />
        {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
      </View>
      {error && <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  leftIconWrapper: {
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rightIconWrapper: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    ...typography.body,
    flex: 1,
    height: "100%",
  },
  errorText: {
    ...typography.caption,
    marginTop: 4,
    fontWeight: "500",
  },
});
