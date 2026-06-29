import React from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckSquare, FileText, Mail, Trash2, Users } from "lucide-react-native";

import { notificationApi } from "../../api/notification";
import { useNotificationStore } from "../../store/notification.store";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Card } from "../../components/ui/Card";
import type { Notification } from "../../types/notification";

export function NotificationScreen() {
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notificationsList"],
    queryFn: () => notificationApi.list({ limit: 100 }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
      setUnreadCount(0);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "COMMUNITY_JOIN":
      case "COMMUNITY_INVITE":
        return <Users color={themeColors.primary} size={20} />;
      case "NEW_MESSAGE":
      case "DIRECT_MESSAGE":
        return <Mail color={themeColors.primary} size={20} />;
      case "RESOURCE_UPLOAD":
        return <FileText color={themeColors.primary} size={20} />;
      default:
        return <Bell color={themeColors.primary} size={20} />;
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const timeString = new Date(item.createdAt).toLocaleDateString();

    return (
      <Pressable
        onPress={() => {
          if (!item.isRead) markReadMutation.mutate(item._id);
        }}
      >
        <Card
          style={StyleSheet.flatten([
            styles.notificationCard,
            {
              backgroundColor: item.isRead ? themeColors.card : themeColors.primaryLight,
              borderColor: themeColors.border,
            },
          ])}
        >
          <View style={styles.iconContainer}>{getIcon(item.type)}</View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: themeColors.text }]}>{item.title}</Text>
            <Text style={[styles.message, { color: themeColors.textSecondary }]}>{item.message}</Text>
            <Text style={[styles.time, { color: themeColors.textSecondary }]}>{timeString}</Text>
          </View>
          <Pressable onPress={() => deleteMutation.mutate(item._id)} style={styles.deleteBtn}>
            <Trash2 color={themeColors.error} size={16} />
          </Pressable>
        </Card>
      </Pressable>
    );
  };

  const hasUnread = notificationsData?.items.some((item) => !item.isRead);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Notification Center</Text>
        {hasUnread && (
          <Pressable onPress={() => markAllMutation.mutate()} style={styles.markAllBtn}>
            <CheckSquare color={themeColors.primary} size={18} />
            <Text style={[styles.markAllText, { color: themeColors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={notificationsData?.items || []}
          keyExtractor={(item) => item._id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No notifications yet.</Text>
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...typography.h3,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  markAllText: {
    ...typography.caption,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodySemibold,
    fontSize: 14,
  },
  message: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  time: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 6,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 10,
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
