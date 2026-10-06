import { useState, useEffect, useCallback, useRef } from "react";
import type { Channel as StreamChannel } from "stream-chat";
import { useStreamChat } from "./useStreamChat";
import { streamApi } from "../api/stream.api";
import { fromStreamUserId } from "../utils/stream-id";
import type { ConversationItem } from "../components/dm/ConversationList";

export function useStreamDMs(initialConversationId?: string | null) {
  const { client, connectionStatus } = useStreamChat();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [streamChannels, setStreamChannels] = useState<StreamChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to convert Stream channels into ConversationItem[] for StudyConnect UI
  const mapStreamChannelsToItems = useCallback(
    (channels: StreamChannel[]): ConversationItem[] => {
      if (!client?.userID) return [];

      return channels.map((chan) => {
        const currentUserId = client.userID;
        const members = Object.values(chan.state.members);
        const peerMember = members.find((m) => m.user_id !== currentUserId) || members[0];
        const peerUser = (peerMember?.user || {}) as any;

        const messages = chan.state.messages;
        const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;
        const rawPeerId = fromStreamUserId((peerUser?.id as string) || "");

        const typingObj = (chan.state as any)?.typing || {};
        const isPeerTyping = Object.keys(typingObj).some((uid) => uid !== currentUserId);

        return {
          id: chan.id || "",
          peer: {
            id: rawPeerId || (peerUser?.id as string) || "",
            name: (peerUser?.name as string) || "Classmate",
            roll: (peerUser?.rollNumber as string) || "Student",
            dept: (peerUser?.department as string) || "Campus",
            isOnline: Boolean(peerUser?.online),
            lastSeen: peerUser?.last_active as string | undefined,
            avatar: (peerUser?.image as string) || undefined
          },
          lastMessage: lastMsg
            ? {
                text: lastMsg.text || "Direct Message",
                senderId: fromStreamUserId(lastMsg.user_id || ""),
                time: lastMsg.created_at
                  ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "",
                isRead: chan.countUnread() === 0
              }
            : null,
          unreadCount: chan.countUnread(),
          isPinned: Boolean((chan.data as any)?.isPinned),
          isMuted: Boolean((chan.data as any)?.isMuted),
          isTyping: isPeerTyping
        };
      });
    },
    [client?.userID]
  );

  // Query and watch DM channels
  const fetchDMs = useCallback(async () => {
    if (!client || connectionStatus !== "connected" || !client.userID) {
      setConversations([]);
      setStreamChannels([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filter = {
        type: "messaging",
        studyConnectType: "dm",
        members: { $in: [client.userID] }
      };
      const sort = [{ last_message_at: -1 as const }];

      const channels = await client.queryChannels(filter, sort, {
        watch: true,
        state: true,
        presence: true
      });

      setStreamChannels(channels);
      const items = mapStreamChannelsToItems(channels);
      setConversations(items);

      // Restore active channel if specified
      if (activeConversationId) {
        const found = channels.find((c) => c.id === activeConversationId);
        if (found) setActiveChannel(found);
      } else if (channels.length > 0) {
        setActiveChannel(channels[0]);
        setActiveConversationId(channels[0].id || null);
      }
    } catch (err: any) {
      console.warn("Error querying Stream DM channels:", err);
      setError(err?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [client, connectionStatus, activeConversationId, mapStreamChannelsToItems]);

  useEffect(() => {
    fetchDMs();
  }, [fetchDMs]);

  // Real-time event subscriptions to keep DMs state in sync
  useEffect(() => {
    if (!client || connectionStatus !== "connected") return;

    const handleEvent = () => {
      // Re-map when messages, membership, or presence change
      setConversations(() => {
        return mapStreamChannelsToItems(streamChannels);
      });
    };

    client.on("message.new", handleEvent);
    client.on("message.updated", handleEvent);
    client.on("message.deleted", handleEvent);
    client.on("message.read", handleEvent);
    client.on("typing.start", handleEvent);
    client.on("typing.stop", handleEvent);
    client.on("notification.added_to_channel", fetchDMs);
    client.on("user.presence.changed", handleEvent);

    return () => {
      client.off("message.new", handleEvent);
      client.off("message.updated", handleEvent);
      client.off("message.deleted", handleEvent);
      client.off("message.read", handleEvent);
      client.off("typing.start", handleEvent);
      client.off("typing.stop", handleEvent);
      client.off("notification.added_to_channel", fetchDMs);
      client.off("user.presence.changed", handleEvent);
    };
  }, [client, connectionStatus, streamChannels, mapStreamChannelsToItems, fetchDMs]);

  // Select active conversation
  const selectConversation = useCallback(
    (channelId: string) => {
      setActiveConversationId(channelId);
      const found = streamChannels.find((c) => c.id === channelId);
      if (found) {
        setActiveChannel(found);
      }
    },
    [streamChannels]
  );

  // Start a new DM with a classmate via the backend API
  const startDm = useCallback(
    async (targetUserId: string): Promise<string> => {
      if (!client || connectionStatus !== "connected") {
        throw new Error("Stream Chat is not connected");
      }

      // 1. Backend safely validates blocking, user existence, and returns channelId
      const dmData = await streamApi.getOrCreateDm(targetUserId);

      // 2. Obtain and watch channel on Stream client
      const channel = client.channel("messaging", dmData.channelId);
      await channel.watch();

      // 3. Update active conversation
      setActiveChannel(channel);
      setActiveConversationId(channel.id || null);

      // 4. Refetch or prepend channel to list
      await fetchDMs();

      return channel.id || "";
    },
    [client, connectionStatus, fetchDMs]
  );

  return {
    conversations,
    streamChannels,
    activeChannel,
    activeConversationId,
    loading,
    error,
    selectConversation,
    startDm,
    refetchDMs: fetchDMs
  };
}
