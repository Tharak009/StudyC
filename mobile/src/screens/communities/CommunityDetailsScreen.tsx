import React from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme, View, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Folder, MessageSquare, Users } from "lucide-react-native";

import { communityApi } from "../../api/community";
import { errorService } from "../../services/error.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { env } from "../../config/env";

export function CommunityDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const communityId = route.params?.communityId;

  const { data: community, isLoading } = useQuery({
    queryKey: ["communityDetails", communityId],
    queryFn: () => communityApi.details(communityId),
    enabled: !!communityId,
  });

  const joinMutation = useMutation({
    mutationFn: () => communityApi.join(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityDetails", communityId] });
      queryClient.invalidateQueries({ queryKey: ["communitiesList"] });
    },
    onError: (error) => {
      Alert.alert("Error", errorService.getFriendlyMessage(error));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => communityApi.leave(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityDetails", communityId] });
      queryClient.invalidateQueries({ queryKey: ["communitiesList"] });
    },
    onError: (error) => {
      Alert.alert("Error", errorService.getFriendlyMessage(error));
    },
  });

  if (isLoading || !community) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const getBannerUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${env.API_URL}/${url}`;
  };

  const bannerUrl = getBannerUrl(community.bannerImage);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.bannerContainer, { backgroundColor: themeColors.primary }]}>
          {bannerUrl ? (
            <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerPlaceholderText}>{community.name[0].toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.mainInfo}>
          <Text style={[styles.title, { color: themeColors.text }]}>{community.name}</Text>
          <View style={styles.metaRow}>
            <Badge label={community.category} variant="primary" />
            <Text style={[styles.membersText, { color: themeColors.textSecondary }]}>
              {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
            </Text>
          </View>

          <Text style={[styles.description, { color: themeColors.text }]}>{community.description}</Text>

          {community.isMember ? (
            <Button
              title="Leave Community"
              onPress={() => leaveMutation.mutate()}
              loading={leaveMutation.isPending}
              variant="outline"
              style={styles.actionButton}
            />
          ) : (
            <Button
              title="Join Community"
              onPress={() => joinMutation.mutate()}
              loading={joinMutation.isPending}
              variant="primary"
              style={styles.actionButton}
            />
          )}

          <View style={styles.tagsRow}>
            {community.tags.map((tag, idx) => (
              <Badge key={idx} label={`#${tag}`} variant="gray" style={styles.tag} />
            ))}
          </View>

          {community.isMember && (
            <View style={styles.featuresSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Community Workspace</Text>
              
              <Pressable
                onPress={() => navigation.navigate("Chat", { communityId: community._id, name: community.name })}
                style={styles.featureRow}
              >
                <View style={[styles.featureIcon, { backgroundColor: themeColors.primaryLight }]}>
                  <MessageSquare color={themeColors.primary} size={20} />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: themeColors.text }]}>Community Chat</Text>
                  <Text style={[styles.featureDesc, { color: themeColors.textSecondary }]}>Discuss topics with class members in real-time</Text>
                </View>
                <ArrowRight color={themeColors.textSecondary} size={18} />
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate("ResourceList", { communityId: community._id, name: community.name })}
                style={styles.featureRow}
              >
                <View style={[styles.featureIcon, { backgroundColor: themeColors.primaryLight }]}>
                  <Folder color={themeColors.primary} size={20} />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: themeColors.text }]}>Shared Resources</Text>
                  <Text style={[styles.featureDesc, { color: themeColors.textSecondary }]}>Access notes, question papers, and presentations</Text>
                </View>
                <ArrowRight color={themeColors.textSecondary} size={18} />
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate("CommunityMembers", { communityId: community._id })}
                style={[styles.featureRow, { borderBottomWidth: 0 }]}
              >
                <View style={[styles.featureIcon, { backgroundColor: themeColors.primaryLight }]}>
                  <Users color={themeColors.primary} size={20} />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, { color: themeColors.text }]}>Members List</Text>
                  <Text style={[styles.featureDesc, { color: themeColors.textSecondary }]}>See who else is active in this group</Text>
                </View>
                <ArrowRight color={themeColors.textSecondary} size={18} />
              </Pressable>
            </View>
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
    flexGrow: 1,
  },
  bannerContainer: {
    height: 180,
    width: "100%",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerPlaceholderText: {
    color: "#ffffff",
    fontSize: 72,
    fontWeight: "900",
  },
  mainInfo: {
    padding: 20,
  },
  title: {
    ...typography.h2,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  membersText: {
    ...typography.caption,
    fontWeight: "700",
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    width: "100%",
    marginBottom: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 24,
  },
  tag: {
    marginRight: 0,
  },
  featuresSection: {
    marginTop: 12,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodySemibold,
    fontSize: 15,
  },
  featureDesc: {
    ...typography.caption,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
