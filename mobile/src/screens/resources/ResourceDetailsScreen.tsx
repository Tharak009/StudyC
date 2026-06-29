import React from "react";
import { ActivityIndicator, Linking, SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme, View, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Download, FileText } from "lucide-react-native";

import { resourceApi } from "../../api/resource";
import { useAuthStore } from "../../store/auth.store";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { env } from "../../config/env";

export function ResourceDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const currentUser = useAuthStore((state) => state.user)!;
  const resourceId = route.params?.resourceId;

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resourceDetails", resourceId],
    queryFn: () => resourceApi.details(resourceId),
    enabled: !!resourceId,
  });

  const downloadMutation = useMutation({
    mutationFn: () => resourceApi.download(resourceId),
    onSuccess: (updatedResource) => {
      queryClient.invalidateQueries({ queryKey: ["resourceDetails", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["resourcesList"] });
      
      const fullUrl = updatedResource.fileUrl.startsWith("http")
        ? updatedResource.fileUrl
        : `${env.API_URL}/${updatedResource.fileUrl}`;
      Linking.openURL(fullUrl).catch((err) => console.error("Failed to open document URL:", err));
    },
    onError: (error) => {
      Alert.alert("Error", errorService.getFriendlyMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => resourceApi.delete(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resourcesList"] });
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert("Error", errorService.getFriendlyMessage(error));
    },
  });

  if (isLoading || !resource) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const getFormatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isOwner = resource.uploadedBy._id === currentUser._id;
  const createdDate = new Date(resource.createdAt).toLocaleDateString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerIconContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: themeColors.primaryLight }]}>
            <FileText color={themeColors.primary} size={48} />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.title, { color: themeColors.text }]}>{resource.title}</Text>
          <View style={styles.metaRow}>
            <Badge label={resource.category} variant="primary" />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
              {getFormatSize(resource.fileSize)}
            </Text>
          </View>

          <Card style={styles.detailsCard}>
            <View style={styles.detailItem}>
              <Calendar color={themeColors.textSecondary} size={18} />
              <Text style={[styles.detailText, { color: themeColors.text }]}>Uploaded on {createdDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Download color={themeColors.textSecondary} size={18} />
              <Text style={[styles.detailText, { color: themeColors.text }]}>
                {resource.downloadCount} {resource.downloadCount === 1 ? "download" : "downloads"}
              </Text>
            </View>
            <View style={[styles.detailItem, { marginBottom: 0 }]}>
              <FileText color={themeColors.textSecondary} size={18} />
              <Text style={[styles.detailText, { color: themeColors.text }]} numberOfLines={1}>
                Type: {resource.fileType.toUpperCase()}
              </Text>
            </View>
          </Card>

          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Description</Text>
          <Card style={styles.descCard}>
            <Text style={[styles.description, { color: themeColors.text }]}>
              {resource.description || "No description provided."}
            </Text>
          </Card>

          <View style={styles.tagsRow}>
            {resource.tags.map((tag, idx) => (
              <Badge key={idx} label={`#${tag}`} variant="gray" />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Uploaded By</Text>
          <Card style={styles.uploaderCard}>
            <Text style={[styles.uploaderName, { color: themeColors.text }]}>{resource.uploadedBy.fullName}</Text>
            <Text style={[styles.uploaderDept, { color: themeColors.textSecondary }]}>
              Roll Number: {resource.uploadedBy.rollNumber}
            </Text>
          </Card>

          <Button
            title="Download / View Document"
            onPress={() => downloadMutation.mutate()}
            loading={downloadMutation.isPending}
            style={styles.downloadButton}
          />

          {isOwner && (
            <Button
              title="Delete Resource"
              onPress={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
              variant="danger"
              style={styles.deleteButton}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerIconContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: {
    width: "100%",
  },
  title: {
    ...typography.h2,
    marginBottom: 8,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  metaText: {
    ...typography.bodySemibold,
    fontSize: 13,
  },
  detailsCard: {
    padding: 16,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    ...typography.bodySemibold,
    fontSize: 14,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: 12,
  },
  descCard: {
    padding: 16,
    marginBottom: 20,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 24,
  },
  uploaderCard: {
    padding: 16,
    marginBottom: 32,
  },
  uploaderName: {
    ...typography.bodySemibold,
    fontSize: 15,
  },
  uploaderDept: {
    ...typography.caption,
    marginTop: 4,
  },
  downloadButton: {
    marginBottom: 12,
  },
  deleteButton: {
    marginBottom: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
