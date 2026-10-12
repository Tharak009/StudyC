import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  Search,
  Users,
  Info,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Hash,
  Sparkles,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { Chat } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import type { Community } from "../../types/community";
import type { CommunityGroup } from "../../types/community-group";
import { StreamChannelView } from "../chat/StreamChannelView";
import { useStreamChat } from "../../hooks/useStreamChat";
import { useAuthStore } from "../../store/auth.store";
import { communityGroupsApi } from "../../api/community-groups.api";
import { useToastStore } from "../../store/toast.store";
import { ConfirmationDialog } from "../confirmation-dialog";

interface CommunityGroupChatViewProps {
  community: Community;
  group: CommunityGroup;
  onBackToOverview?: () => void;
  onToggleChannels?: () => void;
}

export function CommunityGroupChatView({
  community,
  group,
  onBackToOverview,
  onToggleChannels
}: CommunityGroupChatViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const currentUser = useAuthStore((state) => state.user);
  const { client, connectionStatus, error: streamError, reconnect } = useStreamChat();

  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);

  const isOwner = Boolean(
    community.membershipRole === "OWNER" ||
      (currentUser?._id && (community.ownerId === currentUser._id || community.owner?._id === currentUser._id))
  );
  const canManage = Boolean(
    isOwner ||
      community.membershipRole === "MODERATOR" ||
      (currentUser?._id && community.moderators?.includes(currentUser._id))
  );

  const isAnnouncement = Boolean(
    group.isAnnouncement || group.type === "ANNOUNCEMENT"
  );
  const isReadOnly = isAnnouncement && !isOwner;
  const deleteGroupMutation = useMutation({
    mutationFn: () => communityGroupsApi.delete(community._id, group._id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["community-groups", community._id] }),
        queryClient.invalidateQueries({ queryKey: ["community", community._id] }),
        queryClient.invalidateQueries({ queryKey: ["communities"] })
      ]);
      addToast(`“${group.name}” removed. Its Stream channel history is preserved.`, "success");
      navigate(`/communities/${community._id}`, { replace: true });
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || error?.message || "Unable to delete this group", "error");
    }
  });

  // Initialize or watch the deterministic Stream channel
  useEffect(() => {
    if (!client || !group.streamChannelId) return;

    let isMounted = true;
    setIsChannelLoading(true);
    setChannelError(null);

    const initChannel = async () => {
      try {
        const ch = client.channel("messaging", group.streamChannelId);
        await ch.watch();
        if (isMounted) {
          setChannel(ch);
          setIsChannelLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to watch community group channel:", err);
        if (isMounted) {
          setChannelError(
            err?.message || "Failed to connect to group chat channel."
          );
          setIsChannelLoading(false);
        }
      }
    };

    initChannel();

    return () => {
      isMounted = false;
    };
  }, [client, group.streamChannelId]);

  return (
    <div className="community-group-chat flex min-w-0 w-full flex-1 flex-col h-full overflow-hidden bg-white dark:bg-[#0B1220]">
      {/* Main Chat Area + Sliding Info Drawer */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {connectionStatus === "error" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md p-6 rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-950/20 space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
                Chat Service Unavailable
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {streamError || "Unable to connect to the Stream Chat service. Check network or server configuration."}
              </p>
              <button
                type="button"
                onClick={() => reconnect()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        ) : isChannelLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-[#1E90FF]" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Connecting to Stream channel...
            </p>
          </div>
        ) : channelError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md p-6 rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-950/20 space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
                Channel Connection Error
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {channelError}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : client && channel ? (
          <Chat
            client={client}
            theme="str-chat__theme-light dark:str-chat__theme-dark"
          >
            <StreamChannelView
              key={channel.cid || channel.id}
              channel={channel}
              channelName={group.name}
              communityName={community.name}
              isReadOnly={isReadOnly}
              readOnlyNotice="Only community administrators can publish messages in this announcement channel."
              onBack={onBackToOverview}
              headerActions={
                <>
                  {onToggleChannels && (
                    <button
                      type="button"
                      onClick={onToggleChannels}
                      className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Back to Community Groups"
                      aria-label="Back to Community Groups"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  {isReadOnly && <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"><Lock size={11} />Read-only</span>}
                  {canManage && !isAnnouncement && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteGroupOpen(true)}
                      className="p-2 rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                      title="Delete group"
                      aria-label={`Delete group ${group.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsInfoDrawerOpen((prev) => !prev)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${isInfoDrawerOpen ? "bg-slate-100 dark:bg-white/10 text-[#1E90FF]" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    title="Group Information"
                    aria-label="Group information"
                  >
                    <Info size={16} />
                  </button>
                </>
              }
            />
          </Chat>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Unable to initialize group chat.
          </div>
        )}

        {/* 3. Sliding Group Info Drawer */}
        {isInfoDrawerOpen && (
          <aside className="w-72 sm:w-80 shrink-0 h-full border-l border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B132B] p-5 overflow-y-auto space-y-5 animate-slide-left z-20">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Group Information
              </h3>
              <button
                type="button"
                onClick={() => setIsInfoDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Group Name
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {group.name}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Description
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {group.description || "No description provided."}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Group Type
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5 capitalize">
                  {group.type.toLowerCase()}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Parent Community
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {community.name}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Stream Channel ID
                </p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {group.streamChannelId}
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
      <ConfirmationDialog
        isOpen={isDeleteGroupOpen}
        title="Delete this group?"
        message={`“${group.name}” will be removed from this Study Circle. Its Stream channel and message history are preserved.`}
        confirmText="Delete Group"
        isDestructive
        isLoading={deleteGroupMutation.isPending}
        onCancel={() => !deleteGroupMutation.isPending && setIsDeleteGroupOpen(false)}
        onConfirm={() => deleteGroupMutation.mutate()}
      />
    </div>
  );
}
