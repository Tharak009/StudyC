import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Channel as StreamChannel } from "stream-chat";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Bell,
  BellOff,
  Search,
  Star,
  Pin,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Users,
  Info,
  Download,
  ExternalLink,
  CornerDownRight,
  Hash,
  Shield,
  Loader2,
  Lock,
  Unlock,
  Ban,
  Flag,
  ShieldCheck,
  Phone,
  Video,
  MessageSquare
} from "lucide-react";
import type { ActivePeer } from "../dm/ConversationHeader";
import type { LightboxImage } from "./media/MediaLightbox";
import { useChatPrivacyStore } from "../../store/chat-privacy.store";
import { SetChatPinModal } from "./modals/SetChatPinModal";
import { useToastStore } from "../../store/toast.store";
import { usersApi } from "../../api/users.api";
import { fromStreamUserId } from "../../utils/stream-id";
import { ContactProfileDrawer } from "./ContactProfileDrawer";

interface ChatInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channel: StreamChannel;
  isDM?: boolean;
  peer?: ActivePeer | null;
  channelName: string;
  communityName?: string;
  onJumpToMessage: (messageId: string) => void;
  onOpenSearch?: () => void;
  onOpenStarred?: () => void;
  onStartCall?: (type: "audio" | "video") => void;
  onOpenLightbox?: (images: LightboxImage[], index: number) => void;
  isPeerBlocked?: boolean;
  onToggleBlockPeer?: () => void;
  onOpenReport?: (target: {
    targetType: "USER" | "COMMUNITY";
    targetId: string;
    targetTitle?: string;
  }) => void;
}

// Regex to extract URLs from text
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInfoPanel({
  isOpen,
  onClose,
  channel,
  isDM = false,
  peer,
  channelName,
  communityName,
  onJumpToMessage,
  onOpenSearch,
  onOpenStarred,
  onStartCall,
  onOpenLightbox,
  isPeerBlocked = false,
  onToggleBlockPeer,
  onOpenReport
}: ChatInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<"media" | "files" | "links" | "pinned" | "members">("media");
  const [isMuted, setIsMuted] = useState(false);
  const [isTogglingMute, setIsTogglingMute] = useState(false);
  const [isSetPinModalOpen, setIsSetPinModalOpen] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [hasMoreSharedItems, setHasMoreSharedItems] = useState(true);
  const [loadingSharedItems, setLoadingSharedItems] = useState(false);
  const [sharedItemsError, setSharedItemsError] = useState(false);
  const [sharedRevision, setSharedRevision] = useState(0);

  const { addToast } = useToastStore();
  const channelId = channel.id || "";
  const isLocked = useChatPrivacyStore((state) => state.isLocked(channelId));
  const hasPin = useChatPrivacyStore((state) => state.hasPin);
  const toggleLock = useChatPrivacyStore((state) => state.toggleLock);
  const profileId = peer?.id ? fromStreamUserId(peer.id) : "";
  const profileQuery = useQuery({
    queryKey: ["public-profile", profileId],
    queryFn: () => usersApi.getPublicProfile(profileId),
    enabled: isOpen && isDM && Boolean(profileId),
    retry: false
  });

  const handleToggleLock = () => {
    if (!channelId) return;
    if (!hasPin()) {
      setIsSetPinModalOpen(true);
      return;
    }
    toggleLock(channelId);
    addToast(
      isLocked ? "Chat restored to this browser's list" : "Chat hidden in this browser",
      "success"
    );
  };

  useEffect(() => {
    if (!isOpen || !channel) return;
    let mounted = true;
    setSharedItemsError(false);
    channel.query({ messages: { limit: 50 } }).then((response) => {
      if (mounted) {
        setHasMoreSharedItems((response.messages || []).length >= 50);
        setSharedRevision((value) => value + 1);
      }
    }).catch(() => { if (mounted) setSharedItemsError(true); });
    return () => { mounted = false; };
  }, [isOpen, channel]);

  useEffect(() => {
    if (!showProfilePhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowProfilePhoto(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showProfilePhoto]);

  const loadMoreSharedItems = async () => {
    const loaded = channel.state?.messages || [];
    if (loadingSharedItems || !hasMoreSharedItems || loaded.length === 0) return;
    setLoadingSharedItems(true);
    setSharedItemsError(false);
    try {
      const response = await channel.query({ messages: { limit: 50, id_lt: loaded[0].id } });
      setHasMoreSharedItems((response.messages || []).length >= 50);
      setSharedRevision((value) => value + 1);
    } catch {
      setSharedItemsError(true);
    } finally {
      setLoadingSharedItems(false);
    }
  };

  // Sync mute status
  useEffect(() => {
    if (!channel) return;
    try {
      const status = channel.muteStatus();
      setIsMuted(Boolean(status?.muted));
    } catch {
      setIsMuted(false);
    }
  }, [channel]);

  // Handle Mute / Unmute
  const handleToggleMute = async () => {
    if (!channel || isTogglingMute) return;
    try {
      setIsTogglingMute(true);
      if (isMuted) {
        await channel.unmute();
        setIsMuted(false);
      } else {
        await channel.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.error("Failed to toggle channel mute:", err);
    } finally {
      setIsTogglingMute(false);
    }
  };

  // Extract all media, files, links, and pinned messages from channel messages
  const { mediaItems, fileItems, linkItems, pinnedMessages, memberItems } = useMemo(() => {
    const messages = channel.state?.messages || [];

    const media: Array<{
      messageId: string;
      url: string;
      title?: string;
      createdAt: string;
      isVideo?: boolean;
      sender: string;
    }> = [];

    const files: Array<{
      messageId: string;
      title: string;
      url: string;
      fileSize?: number;
      mimeType?: string;
      createdAt: string;
      sender: string;
    }> = [];

    const links: Array<{
      messageId: string;
      url: string;
      snippet: string;
      createdAt: string;
      sender: string;
    }> = [];

    messages.forEach((msg) => {
      // 1. Attachments
      (msg.attachments || []).forEach((att) => {
        const url = att.image_url || att.asset_url || (att as any).url;
        if (!url) return;

        const isImg =
          att.type === "image" ||
          Boolean(att.image_url) ||
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
        const isVideo = att.type === "video" || Boolean(att.mime_type?.startsWith("video/"));

        const dateStr = msg.created_at ? new Date(msg.created_at).toISOString() : "";

        if (isImg || isVideo) {
          media.push({
            messageId: msg.id,
            url,
            title: att.title || att.fallback || (isVideo ? "Shared video" : "Shared photo"),
            createdAt: dateStr,
            isVideo,
            sender: msg.user?.name || "StudyConnect member"
          });
        } else {
          files.push({
            messageId: msg.id,
            title: att.title || att.fallback || "Document",
            url,
            fileSize:
              typeof att.file_size === "number"
                ? att.file_size
                : typeof att.file_size === "string"
                ? parseInt(att.file_size, 10)
                : undefined,
            mimeType: att.mime_type,
            createdAt: dateStr,
            sender: msg.user?.name || "StudyConnect member"
          });
        }
      });

      // 2. Links in text
      if (msg.text) {
        const matches = msg.text.match(URL_REGEX);
        if (matches && matches.length > 0) {
          const dateStr = msg.created_at ? new Date(msg.created_at).toISOString() : "";
          matches.forEach((u) => {
            links.push({
              messageId: msg.id,
              url: u,
              snippet: msg.text || "",
              createdAt: dateStr,
              sender: msg.user?.name || "StudyConnect member"
            });
          });
        }
      }
    });

    // Pinned messages
    const pinned = channel.state?.pinnedMessages || [];

    // Members list
    const members = Object.values(channel.state?.members || {}).map((m: any) => ({
      id: m.user_id,
      name: m.user?.name || "Classmate",
      roll: m.user?.rollNumber || "Student",
      dept: m.user?.department || "Campus",
      avatar: m.user?.image,
      role: m.role || "member",
      isOnline: Boolean(m.user?.online)
    }));

    return {
      mediaItems: media.reverse(),
      fileItems: files.reverse(),
      linkItems: links.reverse(),
      pinnedMessages: pinned,
      memberItems: members
    };
  }, [channel.state?.messages, channel.state?.pinnedMessages, channel.state?.members, sharedRevision]);

  // Lightbox images array
  const lightboxImages: LightboxImage[] = useMemo(() => {
    return mediaItems.map((m) => ({
      url: m.url,
      title: m.title
    }));
  }, [mediaItems]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black/25 flex justify-end animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="w-full max-w-sm sm:max-w-md h-full max-h-screen bg-white dark:bg-[#0D1524] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-200 min-h-0"
        >

          {/* 1. Header */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#10192C] shrink-0">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-[#1E90FF]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isDM ? "Conversation Info" : "Channel Details"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Container for Profile, Privacy, Tabs & Content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col">
            {/* 2. Profile Summary Card */}
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center shrink-0">

            {isDM ? (
              <>
                <button type="button" onClick={() => (profileQuery.data?.profilePicture || peer?.avatar) && setShowProfilePhoto(true)} aria-label="View profile photo" className="relative mb-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF]">
                  {(profileQuery.data?.profilePicture || peer?.avatar) ? (
                    <img
                      src={profileQuery.data?.profilePicture || peer?.avatar}
                      alt={peer?.name || channelName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                      {(peer?.name || "DM").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {peer?.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0D1524]" />
                  )}
                </button>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {profileQuery.data?.fullName || peer?.name || channelName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {profileQuery.data?.rollNumber || peer?.roll || "Student"} • {profileQuery.data?.department || peer?.dept || "Campus"}
                </p>
                {profileQuery.data && <p className="mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">{profileQuery.data.bio?.trim() || "No About information"}</p>}
                {peer?.isOnline ? (
                  <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active now
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-2">Offline</span>
                )}
                <button type="button" onClick={() => profileId && setSelectedMember({ id: profileId, name: profileQuery.data?.fullName || peer?.name || channelName, avatar: profileQuery.data?.profilePicture || peer?.avatar })} className="mt-3 text-xs font-semibold text-[#1E90FF] hover:underline">View profile and friendship</button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#1E90FF] flex items-center justify-center mb-3 shadow-xs">
                  <Hash size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  #{channelName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {communityName || "Community Channel"}
                </p>
                <span className="text-[11px] text-slate-400 mt-1">
                  {memberItems.length} member{memberItems.length === 1 ? "" : "s"}
                </span>
              </>
            )}

            {/* Quick Action Buttons */}
            <div className={`grid ${isDM ? "grid-cols-4" : "grid-cols-3"} gap-2 w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80`}>
              {isDM && <button onClick={onClose} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 text-xs font-semibold"><MessageSquare size={16} /><span>Message</span></button>}
              {isDM && <button onClick={() => onStartCall?.("audio")} disabled={!onStartCall} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 text-xs font-semibold disabled:opacity-50"><Phone size={16} /><span>Voice</span></button>}
              {isDM && <button onClick={() => onStartCall?.("video")} disabled={!onStartCall} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 text-xs font-semibold disabled:opacity-50"><Video size={16} /><span>Video</span></button>}
              <button
                onClick={handleToggleMute}
                disabled={isTogglingMute}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isMuted
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                }`}
                title={isMuted ? "Unmute conversation" : "Mute conversation"}
              >
                {isTogglingMute ? (
                  <Loader2 size={16} className="animate-spin text-sky-500" />
                ) : isMuted ? (
                  <BellOff size={16} />
                ) : (
                  <Bell size={16} />
                )}
                <span>{isMuted ? "Muted" : "Mute"}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenSearch?.();
                }}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                title="Search messages in this chat"
              >
                <Search size={16} />
                <span>Search</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenStarred?.();
                }}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                title="View starred messages"
              >
                <Star size={16} className="text-yellow-400" />
                <span>Starred</span>
              </button>
            </div>
            {isDM && <p className="mt-2 text-left text-[10px] leading-relaxed text-slate-400">Mute uses Stream Chat's persistent mute until you unmute. Temporary durations and custom sounds are not supported here.</p>}

            {/* Privacy & Conversation Controls */}
            <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Privacy & Controls
              </span>

              {/* Chat Lock Toggle */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isLocked
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Hide chat
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isLocked ? "Hidden in this browser" : "Hide in this browser with PIN"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isLocked
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                      : "bg-[#1E90FF] text-white hover:bg-sky-600 shadow-sm"
                  }`}
                >
                  {isLocked ? "Hidden" : "Hide"}
                </button>
              </div>
              <p className="px-1 text-[10px] leading-relaxed text-slate-400">This local PIN only hides the conversation on this browser. It does not protect messages on other devices or encrypt their contents.</p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Disappearing messages unavailable</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Message expiry is not enforced by StudyConnect's backend yet, so this setting is disabled.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Security</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Messages use Stream Chat with account access controls and encrypted transport. StudyConnect does not currently provide end-to-end encryption or cryptographic safety-code verification.</p>
              </div>

              {/* Safety & Moderation Actions */}
              {isDM ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {onToggleBlockPeer && (
                    <button
                      type="button"
                      onClick={() => setShowBlockConfirm(true)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isPeerBlocked
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50"
                      }`}
                    >
                      <Ban size={14} />
                      <span>{isPeerBlocked ? "Unblock" : "Block"}</span>
                    </button>
                  )}

                  {onOpenReport && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId =
                          peer?.id ||
                          (channel.state?.members
                            ? Object.values(channel.state.members).find(
                                (m) => m.user_id !== channel._client?.userID
                              )?.user_id || ""
                            : "");
                        onOpenReport({
                          targetType: "USER",
                          targetId,
                          targetTitle: peer?.name || "Student"
                        });
                      }}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Flag size={14} className="text-amber-500" />
                      <span>Report User</span>
                    </button>
                  )}
                </div>
              ) : (
                onOpenReport && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenReport({
                        targetType: "COMMUNITY",
                        targetId: (channel.data as any)?.communityId || channel.id,
                        targetTitle: channelName
                      })
                    }
                    className="w-full p-2 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Flag size={14} className="text-amber-500" />
                    <span>Report Channel</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* 3. Navigation Tabs */}
          <div className="sticky top-0 z-10 flex items-center px-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0D1524] overflow-x-auto text-xs font-semibold scrollbar-none shadow-2xs shrink-0">
            <button
              onClick={() => setActiveTab("media")}

              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "media"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <ImageIcon size={14} />
              <span>Media ({mediaItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "files"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FileText size={14} />
              <span>Documents ({fileItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "links"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <LinkIcon size={14} />
              <span>Links ({linkItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("pinned")}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "pinned"
                  ? "border-[#1E90FF] text-[#1E90FF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Pin size={14} />
              <span>Pinned ({pinnedMessages.length})</span>
            </button>
            {!isDM && (
              <button
                onClick={() => setActiveTab("members")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === "members"
                    ? "border-[#1E90FF] text-[#1E90FF]"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Users size={14} />
                <span>Members ({memberItems.length})</span>
              </button>
            )}
          </div>

          {/* 4. Tab Content Area */}
          <div className="p-4 flex-1">
            {/* ── A. MEDIA TAB ── */}

            {activeTab === "media" && (
              <div>
                {mediaItems.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No media shared yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer"
                        onClick={() => {
                          if (item.isVideo) {
                            window.open(item.url, "_blank", "noopener,noreferrer");
                            return;
                          }
                          if (onOpenLightbox) {
                            onOpenLightbox(lightboxImages, idx);
                          } else {
                            onJumpToMessage(item.messageId);
                            onClose();
                          }
                        }}
                      >
                        {item.isVideo ? <video src={item.url} aria-label={item.title || "Shared video"} className="w-full h-full object-cover" /> : <img src={item.url} alt={item.title || "Shared photo"} className="w-full h-full object-cover transition-transform group-hover:scale-105" />}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">{item.sender}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToMessage(item.messageId);
                            onClose();
                          }}
                          className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Jump to message"
                        >
                          <CornerDownRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── B. FILES TAB ── */}
            {activeTab === "files" && (
              <div className="space-y-2">
                {fileItems.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No documents or files shared yet</p>
                  </div>
                ) : (
                  fileItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-500 shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" title={item.title}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-400">{item.mimeType || "File"}{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ""}</p>
                          <p className="text-[10px] text-slate-400">{item.sender}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={item.title}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                          title="Download"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToMessage(item.messageId);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E90FF] hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                          title="Jump to message"
                        >
                          <CornerDownRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── C. LINKS TAB ── */}
            {activeTab === "links" && (
              <div className="space-y-2">
                {linkItems.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <LinkIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No links shared in this chat yet</p>
                  </div>
                ) : (
                  linkItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#1E90FF] hover:underline truncate flex items-center gap-1 flex-1"
                        >
                          <span className="truncate">{(() => { try { return new URL(item.url).hostname; } catch { return item.url; } })()} · {item.url}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToMessage(item.messageId);
                            onClose();
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-[#1E90FF] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Jump to message"
                        >
                          <CornerDownRight size={13} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.sender}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.snippet}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── D. PINNED MESSAGES TAB ── */}
            {activeTab === "pinned" && (
              <div className="space-y-2">
                {pinnedMessages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Pin size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No pinned messages</p>
                  </div>
                ) : (
                  pinnedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => {
                        onJumpToMessage(msg.id);
                        onClose();
                      }}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 cursor-pointer transition-all flex flex-col gap-1.5 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {msg.user?.name || "Classmate"}
                        </span>
                        <Pin size={12} className="text-amber-500 shrink-0" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {msg.text || "[Attachment]"}
                      </p>
                      <span className="text-[10px] text-sky-500 font-semibold self-end group-hover:underline">
                        Jump to message →
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── E. MEMBERS TAB ── */}
            {activeTab === "members" && !isDM && (
              <div className="space-y-2">
                {memberItems.map((m) => (
                    <div
                      key={m.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button type="button" onClick={() => m.id && setSelectedMember({ id: m.id, name: m.name, avatar: m.avatar })} aria-label={`View ${m.name}'s profile`} className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF]">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {m.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0D1524]" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <button type="button" onClick={() => m.id && setSelectedMember({ id: m.id, name: m.name, avatar: m.avatar })} className="text-left text-xs font-semibold text-slate-900 dark:text-white truncate hover:text-[#1E90FF]">
                          {m.name}
                        </button>
                        <p className="text-[10px] text-slate-400 truncate">
                          {m.roll} • {m.dept}
                        </p>
                      </div>
                    </div>

                    {m.role === "owner" || m.role === "admin" ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                        Owner
                      </span>
                    ) : m.role === "moderator" ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                        Mod
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {activeTab !== "pinned" && activeTab !== "members" && (hasMoreSharedItems || sharedItemsError) && (
              <div className="pt-4 text-center">
                {sharedItemsError && <p className="mb-2 text-xs text-rose-500">Could not load shared history.</p>}
                <button type="button" disabled={loadingSharedItems} onClick={loadMoreSharedItems} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  {loadingSharedItems ? "Loading…" : sharedItemsError ? "Retry" : "Load older shared items"}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>


      <SetChatPinModal
        isOpen={isSetPinModalOpen}
        onClose={() => setIsSetPinModalOpen(false)}
        onPinSet={() => {
          if (channelId) toggleLock(channelId);
          addToast("Chat hidden in this browser", "success");
        }}
      />

      {showProfilePhoto && (profileQuery.data?.profilePicture || peer?.avatar) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowProfilePhoto(false)}>
          <button type="button" aria-label="Close profile photo" className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white"><X /></button>
          <img src={profileQuery.data?.profilePicture || peer?.avatar} alt={`${peer?.name || "Contact"} profile photo`} className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      <ContactProfileDrawer
        isOpen={Boolean(selectedMember)}
        userId={selectedMember?.id || ""}
        fallbackName={selectedMember?.name}
        fallbackAvatar={selectedMember?.avatar}
        contextLabel={communityName ? `${communityName} · ${channelName}` : channelName}
        onSearchInChat={isDM ? () => { onClose(); onOpenSearch?.(); } : undefined}
        onClose={() => setSelectedMember(null)}
      />

      {/* Block / Unblock Confirmation Modal */}
      {showBlockConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 select-none animate-in fade-in duration-150"
          onClick={() => setShowBlockConfirm(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0D1524] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-800 dark:text-slate-100"
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <Ban size={24} />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900 dark:text-white mb-2">
              {isPeerBlocked ? `Unblock ${peer?.name || "User"}?` : `Block ${peer?.name || "User"}?`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              {isPeerBlocked
                ? `${peer?.name || "This user"} will be able to send you direct messages and see when you are active.`
                : `${peer?.name || "This user"} will no longer be able to send you direct messages or see your presence. They will not be notified.`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBlockConfirm(false);
                  onToggleBlockPeer?.();
                }}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer ${
                  isPeerBlocked
                    ? "bg-[#1E90FF] hover:bg-sky-600"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isPeerBlocked ? "Unblock User" : "Block User"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
