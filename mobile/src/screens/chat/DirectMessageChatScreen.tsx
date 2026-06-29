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
  X,
  FileText,
  Image as ImageIcon,
  Mic,
  ChevronLeft,
  Trash2,
  Edit2,
} from "lucide-react-native";

import { directMessagesApi } from "../../features/chat/services/direct-messages.api";
import { chatApi, MobileAttachment } from "../../features/chat/services/chat.api";
import { useAuthStore } from "../../store/auth.store";
import { socketService } from "../../services/socket.service";
import { MessageBubble } from "../../components/MessageBubble";
import { Input } from "../../components/ui/Input";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { DirectMessage, PaginatedDirectMessages } from "../../features/chat/types";

export function DirectMessageChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];
  const { user } = useAuthStore();

  const { conversationId, receiverName, receiverId } = route.params;

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<MobileAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [showMessageActions, setShowMessageActions] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Fetch DM Message History
  const { data, isLoading } = useQuery({
    queryKey: ["directMessagesHistory", conversationId],
    queryFn: () => directMessagesApi.getMessages(conversationId, { limit: 50, order: "latest" }),
    enabled: !!conversationId,
  });

  // Mark all messages as read on screen entry
  useEffect(() => {
    if (conversationId) {
      directMessagesApi.markAsRead(conversationId).catch((err) => {
        console.log("Failed to mark messages as read:", err);
      });
    }
  }, [conversationId]);

  // Socket listeners for DMs
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    // Join conversation room
    socket.emit("joinConversation", { conversationId }, (res: any) => {
      console.log("Joined conversation room:", res);
    });

    // Listen to new direct messages
    socket.on("directMessageCreated", (message: any) => {
      // Append new message to history cache
      queryClient.setQueryData(["directMessagesHistory", conversationId], (old: PaginatedDirectMessages | undefined) => {
        if (!old) return old;
        if (old.items.some((m) => m._id === message._id)) return old;
        return {
          ...old,
          items: [message, ...old.items],
        };
      });

      // Mark as read if from peer
      if (message.senderId._id !== user?._id) {
        directMessagesApi.markAsRead(conversationId).catch((err) => console.log("Failed mark as read:", err));
        socket.emit("markAsRead", { conversationId, messageId: message._id });
      }
    });

    // Listen to message updates
    socket.on("directMessageUpdated", (updatedMessage: any) => {
      queryClient.setQueryData(["directMessagesHistory", conversationId], (old: PaginatedDirectMessages | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)),
        };
      });
    });

    // Listen to message deletions
    socket.on("directMessageDeleted", (deletedMessage: any) => {
      queryClient.setQueryData(["directMessagesHistory", conversationId], (old: PaginatedDirectMessages | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((m) =>
            m._id === deletedMessage._id
              ? { ...m, content: "[deleted message]", deleted: true, attachments: [] }
              : m
          ),
        };
      });
    });

    // Listen to read receipts
    socket.on("messageRead", (payload: any) => {
      if (payload.conversationId === conversationId) {
        queryClient.setQueryData(["directMessagesHistory", conversationId], (old: PaginatedDirectMessages | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((m) => (m.senderId._id === user?._id ? { ...m, read: true } : m)),
          };
        });
      }
    });

    // Listen to typing status
    socket.on("userTyping", (payload: { conversationId?: string; userId: string }) => {
      if (payload.conversationId === conversationId && payload.userId !== user?._id) {
        setPeerTyping(true);
      }
    });

    socket.on("userStoppedTyping", (payload: { conversationId?: string; userId: string }) => {
      if (payload.conversationId === conversationId) {
        setPeerTyping(false);
      }
    });

    return () => {
      socket.emit("leaveConversation", { conversationId });
      socket.off("directMessageCreated");
      socket.off("directMessageUpdated");
      socket.off("directMessageDeleted");
      socket.off("messageRead");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    };
  }, [conversationId, user?._id, queryClient]);

  // Handle Input text changes and emit typing status
  const handleInputChange = (text: string) => {
    setInputText(text);
    const socket = socketService.get();
    if (!socket) return;

    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true);
      socket.emit("typingStart", { conversationId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typingStop", { conversationId });
    }, 2000);
  };

  // Select Mock Attachment
  const handleSelectMockAttachment = (type: "image" | "pdf" | "voice") => {
    let mockFile: MobileAttachment;
    if (type === "image") {
      mockFile = {
        uri: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
        name: "homework_scan.jpg",
        type: "image/jpeg",
      };
    } else if (type === "pdf") {
      mockFile = {
        uri: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        name: "syllabus.pdf",
        type: "application/pdf",
      };
    } else {
      mockFile = {
        uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        name: "audio_note.mp3",
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
      if (isEditing && selectedMessage) {
        // Edit message flow
        await directMessagesApi.editMessage(selectedMessage._id, inputText);
        setIsEditing(false);
        setSelectedMessage(null);
      } else {
        // Send message flow
        await directMessagesApi.sendMessage(conversationId, {
          content: inputText,
          attachments: selectedAttachments,
        });
      }

      setInputText("");
      setSelectedAttachments([]);

      // Stop typing status if active
      const socket = socketService.get();
      if (socket && isTyping) {
        setIsTyping(false);
        socket.emit("typingStop", { conversationId });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Message Options action sheet
  const handleMessageLongPress = (msg: DirectMessage) => {
    if (msg.senderId._id === user?._id && !msg.deleted) {
      setSelectedMessage(msg);
      setShowMessageActions(true);
    }
  };

  const handleEditClick = () => {
    if (!selectedMessage) return;
    setIsEditing(true);
    setInputText(selectedMessage.content);
    setShowMessageActions(false);
  };

  const handleDeleteClick = () => {
    if (!selectedMessage) return;
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel", onPress: () => setShowMessageActions(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await directMessagesApi.deleteMessage(selectedMessage._id);
            } catch (err) {
              Alert.alert("Error", "Failed to delete message.");
            } finally {
              setShowMessageActions(false);
              setSelectedMessage(null);
            }
          },
        },
      ]
    );
  };

  const messages = data?.items || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={themeColors.text} size={24} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{receiverName}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            {peerTyping ? "typing..." : "Direct Message"}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          inverted
          renderItem={({ item }) => (
            <Pressable onLongPress={() => handleMessageLongPress(item)}>
              <MessageBubble
                senderName={item.senderId.fullName}
                content={item.content}
                isSelf={item.senderId._id === user?._id}
                timestamp={item.createdAt}
                read={item.read}
                attachments={item.attachments}
              />
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No messages yet. Send a message to start the conversation!
              </Text>
            </View>
          }
        />
      )}

      {/* Attachments preview */}
      {selectedAttachments.length > 0 && (
        <View style={[styles.attachmentsPreview, { backgroundColor: themeColors.card }]}>
          {selectedAttachments.map((file, idx) => (
            <View key={idx} style={[styles.attachmentPill, { backgroundColor: themeColors.border }]}>
              <FileText size={14} color={themeColors.text} />
              <Text numberOfLines={1} style={[styles.attachmentName, { color: themeColors.text }]}>
                {file.name}
              </Text>
              <Pressable onPress={() => setSelectedAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                <X color={themeColors.textSecondary} size={14} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Edit Mode indicator */}
      {isEditing && (
        <View style={[styles.editPreview, { backgroundColor: themeColors.card, borderLeftColor: themeColors.primary }]}>
          <View style={styles.editContent}>
            <Text style={[styles.editText, { color: themeColors.primary }]}>Editing message</Text>
          </View>
          <Pressable onPress={() => { setIsEditing(false); setInputText(""); setSelectedMessage(null); }}>
            <X color={themeColors.textSecondary} size={16} />
          </Pressable>
        </View>
      )}

      {/* Input Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
          <Pressable
            disabled={isEditing}
            onPress={() => setShowAttachmentModal(true)}
            style={[styles.iconButton, isEditing && { opacity: 0.5 }]}
          >
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

          <Pressable
            disabled={isEditing}
            onPress={() => handleSelectMockAttachment("voice")}
            style={[styles.iconButton, isEditing && { opacity: 0.5 }]}
          >
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

      {/* Message Actions Modal */}
      <Modal visible={showMessageActions} transparent animationType="fade">
        <Pressable style={styles.actionsOverlay} onPress={() => setShowMessageActions(false)}>
          <View style={[styles.actionsContent, { backgroundColor: themeColors.card }]}>
            <Pressable style={styles.actionItem} onPress={handleEditClick}>
              <Edit2 color={themeColors.text} size={20} />
              <Text style={[styles.actionText, { color: themeColors.text }]}>Edit Message</Text>
            </Pressable>
            <Pressable style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleDeleteClick}>
              <Trash2 color={colors.light.error} size={20} />
              <Text style={[styles.actionText, { color: colors.light.error }]}>Delete Message</Text>
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
    paddingHorizontal: 40,
  },
  emptyText: {
    ...typography.body,
    fontStyle: "italic",
    textAlign: "center",
  },
  attachmentsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 16,
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
  editPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  editContent: {
    flex: 1,
  },
  editText: {
    ...typography.caption,
    fontWeight: "700",
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
  actionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  actionsContent: {
    width: "80%",
    borderRadius: 12,
    padding: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  actionText: {
    ...typography.bodySemibold,
  },
});
