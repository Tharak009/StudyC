import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react-native";

import { resourceApi } from "../../api/resource";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { RESOURCE_CATEGORIES, Resource } from "../../types/resource";

export function ResourceListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const communityId = route.params?.communityId;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: resources, isLoading, refetch } = useQuery({
    queryKey: ["resourcesList", communityId, search, selectedCategory],
    queryFn: () => {
      if (communityId) {
        return resourceApi.listByCommunity(communityId, {
          search: search || undefined,
          category: selectedCategory ? selectedCategory : undefined,
          limit: 50,
        });
      } else {
        return resourceApi.list({
          search: search || undefined,
          category: selectedCategory ? selectedCategory : undefined,
          limit: 50,
        });
      }
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const getFormatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderResourceItem = ({ item }: { item: Resource }) => (
    <Pressable onPress={() => navigation.navigate("ResourceDetails", { resourceId: item._id })}>
      <Card style={styles.resourceCard}>
        <View style={styles.cardHeader}>
          <FileText color={themeColors.primary} size={28} />
          <View style={styles.resourceInfo}>
            <Text style={[styles.title, { color: themeColors.text }]}>{item.title}</Text>
            <Text style={[styles.uploader, { color: themeColors.textSecondary }]}>
              By {item.uploadedBy.fullName}
            </Text>
          </View>
        </View>
        <Text numberOfLines={2} style={[styles.description, { color: themeColors.textSecondary }]}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <Badge label={item.category} variant="primary" />
          <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
            {getFormatSize(item.fileSize)} • {item.downloadCount} downloads
          </Text>
        </View>
      </Card>
    </Pressable>
  );

  const categories = ["All", ...RESOURCE_CATEGORIES];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.searchSection}>
        <Input
          placeholder="Search resources..."
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
          data={resources?.items || []}
          keyExtractor={(item) => item._id}
          renderItem={renderResourceItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No resources found.</Text>
            </View>
          }
        />
      )}

      {communityId && (
        <Pressable
          onPress={() => navigation.navigate("UploadResource", { communityId })}
          style={[styles.floatingButton, { backgroundColor: themeColors.primary }]}
        >
          <Plus color="#ffffff" size={24} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
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
    paddingBottom: 80,
  },
  resourceCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  resourceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    ...typography.bodySemibold,
    fontSize: 16,
  },
  uploader: {
    ...typography.caption,
    marginTop: 2,
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
  metaText: {
    ...typography.caption,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
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
