import React from "react";
import { Image, Linking, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Check, CheckCheck, FileText, Download } from "lucide-react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { env } from "../config/env";
import type { MessageAttachment } from "../features/chat/types";

interface MessageBubbleProps {
  senderName: string;
  content: string;
  isSelf: boolean;
  timestamp: string;
  read?: boolean;
  attachments?: MessageAttachment[];
}

export function MessageBubble({
  senderName,
  content,
  isSelf,
  timestamp,
  read,
  attachments = [],
}: MessageBubbleProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeColors = colors[scheme];

  const getAttachmentUrl = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${env.API_URL}/${url}`;
  };

  const handleOpenAttachment = (url: string) => {
    const fullUrl = getAttachmentUrl(url);
    Linking.openURL(fullUrl).catch((err) => console.error("Failed to open URL:", err));
  };

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.container, isSelf ? styles.alignRight : styles.alignLeft]}>
      {!isSelf && <Text style={[styles.sender, { color: themeColors.textSecondary }]}>{senderName}</Text>}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isSelf ? themeColors.primary : scheme === "dark" ? "#1e293b" : "#e2e8f0",
            borderBottomRightRadius: isSelf ? 2 : 16,
            borderBottomLeftRadius: isSelf ? 16 : 2,
          },
        ]}
      >
        {attachments.map((file, idx) => {
          const isImage = file.mimeType?.startsWith("image/");
          return (
            <Pressable
              key={file.key || idx}
              onPress={() => handleOpenAttachment(file.url)}
              style={styles.attachmentContainer}
            >
              {isImage ? (
                <Image source={{ uri: getAttachmentUrl(file.url) }} style={styles.attachmentImage} />
              ) : (
                <View style={[styles.fileAttachment, { backgroundColor: isSelf ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)" }]}>
                  <FileText size={20} color={isSelf ? "#ffffff" : themeColors.text} />
                  <Text numberOfLines={1} style={[styles.fileName, { color: isSelf ? "#ffffff" : themeColors.text }]}>
                    {file.originalName}
                  </Text>
                  <Download size={16} color={isSelf ? "#ffffff" : themeColors.textSecondary} />
                </View>
              )}
            </Pressable>
          );
        })}
        {content ? (
          <Text style={[styles.text, { color: isSelf ? "#ffffff" : themeColors.text }]}>
            {content}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={[styles.timestamp, { color: isSelf ? "rgba(255,255,255,0.7)" : themeColors.textSecondary }]}>
            {formattedTime}
          </Text>
          {isSelf && read !== undefined && (
            <View style={styles.receipt}>
              {read ? (
                <CheckCheck size={14} color="#67e8f9" />
              ) : (
                <Check size={14} color="rgba(255,255,255,0.7)" />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  alignLeft: {
    alignSelf: "flex-start",
  },
  alignRight: {
    alignSelf: "flex-end",
  },
  sender: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: 2,
    marginLeft: 6,
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    ...typography.body,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: "500",
  },
  receipt: {
    marginLeft: 4,
  },
  attachmentContainer: {
    marginBottom: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 200,
    height: 120,
    resizeMode: "cover",
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  fileName: {
    ...typography.caption,
    flex: 1,
    fontWeight: "600",
  },
});
