import React from "react";
import { Image, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import { env } from "../../config/env";
import { colors } from "../../theme/colors";

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  style?: any;
}

export function Avatar({ name, src, size = 40, style }: AvatarProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${env.API_URL}/${url}`;
  };

  const avatarUrl = getImageUrl(src);
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.avatar, containerStyle, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsContainer,
        containerStyle,
        { backgroundColor: themeColors.primaryLight },
        style,
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            color: themeColors.primary,
            fontSize: size * 0.4,
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    resizeMode: "cover",
  },
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontWeight: "700",
  },
});
