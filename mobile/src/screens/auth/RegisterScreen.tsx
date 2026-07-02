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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const validateFullName = (text: string) => {
    if (!text.trim()) return "Full name is required";
    if (text.trim().length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const validateRollNumber = (text: string) => {
    if (!text.trim()) return "Roll number is required";
    if (text.trim().length < 2) return "Roll number must be at least 2 characters";
    return "";
  };

  const validateDepartment = (text: string) => {
    if (!text.trim()) return "Department is required";
    if (text.trim().length < 2) return "Department must be at least 2 characters";
    return "";
  };

  const validateAcademicYear = (text: string) => {
    if (!text.trim()) return "Academic year is required";
    const year = parseInt(text, 10);
    if (isNaN(year) || year < 1 || year > 8) return "Year must be between 1 and 8";
    return "";
  };

  const validateEmail = (text: string) => {
    if (!text.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) return "Enter a valid email address";
    if (!text.endsWith(".edu") && !text.includes("college.edu")) {
      return "Must be an approved college email (.edu)";
    }
    return "";
  };

  const validatePassword = (text: string) => {
    if (!text) return "Password is required";
    if (text.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(text)) return "Must contain an uppercase letter";
    if (!/[a-z]/.test(text)) return "Must contain a lowercase letter";
    if (!/[0-9]/.test(text)) return "Must contain a number";
    return "";
  };

  const validateConfirmPassword = (text: string, pass: string) => {
    if (!text) return "Please confirm your password";
    if (text !== pass) return "Passwords do not match";
    return "";
  };

  const handleFullNameChange = (text: string) => {
    setFullName(text);
    if (errors.fullName) {
      setErrors((prev) => ({ ...prev, fullName: validateFullName(text) }));
    }
  };

  const handleRollNumberChange = (text: string) => {
    setRollNumber(text);
    if (errors.rollNumber) {
      setErrors((prev) => ({ ...prev, rollNumber: validateRollNumber(text) }));
    }
  };

  const handleDepartmentChange = (text: string) => {
    setDepartment(text);
    if (errors.department) {
      setErrors((prev) => ({ ...prev, department: validateDepartment(text) }));
    }
  };

  const handleAcademicYearChange = (text: string) => {
    setAcademicYear(text);
    if (errors.academicYear) {
      setErrors((prev) => ({ ...prev, academicYear: validateAcademicYear(text) }));
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(text) }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(text) }));
    }
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, text) }));
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(text, password) }));
    }
  };

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
    const fNameErr = validateFullName(fullName);
    const rollErr = validateRollNumber(rollNumber);
    const deptErr = validateDepartment(department);
    const yearErr = validateAcademicYear(academicYear);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);

    if (fNameErr || rollErr || deptErr || yearErr || emailErr || passwordErr || confirmErr) {
      setErrors({
        fullName: fNameErr,
        rollNumber: rollErr,
        department: deptErr,
        academicYear: yearErr,
        email: emailErr,
        password: passwordErr,
        confirmPassword: confirmErr,
      });
      return;
    }

    setErrors({});
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

            <Input
              label="Full Name"
              placeholder="e.g. Aarav Sharma"
              value={fullName}
              onChangeText={handleFullNameChange}
              error={errors.fullName}
              editable={!registerMutation.isPending}
            />
            <Input
              label="Roll Number"
              placeholder="e.g. CS24-104"
              value={rollNumber}
              onChangeText={handleRollNumberChange}
              error={errors.rollNumber}
              editable={!registerMutation.isPending}
              autoCapitalize="characters"
            />
            <Input
              label="Department"
              placeholder="e.g. Computer Science"
              value={department}
              onChangeText={handleDepartmentChange}
              error={errors.department}
              editable={!registerMutation.isPending}
            />
            <Input
              label="Academic Year"
              placeholder="e.g. 2"
              value={academicYear}
              onChangeText={handleAcademicYearChange}
              keyboardType="numeric"
              error={errors.academicYear}
              editable={!registerMutation.isPending}
            />
            <Input
              label="College Email"
              placeholder="e.g. aarav@college.edu"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              editable={!registerMutation.isPending}
            />
            <Input
              label="Password"
              placeholder="Minimum 8 characters"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              error={errors.password}
              editable={!registerMutation.isPending}
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
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              error={errors.confirmPassword}
              editable={!registerMutation.isPending}
              rightIcon={
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <EyeOff color={themeColors.textSecondary} size={20} />
                  ) : (
                    <Eye color={themeColors.textSecondary} size={20} />
                  )}
                </Pressable>
              }
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={registerMutation.isPending}
              style={styles.button}
              disabled={registerMutation.isPending}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Already have an account? </Text>
            <Pressable
              onPress={() => !registerMutation.isPending && navigation.navigate("Login")}
              disabled={registerMutation.isPending}
            >
              <Text style={[styles.link, { color: themeColors.primary }, registerMutation.isPending && { opacity: 0.5 }]}>Sign In</Text>
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
