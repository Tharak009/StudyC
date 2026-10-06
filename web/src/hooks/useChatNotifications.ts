import { useEffect, useCallback } from "react";
import type { StreamChat, Event as StreamEvent } from "stream-chat";
import { useChatOrganizationStore } from "../store/chat-organization.store";
import { useChatPrivacyStore } from "../store/chat-privacy.store";

interface UseChatNotificationsOptions {
  client: StreamChat | null;
  activeChannelId: string | null;
  onNavigateToChannel?: (channelId: string, isDM: boolean) => void;
}

// Gentle two-tone notification chime synthesized with Web Audio API
function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio autoplay policy might defer before user gesture; silently ignore
  }
}

export function useChatNotifications({
  client,
  activeChannelId,
  onNavigateToChannel
}: UseChatNotificationsOptions) {
  const preferences = useChatOrganizationStore((state) => state.notificationPreferences);

  useEffect(() => {
    useChatPrivacyStore.getState().fetchBlockedUsers();
  }, []);

  const handleMessageEvent = useCallback(
    (event: StreamEvent) => {
      const message = event.message;
      const channel = event.channel;
      if (!message || !client?.userID) return;

      // 1. Ignore own messages
      if (message.user?.id === client.userID) return;

      // 2. Ignore messages from blocked users
      const senderId = message.user?.id;
      if (senderId && useChatPrivacyStore.getState().isUserBlocked(senderId)) {
        return;
      }

      // 3. Ignore messages in currently active focused conversation
      const eventChannelId = channel?.id || (channel as any)?.cid?.split(":")[1];
      const isCurrentlyViewing =
        activeChannelId &&
        (activeChannelId === eventChannelId || activeChannelId === channel?.id) &&
        document.hasFocus();

      if (isCurrentlyViewing) return;

      // 4. Ignore muted channels
      try {
        const isMuted = (channel as any)?.muteStatus?.()?.muted;
        if (isMuted) return;
      } catch {}

      // 5. Determine channel type
      const chanData = ((channel as any)?.data || channel || {}) as any;
      const isDM =
        chanData.studyConnectType === "dm" ||
        (channel?.type === "messaging" && String(channel?.id || "").startsWith("dm-"));

      // Check category preferences
      const isMention =
        message.mentioned_users &&
        message.mentioned_users.some((u) => u.id === client.userID);
      const isThreadReply = Boolean(message.parent_id);

      if (isMention && !preferences.mentions) return;
      if (isThreadReply && !preferences.threadReplies) return;
      if (isDM && !preferences.directMessages) return;
      if (!isDM && !preferences.communityMessages) return;

      // 6. Play audio chime if enabled
      if (preferences.sound) {
        playChimeSound();
      }

      // 7. Spawn Desktop notification if enabled & permitted
      if (
        preferences.desktopNotifications &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const isLocked = eventChannelId
          ? useChatPrivacyStore.getState().isLocked(eventChannelId)
          : false;

        const senderName = message.user?.name || "Classmate";
        const channelTitle = isDM ? senderName : `#${chanData.name || channel?.id || "chat"}`;

        // Redact message preview if conversation is locked with PIN
        const bodyContent = isLocked
          ? `New message from ${senderName}`
          : `${senderName}: ${
              message.text ||
              (message.attachments?.length ? "Shared an attachment" : "New message")
            }`;

        try {
          const notification = new Notification(`StudyConnect • ${channelTitle}`, {
            body: bodyContent,
            icon: message.user?.image || "/favicon.ico",
            tag: `studyconnect-${eventChannelId || "chat"}`
          });


          notification.onclick = () => {
            window.focus();
            if (eventChannelId && onNavigateToChannel) {
              onNavigateToChannel(eventChannelId, isDM);
            }
            notification.close();
          };
        } catch (e) {
          console.warn("Could not show desktop notification:", e);
        }
      }
    },
    [client?.userID, activeChannelId, preferences, onNavigateToChannel]
  );

  useEffect(() => {
    if (!client) return;

    client.on("message.new", handleMessageEvent);
    client.on("notification.message_new", handleMessageEvent);

    return () => {
      client.off("message.new", handleMessageEvent);
      client.off("notification.message_new", handleMessageEvent);
    };
  }, [client, handleMessageEvent]);

  return {
    preferences
  };
}
