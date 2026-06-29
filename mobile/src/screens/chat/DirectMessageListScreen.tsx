import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, MessageSquare, UserPlus } from "lucide-react-native";

import { directMessagesApi } from "../../features/chat/services/direct-messages.api";
import { userApi } from "../../api/user";
import { useAuthStore } from "../../store/auth.store";
import { socketService } from "../../services/socket.service";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { Conversation } from "../../features/chat/types";
import type { User } from "../../types/auth";

export function DirectMessageListScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const { user: currentUser } = useAuthStore();

  const [search, setSearch] = useState("");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Fetch active conversations
  const { data: conversationsData, isLoading: isLoadingConvs, refetch: refetchConversations } = useQuery({
    queryKey: ["conversationsList"],
    queryFn: () => directMessagesApi.listConversations({ limit: 50 }),
  });

  // Fetch users matching search query (only when search is active)
  const { data: searchedUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["userSearch", search],
    queryFn: () => userApi.search(search),
    enabled: search.trim().length > 0,
  });

  // Mutation to start conversation with a user
  const startConversationMutation = useMutation({
    mutationFn: (receiverId: string) => directMessagesApi.startConversation(receiverId),
    onSuccess: (conversation, receiverId) => {
      queryClient.invalidateQueries({ queryKey: ["conversationsList"] });
      
      const peer = conversation.participants.find(p => p._id !== currentUser?._id) || {
        _id: receiverId,
        fullName: "User",
      };

      setSearch("");
      navigation.navigate("DirectMessageChat", {
        conversationId: conversation._id,
        receiverId: peer._id,
        receiverName: peer.fullName,
      });
    },
  });

  // Socket listener for new conversations and DMs in background
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    // Listen to background DM creation to refresh conversation list
    socket.on("directMessageCreated", () => {
      queryClient.invalidateQueries({ queryKey: ["conversationsList"] });
    });

    socket.on("conversationCreated", () => {
      queryClient.invalidateQueries({ queryKey: ["conversationsList"] });
    });

    return () => {
      socket.off("directMessageCreated");
      socket.off("conversationCreated");
    };
  }, [queryClient]);

  const handleUserSelect = (targetUser: User) => {
    // Check if conversation already exists with this user
    const existing = conversationsData?.items.find((conv) =>
      conv.participants.some((p) => p._id === targetUser._id)
    );

    if (existing) {
      setSearch("");
      navigation.navigate("DirectMessageChat", {
        conversationId: existing._id,
        receiverId: targetUser._id,
        receiverName: targetUser.fullName,
      });
    } else {
      startConversationMutation.mutate(targetUser._id);
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const peer = item.participants.find((p) => p._id !== currentUser?._id);
    if (!peer) return null;

    const formattedTime = item.lastMessageAt
      ? new Date(item.lastMessageAt).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })
      : "";

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("DirectMessageChat", {
            conversationId: item._id,
            receiverId: peer._id,
            receiverName: peer.fullName,
          })
        }
      >
        <Card style={styles.convCard}>
          <Avatar
            name={peer.fullName}
            src={peer.profilePicture}
            size={48}
          />
          <View style={styles.convDetails}>
            <View style={styles.convHeader}>
              <Text style={[styles.peerName, { color: themeColors.text }]}>{peer.fullName}</Text>
              <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
                {formattedTime}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.lastMessage, { color: themeColors.textSecondary }]}>
              {item.lastMessage
                ? item.lastMessage.senderId === currentUser?._id
                  ? `You: ${item.lastMessage.content}`
                  : item.lastMessage.content
                : "No messages yet"}
            </Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderUserItem = ({ item }: { item: User }) => {
    if (item._id === currentUser?._id) return null;

    return (
      <Pressable onPress={() => handleUserSelect(item)}>
        <Card style={styles.convCard}>
          <Avatar
            name={item.fullName}
            src={item.profilePicture}
            size={48}
          />
          <View style={styles.convDetails}>
            <View style={styles.convHeader}>
              <Text style={[styles.peerName, { color: themeColors.text }]}>{item.fullName}</Text>
              <UserPlus color={themeColors.primary} size={18} />
            </View>
            <Text style={[styles.lastMessage, { color: themeColors.textSecondary }]}>
              {item.department ? `${item.department} • ` : ""}Year {item.academicYear || "1"}
            </Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  const showSearchedUsers = search.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.searchSection}>
        <Input
          placeholder="Search conversation or find students..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          leftIcon={<Search size={18} color={themeColors.textSecondary} />}
        />
      </View>

      {/* Main Content */}
      {showSearchedUsers ? (
        isLoadingUsers || startConversationMutation.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : (
          <FlatList
            data={searchedUsers || []}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  No students found matching "{search}"
                </Text>
              </View>
            }
          />
        )
      ) : isLoadingConvs ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversationsData?.items || []}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetchConversations}
          refreshing={isLoadingConvs}
          ListEmptyComponent={
            <View style={styles.center}>
              <MessageSquare color={themeColors.textSecondary} size={48} style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No messages yet. Search for a peer to start a conversation.
              </Text>
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
    paddingBottom: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
  },
  convDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  peerName: {
    ...typography.bodySemibold,
    fontSize: 15,
  },
  timeText: {
    ...typography.caption,
    fontSize: 11,
  },
  lastMessage: {
    ...typography.caption,
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 20,
  },
});
