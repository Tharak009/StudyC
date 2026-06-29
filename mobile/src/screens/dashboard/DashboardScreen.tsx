import React, { useEffect } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Mail, Shield, Users } from "lucide-react-native";

import { useAuthStore } from "../../store/auth.store";
import { useNotificationStore } from "../../store/notification.store";
import { notificationApi } from "../../api/notification";
import { directMessagesApi } from "../../features/chat/services/direct-messages.api";
import { socketService } from "../../services/socket.service";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { Card } from "../../components/ui/Card";

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const user = useAuthStore((state) => state.user)!;

  const { unreadCount: notifUnread, setUnreadCount } = useNotificationStore();

  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ["unreadNotificationCount"],
    queryFn: () => notificationApi.unreadCount(),
    refetchInterval: 15000,
  });

  const { data: dmData, refetch: refetchDMs } = useQuery({
    queryKey: ["unreadDMCount"],
    queryFn: () => directMessagesApi.unreadCount(),
    refetchInterval: 15000,
  });

  useFocusEffect(
    React.useCallback(() => {
      refetchNotifs();
      refetchDMs();
    }, [refetchNotifs, refetchDMs])
  );

  useEffect(() => {
    if (notifData) {
      setUnreadCount(notifData.count);
    }
  }, [notifData, setUnreadCount]);

  useEffect(() => {
    const socket = socketService.connect();
    
    if (socket) {
      socket.on("notification", () => {
        refetchNotifs();
      });
      socket.on("directMessage", () => {
        refetchDMs();
      });
    }

    return () => {
      if (socket) {
        socket.off("notification");
        socket.off("directMessage");
      }
    };
  }, [refetchNotifs, refetchDMs]);

  const unreadDMs = dmData?.count ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcome, { color: themeColors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: themeColors.text }]}>{user.fullName}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.iconButton}>
            <Bell color={themeColors.text} size={24} />
            {notifUnread > 0 ? (
              <View style={[styles.badge, { backgroundColor: themeColors.notification }]}>
                <Text style={styles.badgeText}>{notifUnread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Card style={styles.banner}>
          <Text style={[styles.bannerTitle, { color: "#ffffff" }]}>Campus Workspace</Text>
          <Text style={[styles.bannerText, { color: "rgba(255,255,255,0.8)" }]}>
            You are logged into the verified {user.department} workspace. Connect, share notes, and chat in real-time.
          </Text>
        </Card>

        <View style={styles.statsRow}>
          <Pressable onPress={() => navigation.navigate("MessagesStack")} style={styles.statCardContainer}>
            <Card style={styles.statCard}>
              <Mail color={themeColors.primary} size={28} />
              <Text style={[styles.statValue, { color: themeColors.text }]}>{unreadDMs}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Unread DMs</Text>
            </Card>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("CommunitiesStack")} style={styles.statCardContainer}>
            <Card style={styles.statCard}>
              <Users color={themeColors.primary} size={28} />
              <Text style={[styles.statValue, { color: themeColors.text }]}>Explore</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Communities</Text>
            </Card>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Quick Actions</Text>
        
        <Pressable onPress={() => navigation.navigate("CommunitiesStack")} style={styles.actionRow}>
          <View style={[styles.actionIcon, { backgroundColor: themeColors.primaryLight }]}>
            <Users color={themeColors.primary} size={20} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: themeColors.text }]}>Study Communities</Text>
            <Text style={[styles.actionDesc, { color: themeColors.textSecondary }]}>Join group channels and view chat histories</Text>
          </View>
          <ArrowRight color={themeColors.textSecondary} size={18} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate("MessagesStack")} style={styles.actionRow}>
          <View style={[styles.actionIcon, { backgroundColor: themeColors.primaryLight }]}>
            <Mail color={themeColors.primary} size={20} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: themeColors.text }]}>Direct Messaging</Text>
            <Text style={[styles.actionDesc, { color: themeColors.textSecondary }]}>Send private messages to other students</Text>
          </View>
          <ArrowRight color={themeColors.textSecondary} size={18} />
        </Pressable>

        {user.role === "ADMIN" && (
          <View style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.actionIcon, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Shield color={themeColors.success} size={20} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: themeColors.text }]}>Admin Panel Access</Text>
              <Text style={[styles.actionDesc, { color: themeColors.textSecondary }]}>Moderation functions are restricted to the web console</Text>
            </View>
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  welcome: {
    ...typography.body,
    fontSize: 14,
  },
  name: {
    ...typography.h2,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  banner: {
    backgroundColor: "#6366f1",
    padding: 20,
    borderWidth: 0,
    marginBottom: 24,
  },
  bannerTitle: {
    ...typography.h3,
    marginBottom: 6,
  },
  bannerText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  statCardContainer: {
    flex: 1,
  },
  statCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginBottom: 0,
  },
  statValue: {
    ...typography.h2,
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    fontWeight: "600",
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodySemibold,
    fontSize: 15,
  },
  actionDesc: {
    ...typography.caption,
    marginTop: 2,
  },
});
