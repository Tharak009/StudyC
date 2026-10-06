import React, { useState, useEffect } from "react";
import {
  Megaphone,
  BookOpen,
  FolderKanban,
  GraduationCap,
  MessageCircle,
  Lock,
  Search,
  Users,
  Info,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronLeft,
  Hash,
  Sparkles,
  Menu
} from "lucide-react";
import { Chat } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import type { Community } from "../../types/community";
import type { CommunityGroup, GroupType } from "../../types/community-group";
import { StreamChannelView } from "../chat/StreamChannelView";
import { useStreamChat } from "../../hooks/useStreamChat";
import { useAuthStore } from "../../store/auth.store";

interface CommunityGroupChatViewProps {
  community: Community;
  group: CommunityGroup;
  onBackToOverview?: () => void;
  onToggleChannels?: () => void;
}

function GroupTypeIcon({ type }: { type: GroupType | string }) {
  switch (type) {
    case "ANNOUNCEMENT":
      return <Megaphone className="w-4 h-4 text-[#F59E0B]" />;
    case "STUDY":
      return <BookOpen className="w-4 h-4 text-emerald-500" />;
    case "PROJECT":
      return <FolderKanban className="w-4 h-4 text-purple-500" />;
    case "SUBJECT":
      return <GraduationCap className="w-4 h-4 text-amber-500" />;
    case "DISCUSSION":
    default:
      return <MessageCircle className="w-4 h-4 text-[#1E90FF]" />;
  }
}

export function CommunityGroupChatView({
  community,
  group,
  onBackToOverview,
  onToggleChannels
}: CommunityGroupChatViewProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { client, connectionStatus } = useStreamChat();

  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  const isOwner = Boolean(
    community.membershipRole === "OWNER" ||
      (currentUser?._id && community.owner?._id === currentUser._id)
  );

  const isAnnouncement = Boolean(
    group.isAnnouncement || group.type === "ANNOUNCEMENT"
  );
  const isReadOnly = isAnnouncement && !isOwner;

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
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#0B1220]">
      {/* 1. Compact Modern Group Header (56px) */}
      <header className="shrink-0 h-14 px-4 sm:px-6 bg-white dark:bg-[#0B132B] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Back to Community"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {onToggleChannels && (
            <button
              type="button"
              onClick={onToggleChannels}
              className="lg:hidden p-1.5 rounded-xl text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors cursor-pointer"
              title="Community Channels"
            >
              <Menu size={18} />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
              <GroupTypeIcon type={group.type} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {group.name}
                </h2>
                {isAnnouncement && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Broadcast
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{community.memberCount || 1} members</span>
                </span>
                {group.description && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-sm hidden sm:inline">
                      {group.description}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400">
          {isReadOnly && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
              <Lock size={11} />
              <span>Read-Only</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsInfoDrawerOpen((prev) => !prev)}
            className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ${
              isInfoDrawerOpen
                ? "bg-slate-100 dark:bg-white/10 text-[#1E90FF] dark:text-[#1E90FF]"
                : ""
            }`}
            title="Group Information"
          >
            <Info size={17} />
          </button>
        </div>
      </header>

      {/* 2. Main Chat Area + Sliding Info Drawer */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {isChannelLoading ? (
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
    </div>
  );
}
