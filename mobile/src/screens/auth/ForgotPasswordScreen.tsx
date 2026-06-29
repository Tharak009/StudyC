import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";

import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../api/auth";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const resetMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => {
      setSuccessMessage("Password reset email sent! Please check your inbox.");
    },
    onError: (error) => {
      const appErr = errorService.handle(error);
      setErrorMessage(appErr.message);
    },
  });

  const handleReset = () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    resetMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Enter your college email address and we'll send you reset instructions.
            </Text>
          </View>

          <View style={styles.form}>
            {errorMessage ? <Text style={[styles.errorText, { color: themeColors.error }]}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={[styles.successText, { color: themeColors.success }]}>{successMessage}</Text> : null}

            <Input
              label="College Email Address"
              placeholder="student@college.edu"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Button
              title="Send Reset Instructions"
              onPress={handleReset}
              loading={resetMutation.isPending}
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={[styles.link, { color: themeColors.primary }]}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  errorText: {
    ...typography.bodySemibold,
    textAlign: "center",
    marginBottom: 16,
  },
  successText: {
    ...typography.bodySemibold,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  link: {
    ...typography.bodySemibold,
  },
});
