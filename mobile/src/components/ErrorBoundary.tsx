import React, { Component, ErrorInfo, ReactNode } from "react";
import { SafeAreaView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "./ui/Button";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return <FallbackScreen error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function FallbackScreen({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.emoji, { color: themeColors.primary }]}>⚠️</Text>
        <Text style={[styles.title, { color: themeColors.text }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: themeColors.textSecondary }]}>
          {error?.message || "An unexpected rendering error occurred inside the application."}
        </Text>
        <Button title="Try Again" onPress={onReset} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    ...typography.body,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    width: "100%",
  },
});
