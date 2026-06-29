import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { communityApi } from "../../api/community";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { COMMUNITY_CATEGORIES, Community } from "../../types/community";

export function CommunityListScreen() {
  const navigation = useNavigation<any>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["communitiesList", search, selectedCategory],
    queryFn: () =>
      communityApi.list({
        search: search || undefined,
        category: selectedCategory ? (selectedCategory as any) : undefined,
        limit: 50,
      }),
  });

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <Pressable onPress={() => navigation.navigate("CommunityDetails", { communityId: item._id })}>
      <Card style={styles.communityCard}>
        <View style={styles.cardHeader}>
          <Text style={[styles.communityName, { color: themeColors.text }]}>{item.name}</Text>
          {item.isMember && <Badge label="Joined" variant="success" />}
        </View>
        <Text numberOfLines={2} style={[styles.description, { color: themeColors.textSecondary }]}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <Badge label={item.category} variant="primary" />
          <Text style={[styles.membersText, { color: themeColors.textSecondary }]}>
            {item.memberCount} {item.memberCount === 1 ? "member" : "members"}
          </Text>
        </View>
      </Card>
    </Pressable>
  );

  const categories = ["All", ...COMMUNITY_CATEGORIES];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.searchSection}>
        <Input
          placeholder="Search communities..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = item === "All" ? selectedCategory === "" : selectedCategory === item;
            return (
              <Pressable
                onPress={() => setSelectedCategory(item === "All" ? "" : item)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? themeColors.primary : themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? "#ffffff" : themeColors.textSecondary },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item._id}
          renderItem={renderCommunityItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No communities found.</Text>
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
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
  categoriesContainer: {
    height: 48,
    marginVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    ...typography.caption,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  communityCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 12,
  },
  communityName: {
    ...typography.h3,
    flex: 1,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  membersText: {
    ...typography.caption,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyText: {
    ...typography.body,
    fontStyle: "italic",
  },
});
