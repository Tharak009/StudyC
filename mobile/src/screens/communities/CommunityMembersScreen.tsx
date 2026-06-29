import React from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react-native";

import { communityApi } from "../../api/community";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { CommunityMember } from "../../types/community";

export function CommunityMembersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const communityId = route.params?.communityId;

  const { data: members, isLoading } = useQuery({
    queryKey: ["communityMembers", communityId],
    queryFn: () => communityApi.members(communityId),
    enabled: !!communityId,
  });

  const renderMemberItem = ({ item }: { item: CommunityMember }) => {
    const userObj = item.userId;
    const isOwner = item.role === "OWNER";

    return (
      <Pressable onPress={() => navigation.navigate("UserProfile", { user: userObj })}>
        <Card style={styles.memberCard}>
          <Avatar name={userObj.fullName} src={userObj.profilePicture} size={40} />
          <View style={styles.memberInfo}>
            <Text style={[styles.name, { color: themeColors.text }]}>{userObj.fullName}</Text>
            <Text style={[styles.dept, { color: themeColors.textSecondary }]}>
              {userObj.rollNumber} • {userObj.department} (Yr {userObj.academicYear})
            </Text>
          </View>
          {item.role !== "MEMBER" && (
            <Badge
              label={item.role}
              variant={isOwner ? "success" : "primary"}
              style={styles.badge}
            />
          )}
          <ArrowRight color={themeColors.textSecondary} size={16} />
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={members || []}
          keyExtractor={(item) => item._id}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No members found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 10,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    ...typography.bodySemibold,
    fontSize: 15,
  },
  dept: {
    ...typography.caption,
    marginTop: 2,
  },
  badge: {
    marginRight: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...typography.body,
    fontStyle: "italic",
  },
});
