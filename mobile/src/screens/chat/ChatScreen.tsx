import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Modal,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Paperclip,
  Smile,
  X,
  FileText,
  Image as ImageIcon,
  Mic,
  Search,
  ChevronLeft,
} from "lucide-react-native";

import { chatApi, MobileAttachment } from "../../features/chat/services/chat.api";
import { useAuthStore } from "../../store/auth.store";
import { socketService } from "../../services/socket.service";
import { MessageBubble } from "../../components/MessageBubble";
import { Input } from "../../components/ui/Input";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { ChatMessage, PaginatedMessages } from "../../features/chat/types";

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const { user } = useAuthStore();

  const { communityId, name } = route.params;

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<MobileAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Fetch Message History
  const { data, isLoading } = useQuery({
    queryKey: ["chatHistory", communityId],
    queryFn: () => chatApi.history(communityId, { limit: 50, order: "latest" }),
    enabled: !!communityId,
  });

  // Socket connection & listeners
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    // Join community room
    socket.emit("joinCommunity", { communityId }, (res: any) => {
      console.log("Joined community socket room:", res);
    });

    // Listen for new messages
    socket.on("messageCreated", (message: any) => {
      queryClient.setQueryData(["chatHistory", communityId], (old: PaginatedMessages | undefined) => {
        if (!old) return old;
        if (old.items.some((m) => m._id === message._id)) return old;
        return {
          ...old,
          items: [message, ...old.items],
        };
      });
    });

    // Listen for typing events
    socket.on("userTyping", (payload: { communityId?: string; userId: string; fullName?: string }) => {
      if (payload.communityId === communityId && payload.userId !== user?._id) {
        setTypingUsers((prev) => ({
          ...prev,
          [payload.userId]: payload.fullName || "Someone",
        }));
      }
    });

    socket.on("userStoppedTyping", (payload: { communityId?: string; userId: string }) => {
      if (payload.communityId === communityId) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[payload.userId];
          return updated;
        });
      }
    });

    return () => {
      socket.emit("leaveCommunity", { communityId });
      socket.off("messageCreated");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    };
  }, [communityId, user?._id, queryClient]);

  // Handle typing indicator
  const handleInputChange = (text: string) => {
    setInputText(text);
    const socket = socketService.get();
    if (!socket) return;

    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true);
      socket.emit("typingStart", { communityId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typingStop", { communityId });
    }, 2000);
  };

  // Select Mock Attachment
  const handleSelectMockAttachment = (type: "image" | "pdf" | "voice") => {
    let mockFile: MobileAttachment;
    if (type === "image") {
      mockFile = {
        uri: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        name: "study_screenshot.jpg",
        type: "image/jpeg",
      };
    } else if (type === "pdf") {
      mockFile = {
        uri: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        name: "lecture_notes.pdf",
        type: "application/pdf",
      };
    } else {
      mockFile = {
        uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        name: "voice_note.mp3",
        type: "audio/mpeg",
      };
    }

    setSelectedAttachments((prev) => [...prev, mockFile]);
    setShowAttachmentModal(false);
    Alert.alert("Attachment Added", `${mockFile.name} was successfully attached.`);
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!inputText.trim() && selectedAttachments.length === 0) return;

    setIsSending(true);
    try {
      const payload = {
        content: inputText,
        replyTo: replyTo?._id,
        attachments: selectedAttachments,
      };

      await chatApi.create(communityId, payload);

      setInputText("");
      setSelectedAttachments([]);
      setReplyTo(null);

      // Stop typing status if active
      const socket = socketService.get();
      if (socket && isTyping) {
        setIsTyping(false);
        socket.emit("typingStop", { communityId });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Filter messages based on search query
  const messages = data?.items || [];
  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const renderTypingText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return "Several people are typing...";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={themeColors.text} size={24} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{name}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Community Chat</Text>
        </View>
        <Pressable onPress={() => setShowSearch(!showSearch)} style={styles.headerIcon}>
          <Search color={themeColors.text} size={20} />
        </Pressable>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchBar, { borderBottomColor: themeColors.border }]}>
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          <Pressable onPress={() => { setSearchQuery(""); setShowSearch(false); }}>
            <Text style={[styles.cancelText, { color: themeColors.primary }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Messages List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={(item) => item._id}
          inverted
          renderItem={({ item }) => (
            <MessageBubble
              senderName={item.senderId.fullName}
              content={item.content}
              isSelf={item.senderId._id === user?._id}
              timestamp={item.createdAt}
              attachments={item.attachments}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {searchQuery ? "No matching messages found." : "No messages yet. Say hello!"}
              </Text>
            </View>
          }
        />
      )}

      {/* Typing Indicator & Reply Preview */}
      <View style={styles.metaOverlay}>
        {renderTypingText() ? (
          <Text style={[styles.typingIndicator, { color: themeColors.textSecondary }]}>
            {renderTypingText()}
          </Text>
        ) : null}

        {replyTo && (
          <View style={[styles.replyPreview, { backgroundColor: themeColors.card, borderLeftColor: themeColors.primary }]}>
            <View style={styles.replyContent}>
              <Text style={[styles.replyUser, { color: themeColors.primary }]}>
                Replying to {replyTo.senderId.fullName}
              </Text>
              <Text numberOfLines={1} style={[styles.replyText, { color: themeColors.textSecondary }]}>
                {replyTo.content || "Attachment"}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)}>
              <X color={themeColors.textSecondary} size={16} />
            </Pressable>
          </View>
        )}

        {selectedAttachments.length > 0 && (
          <View style={[styles.attachmentsPreview, { backgroundColor: themeColors.card }]}>
            {selectedAttachments.map((file, idx) => (
              <View key={idx} style={[styles.attachmentPill, { backgroundColor: themeColors.border }]}>
                <FileText size={14} color={themeColors.text} />
                <Text numberOfLines={1} style={[styles.attachmentName, { color: themeColors.text }]}>
                  {file.name}
                </Text>
                <Pressable onPress={() => setSelectedAttachments(prev => prev.filter((_, i) => i !== idx))}>
                  <X color={themeColors.textSecondary} size={14} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Input Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
          <Pressable onPress={() => setShowAttachmentModal(true)} style={styles.iconButton}>
            <Paperclip color={themeColors.textSecondary} size={22} />
          </Pressable>

          <Input
            placeholder="Type a message..."
            value={inputText}
            onChangeText={handleInputChange}
            style={styles.textInput}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            multiline
          />

          <Pressable onPress={() => handleSelectMockAttachment("voice")} style={styles.iconButton}>
            <Mic color={themeColors.textSecondary} size={22} />
          </Pressable>

          <Pressable
            onPress={handleSendMessage}
            disabled={isSending || (!inputText.trim() && selectedAttachments.length === 0)}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() || selectedAttachments.length > 0
                    ? themeColors.primary
                    : "transparent",
              },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send
                color={
                  inputText.trim() || selectedAttachments.length > 0
                    ? "#ffffff"
                    : themeColors.textSecondary
                }
                size={20}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Mock Attachments Selection Modal */}
      <Modal visible={showAttachmentModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAttachmentModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add Attachment</Text>
            
            <Pressable
              style={[styles.modalOption, { borderBottomColor: themeColors.border }]}
              onPress={() => handleSelectMockAttachment("image")}
            >
              <ImageIcon color={themeColors.primary} size={22} />
              <Text style={[styles.modalOptionText, { color: themeColors.text }]}>Image / Screenshot</Text>
            </Pressable>

            <Pressable
              style={[styles.modalOption, { borderBottomColor: themeColors.border }]}
              onPress={() => handleSelectMockAttachment("pdf")}
            >
              <FileText color={themeColors.primary} size={22} />
              <Text style={[styles.modalOptionText, { color: themeColors.text }]}>PDF document</Text>
            </Pressable>

            <Pressable
              style={styles.modalOption}
              onPress={() => handleSelectMockAttachment("voice")}
            >
              <Mic color={themeColors.primary} size={22} />
              <Text style={[styles.modalOptionText, { color: themeColors.text }]}>Voice recording</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.bodySemibold,
    fontSize: 16,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  headerIcon: {
    paddingLeft: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  cancelText: {
    ...typography.bodySemibold,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    ...typography.body,
    fontStyle: "italic",
  },
  metaOverlay: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingIndicator: {
    ...typography.caption,
    fontStyle: "italic",
    marginBottom: 4,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyUser: {
    ...typography.caption,
    fontWeight: "700",
  },
  replyText: {
    ...typography.caption,
    fontSize: 12,
  },
  attachmentsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    maxWidth: 200,
  },
  attachmentName: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    marginBottom: 0,
    maxHeight: 100,
  },
  iconButton: {
    padding: 6,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    ...typography.h3,
    marginBottom: 20,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  modalOptionText: {
    ...typography.bodySemibold,
  },
});
