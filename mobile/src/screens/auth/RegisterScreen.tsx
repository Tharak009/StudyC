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
import { useAuthStore } from "../../store/auth.store";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const setSession = useAuthStore((state) => state.setSession);

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        fullName,
        rollNumber,
        department,
        academicYear: parseInt(academicYear, 10),
        email,
        password,
      }),
    onSuccess: async (response) => {
      const { user, accessToken, refreshToken } = response.data;
      await setSession(user, accessToken, refreshToken);
    },
    onError: (error) => {
      const appErr = errorService.handle(error);
      setErrorMessage(appErr.message);
    },
  });

  const handleRegister = () => {
    setErrorMessage("");
    if (!fullName.trim() || !rollNumber.trim() || !department.trim() || !academicYear || !email.trim() || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    const yearVal = parseInt(academicYear, 10);
    if (isNaN(yearVal) || yearVal < 1 || yearVal > 8) {
      setErrorMessage("Academic year must be a number between 1 and 8.");
      return;
    }

    registerMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>Join StudyConnect</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Create an account using your approved college email.
            </Text>
          </View>

          <View style={styles.form}>
            {errorMessage ? <Text style={[styles.errorText, { color: themeColors.error }]}>{errorMessage}</Text> : null}

            <Input label="Full Name" placeholder="e.g. Aarav Sharma" value={fullName} onChangeText={setFullName} />
            <Input label="Roll Number" placeholder="e.g. CS24-104" value={rollNumber} onChangeText={setRollNumber} />
            <Input label="Department" placeholder="e.g. Computer Science" value={department} onChangeText={setDepartment} />
            <Input label="Academic Year" placeholder="e.g. 2" value={academicYear} onChangeText={setAcademicYear} keyboardType="numeric" />
            <Input label="College Email" placeholder="e.g. aarav@college.edu" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Input label="Password" placeholder="Minimum 8 characters" value={password} onChangeText={setPassword} secureTextEntry />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={registerMutation.isPending}
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={[styles.link, { color: themeColors.primary }]}>Sign In</Text>
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
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    ...typography.body,
  },
  link: {
    ...typography.bodySemibold,
  },
});
