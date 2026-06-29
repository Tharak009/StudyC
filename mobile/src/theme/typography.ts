import { TextStyle } from "react-native";

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  } as TextStyle,
  h2: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  } as TextStyle,
  h3: {
    fontSize: 18,
    fontWeight: "600",
  } as TextStyle,
  body: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  } as TextStyle,
  bodySemibold: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  } as TextStyle,
  button: {
    fontSize: 15,
    fontWeight: "700",
  } as TextStyle,
};

export type ThemeTypography = typeof typography;
