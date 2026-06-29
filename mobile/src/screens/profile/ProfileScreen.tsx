import React from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Briefcase, GraduationCap, Hash, Mail } from "lucide-react-native";

import { useAuthStore } from "../../store/auth.store";
import { userApi } from "../../api/user";
import { authApi } from "../../api/auth";
import { tokenService } from "../../services/token.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const currentUser = useAuthStore((state) => state.user)!;
  const clearSession = useAuthStore((state) => state.clearSession);

  const targetUser = route.params?.user;
  const isSelf = !targetUser || targetUser._id === currentUser._id;
  const displayedUser = isSelf ? currentUser : targetUser;

  const { data: latestSelfProfile, refetch } = useQuery({
    queryKey: ["selfProfile"],
    queryFn: () => userApi.profile(),
    enabled: isSelf,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (isSelf) refetch();
    }, [isSelf, refetch])
  );

  const activeUser = isSelf && latestSelfProfile ? latestSelfProfile : displayedUser;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = await tokenService.getRefreshToken();
      return authApi.logout(refreshToken || undefined);
    },
    onSuccess: async () => {
      await clearSession();
    },
    onError: async () => {
      await clearSession();
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.profileCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Avatar name={activeUser.fullName} src={activeUser.profilePicture} size={96} style={styles.avatar} />
          <Text style={[styles.name, { color: themeColors.text }]}>{activeUser.fullName}</Text>
          <Badge label={activeUser.role} variant={activeUser.role === "ADMIN" ? "success" : "primary"} style={styles.roleBadge} />
          
          {isSelf && (
            <Button
              title="Edit Profile"
              onPress={() => navigation.navigate("EditProfile")}
              variant="outline"
              size="sm"
              style={styles.editButton}
            />
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Bio</Text>
        <Card style={styles.card}>
          <Text style={[styles.bioText, { color: activeUser.bio ? themeColors.text : themeColors.textSecondary }]}>
            {activeUser.bio || "No bio added yet."}
          </Text>
        </Card>

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Interests</Text>
        <View style={styles.interestsRow}>
          {activeUser.interests && activeUser.interests.length > 0 ? (
            activeUser.interests.map((interest: string, idx: number) => (
              <Badge key={idx} label={interest} variant="gray" style={styles.interestBadge} />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No interests selected.</Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Academic Details</Text>
        <Card style={styles.card}>
          <View style={styles.detailRow}>
            <GraduationCap color={themeColors.textSecondary} size={20} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Department</Text>
              <Text style={[styles.detailValue, { color: themeColors.text }]}>{activeUser.department}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Briefcase color={themeColors.textSecondary} size={20} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Academic Year</Text>
              <Text style={[styles.detailValue, { color: themeColors.text }]}>Year {activeUser.academicYear}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Hash color={themeColors.textSecondary} size={20} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Roll Number</Text>
              <Text style={[styles.detailValue, { color: themeColors.text }]}>{activeUser.rollNumber}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Mail color={themeColors.textSecondary} size={20} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>College Email</Text>
              <Text style={[styles.detailValue, { color: themeColors.text }]}>{activeUser.email}</Text>
            </View>
          </View>
        </Card>

        {isSelf && (
          <Button
            title="Sign Out"
            onPress={() => logoutMutation.mutate()}
            loading={logoutMutation.isPending}
            variant="danger"
            style={styles.logoutButton}
          />
        )}
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
  profileCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    ...typography.h2,
    marginBottom: 6,
    textAlign: "center",
  },
  roleBadge: {
    marginBottom: 16,
  },
  editButton: {
    width: 140,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: 12,
  },
  card: {
    padding: 16,
    marginBottom: 24,
  },
  bioText: {
    ...typography.body,
    fontSize: 14,
  },
  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  interestBadge: {
    marginRight: 0,
  },
  emptyText: {
    ...typography.body,
    fontStyle: "italic",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailInfo: {
    marginLeft: 16,
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodySemibold,
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 20,
  },
});
