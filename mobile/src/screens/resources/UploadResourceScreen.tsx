import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileText } from "lucide-react-native";

import { resourceApi } from "../../api/resource";
import type { MobileFile } from "../../api/resource";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { RESOURCE_CATEGORIES } from "../../types/resource";
import type { ResourceCategory, ResourceVisibility } from "../../types/resource";

const MOCK_FILES = [
  { name: "lecture_notes.pdf", size: 154000, type: "application/pdf", uri: "file://mock/lecture_notes.pdf" },
  { name: "lab_assignment.docx", size: 45000, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", uri: "file://mock/lab_assignment.docx" },
  { name: "midterm_exam_2025.pdf", size: 512000, type: "application/pdf", uri: "file://mock/midterm_exam_2025.pdf" },
  { name: "project_slides.pptx", size: 1200000, type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", uri: "file://mock/project_slides.pptx" },
];

export function UploadResourceScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const communityId = route.params?.communityId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("NOTES");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<ResourceVisibility>("COMMUNITY");
  
  const [selectedFile, setSelectedFile] = useState<typeof MOCK_FILES[number] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const uploadMutation = useMutation({
    mutationFn: () => {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      
      const filePayload: MobileFile = {
        uri: selectedFile!.uri,
        name: selectedFile!.name,
        type: selectedFile!.type,
      };

      return resourceApi.create(
        communityId,
        {
          title,
          description,
          category,
          tags: tagsArray,
          visibility,
        },
        filePayload
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resourcesList", communityId] });
      navigation.goBack();
    },
    onError: (error) => {
      const appErr = errorService.handle(error);
      setErrorMessage(appErr.message);
    },
  });

  const handleUpload = () => {
    setErrorMessage("");
    if (!title.trim() || !description.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    if (!selectedFile) {
      setErrorMessage("Please select a document template to upload.");
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMessage ? <Text style={[styles.errorText, { color: themeColors.error }]}>{errorMessage}</Text> : null}

        <Input label="Resource Title *" placeholder="e.g. Unit 3 Java Cheat Sheet" value={title} onChangeText={setTitle} />
        <Input label="Description *" placeholder="Explain what topics are covered" value={description} onChangeText={setDescription} />
        
        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {RESOURCE_CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.selectorPill,
                  {
                    backgroundColor: isSelected ? themeColors.primary : themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Text style={[styles.selectorText, { color: isSelected ? "#ffffff" : themeColors.textSecondary }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Input label="Tags (comma separated)" placeholder="e.g. java, oop, exam" value={tags} onChangeText={setTags} />

        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Visibility</Text>
        <View style={styles.visibilityRow}>
          {(["COMMUNITY", "PUBLIC"] as ResourceVisibility[]).map((vis) => {
            const isSelected = visibility === vis;
            return (
              <Pressable
                key={vis}
                onPress={() => setVisibility(vis)}
                style={[
                  styles.visibilityOption,
                  {
                    backgroundColor: isSelected ? themeColors.primaryLight : themeColors.card,
                    borderColor: isSelected ? themeColors.primary : themeColors.border,
                  },
                ]}
              >
                <Text style={[styles.visibilityText, { color: isSelected ? themeColors.primary : themeColors.textSecondary }]}>
                  {vis}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: themeColors.textSecondary }]}>Select Study File Template *</Text>
        <View style={styles.fileSelectorGrid}>
          {MOCK_FILES.map((file) => {
            const isSelected = selectedFile?.name === file.name;
            return (
              <Pressable
                key={file.name}
                onPress={() => setSelectedFile(file)}
                style={[
                  styles.fileCard,
                  {
                    backgroundColor: isSelected ? themeColors.primaryLight : themeColors.card,
                    borderColor: isSelected ? themeColors.primary : themeColors.border,
                  },
                ]}
              >
                <FileText color={isSelected ? themeColors.primary : themeColors.textSecondary} size={28} />
                <Text numberOfLines={1} style={[styles.fileNameText, { color: themeColors.text }]}>
                  {file.name}
                </Text>
                {isSelected && <CheckCircle size={16} color={themeColors.primary} style={styles.checkIcon} />}
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Upload Resource"
          onPress={handleUpload}
          loading={uploadMutation.isPending}
          style={styles.uploadBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    ...typography.bodySemibold,
    textAlign: "center",
    marginBottom: 16,
  },
  selectorRow: {
    gap: 8,
    marginBottom: 16,
  },
  selectorPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorText: {
    ...typography.caption,
    fontWeight: "700",
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  visibilityOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  visibilityText: {
    ...typography.bodySemibold,
    fontSize: 13,
  },
  fileSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  fileCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  fileNameText: {
    ...typography.caption,
    fontWeight: "700",
    marginTop: 8,
  },
  checkIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  uploadBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
});
