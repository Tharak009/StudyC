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
import { Eye, EyeOff } from "lucide-react-native";

import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/auth.store";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: async (response) => {
      const { user, accessToken, refreshToken } = response.data;
      await setSession(user, accessToken, refreshToken);
    },
    onError: (error) => {
      const appErr = errorService.handle(error);
      setErrorMessage(appErr.message);
    },
  });

  const handleLogin = () => {
    setErrorMessage("");
    if (!email.trim() || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    loginMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>StudyConnect</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Collaborate and learn with your college classmates.
            </Text>
          </View>

          <View style={styles.form}>
            {errorMessage ? <Text style={[styles.errorText, { color: themeColors.error }]}>{errorMessage}</Text> : null}

            <Input
              label="Approved Email Address"
              placeholder="e.g. student@college.edu"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff color={themeColors.textSecondary} size={20} />
                  ) : (
                    <Eye color={themeColors.textSecondary} size={20} />
                  )}
                </Pressable>
              }
            />

            <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotPassword}>
              <Text style={[styles.forgotText, { color: themeColors.primary }]}>Forgot Password?</Text>
            </Pressable>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loginMutation.isPending}
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={[styles.link, { color: themeColors.primary }]}>Sign Up</Text>
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
    marginBottom: 40,
  },
  title: {
    ...typography.h1,
    fontSize: 36,
    marginBottom: 12,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    ...typography.caption,
    fontWeight: "700",
  },
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    ...typography.body,
  },
  link: {
    ...typography.bodySemibold,
  },
});
