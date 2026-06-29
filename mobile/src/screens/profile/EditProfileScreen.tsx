import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "../../store/auth.store";
import { userApi } from "../../api/user";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export function EditProfileScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);

  const [fullName, setFullName] = useState(user.fullName);
  const [department, setDepartment] = useState(user.department);
  const [academicYear, setAcademicYear] = useState(user.academicYear.toString());
  const [bio, setBio] = useState(user.bio || "");
  const [interests, setInterests] = useState(user.interests.join(", "));
  const [errorMessage, setErrorMessage] = useState("");

  const updateMutation = useMutation({
    mutationFn: () => {
      const interestsArray = interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
      return userApi.updateProfile({
        fullName,
        department,
        academicYear: parseInt(academicYear, 10),
        bio,
        interests: interestsArray,
      });
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["selfProfile"] });
      navigation.goBack();
    },
    onError: (error) => {
      const appErr = errorService.handle(error);
      setErrorMessage(appErr.message);
    },
  });

  const handleSave = () => {
    setErrorMessage("");
    if (!fullName.trim() || !department.trim() || !academicYear) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    const yearVal = parseInt(academicYear, 10);
    if (isNaN(yearVal) || yearVal < 1 || yearVal > 8) {
      setErrorMessage("Academic year must be a number between 1 and 8.");
      return;
    }

    updateMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {errorMessage ? <Text style={[styles.errorText, { color: themeColors.error }]}>{errorMessage}</Text> : null}

          <Input label="Full Name *" placeholder="Enter full name" value={fullName} onChangeText={setFullName} />
          <Input label="Department *" placeholder="Enter department" value={department} onChangeText={setDepartment} />
          <Input label="Academic Year *" placeholder="Enter year" value={academicYear} onChangeText={setAcademicYear} keyboardType="numeric" />
          <Input label="Bio" placeholder="Add a short bio about yourself" value={bio} onChangeText={setBio} />
          <Input label="Interests (comma separated)" placeholder="e.g. Java, Web Dev, React" value={interests} onChangeText={setInterests} />

          <Button
            title="Save Profile"
            onPress={handleSave}
            loading={updateMutation.isPending}
            style={styles.saveButton}
          />
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
    padding: 24,
  },
  errorText: {
    ...typography.bodySemibold,
    textAlign: "center",
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});
