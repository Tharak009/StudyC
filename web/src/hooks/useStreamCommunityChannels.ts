import { useState, useEffect, useCallback, useMemo } from "react";
import type { Channel as StreamChannel } from "stream-chat";
import { useStreamChat } from "./useStreamChat";
import { streamApi, type CreateCommunityChannelPayload } from "../api/stream.api";
import type { Channel } from "../types/chat";

export interface CategorizedStreamChannels {
  announcements: Channel[];
  focus: Channel[];
  watercooler: Channel[];
  stages: Channel[];
}

export function useStreamCommunityChannels(communityId: string | null) {
  const { client, connectionStatus } = useStreamChat();

  const [streamChannels, setStreamChannels] = useState<StreamChannel[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to map Stream channel data to StudyConnect Channel model
  const mapStreamChannelToStudyConnect = useCallback(
    (chan: StreamChannel): Channel => {
      const channelId = chan.id || "";
      const data = (chan.data || {}) as any;
      const tier: "announcements" | "focus" | "watercooler" | "stages" =
        data?.channelTier ||
        (channelId.includes("announcement")
          ? "announcements"
          : channelId.includes("stage")
          ? "stages"
          : channelId.includes("watercooler") || channelId.includes("lounge")
          ? "watercooler"
          : "focus");

      return {
        _id: channelId,
        name: (data?.name as string) || channelId,
        type: tier === "announcements" ? "announcement" : tier === "stages" ? "voice" : "text",
        category: tier,
        topic: (data?.topic as string) || "",
        isPrivate: Boolean(data?.isPrivate),
        isStrictStudyMode: tier === "focus",
        unreadCount: chan.countUnread()
      };
    },
    []
  );

  // Fetch / synchronize channels for the active community
  const fetchChannels = useCallback(async () => {
    if (!client || connectionStatus !== "connected" || !communityId || !client.userID) {
      setStreamChannels([]);
      setChannels([]);
      setActiveChannel(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Ensure backend provisions Stream channels and synchronizes membership
      await streamApi.getCommunityChannels(communityId);

      // 2. Query Stream client for all community channels the user belongs to
      const filter = {
        type: "messaging",
        studyConnectType: "community",
        communityId: String(communityId),
        members: { $in: [client.userID] }
      };

      const sort = [{ created_at: 1 as const }];

      const qChannels = await client.queryChannels(filter, sort, {
        watch: true,
        state: true
      });

      setStreamChannels(qChannels);
      const mapped = qChannels.map(mapStreamChannelToStudyConnect);
      setChannels(mapped);

      // Set active channel
      if (activeChannelId) {
        const found = qChannels.find((c) => c.id === activeChannelId);
        if (found) setActiveChannel(found);
        else if (qChannels.length > 0) {
          setActiveChannel(qChannels[0]);
          setActiveChannelId(qChannels[0].id || null);
        }
      } else if (qChannels.length > 0) {
        setActiveChannel(qChannels[0]);
        setActiveChannelId(qChannels[0].id || null);
      }
    } catch (err: any) {
      console.warn(`Error querying channels for community ${communityId}:`, err);
      setError(err?.message || "Failed to load community channels");
    } finally {
      setLoading(false);
    }
  }, [client, connectionStatus, communityId, mapStreamChannelToStudyConnect]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Real-time event subscriptions
  useEffect(() => {
    if (!client || connectionStatus !== "connected" || !communityId) return;

    const handleChannelChange = () => {
      setChannels(streamChannels.map(mapStreamChannelToStudyConnect));
    };

    client.on("notification.added_to_channel", fetchChannels);
    client.on("channel.updated", handleChannelChange);
    client.on("message.new", handleChannelChange);
    client.on("message.read", handleChannelChange);
    client.on("message.updated", handleChannelChange);
    client.on("message.deleted", handleChannelChange);

    return () => {
      client.off("notification.added_to_channel", fetchChannels);
      client.off("channel.updated", handleChannelChange);
      client.off("message.new", handleChannelChange);
      client.off("message.read", handleChannelChange);
      client.off("message.updated", handleChannelChange);
      client.off("message.deleted", handleChannelChange);
    };
  }, [client, connectionStatus, communityId, streamChannels, mapStreamChannelToStudyConnect, fetchChannels]);

  // 4-Tier Categorization of channels
  const categorizedChannels: CategorizedStreamChannels = useMemo(() => {
    const announcements: Channel[] = [];
    const focus: Channel[] = [];
    const watercooler: Channel[] = [];
    const stages: Channel[] = [];

    channels.forEach((ch) => {
      if (ch.type === "voice" || ch.category === "stages") {
        stages.push(ch);
      } else if (ch.type === "announcement" || ch.category === "announcements") {
        announcements.push(ch);
      } else if (
        ch.category === "watercooler" ||
        ch.name.toLowerCase().includes("lounge") ||
        ch.name.toLowerCase().includes("watercooler")
      ) {
        watercooler.push(ch);
      } else {
        focus.push(ch);
      }
    });

    return { announcements, focus, watercooler, stages };
  }, [channels]);

  // Select a channel
  const selectChannel = useCallback(
    (channel: Channel | string) => {
      const channelId = typeof channel === "string" ? channel : channel._id;
      setActiveChannelId(channelId ?? null);
      if (channelId) {
        const found = streamChannels.find((c) => c.id === channelId);
        if (found) {
          setActiveChannel(found);
        }
      }
    },
    [streamChannels]
  );

  // Privileged channel creation
  const createChannel = useCallback(
    async (payload: CreateCommunityChannelPayload): Promise<string> => {
      if (!communityId) throw new Error("No community selected");
      if (!client || connectionStatus !== "connected") {
        throw new Error("Stream Chat is not connected");
      }

      // 1. Backend authorizes owner/moderator and registers channel
      const summary = await streamApi.createCommunityChannel(communityId, payload);

      // 2. Query and watch on client
      const channel = client.channel("messaging", summary.id);
      await channel.watch();

      // 3. Update list and set active
      await fetchChannels();
      setActiveChannel(channel);
      setActiveChannelId(channel.id || null);

      return channel.id || "";
    },
    [communityId, client, connectionStatus, fetchChannels]
  );

  return {
    channels,
    categorizedChannels,
    streamChannels,
    activeChannel,
    activeChannelId,
    loading,
    error,
    selectChannel,
    createChannel,
    refetchChannels: fetchChannels
  };
}
