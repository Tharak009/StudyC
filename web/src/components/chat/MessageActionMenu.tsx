import React, { useState, useRef, useEffect } from "react";
import type { LocalMessage, Channel as StreamChannel } from "stream-chat";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  Reply,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  CheckSquare,
  Check,
  Star,
  Flag,
  Pin,
  Share2
} from "lucide-react";
import { ReactionPickerPopover } from "./ReactionPickerPopover";
import { useChatOrganizationStore } from "../../store/chat-organization.store";
import { resolveMessageActions } from "../../utils/message-action-resolver";

interface MessageActionMenuProps {
  message: LocalMessage;
  isMine: boolean;
  canModerate?: boolean;
  channel?: StreamChannel;
  channelRole?: string;
  onReply: (message: LocalMessage) => void;
  onOpenThread: (message: LocalMessage) => void;
  onEdit: (message: LocalMessage) => void;
  onDeleteForMe: (message: LocalMessage) => void;
  onDeleteForEveryone: (message: LocalMessage) => void;
  onToggleSelect: (messageId: string) => void;
  onReact: (reactionType: string) => void;
  onForward?: (message: LocalMessage) => void;
  onTogglePin?: (message: LocalMessage) => void;
  onReport?: (message: LocalMessage) => void;
  ownReactions?: string[];
  align?: "left" | "right";
}


export function MessageActionMenu({
  message,
  isMine,
  canModerate = false,
  channel,
  channelRole = "member",
  onReply,
  onOpenThread,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onToggleSelect,
  onReact,
  onForward,
  onTogglePin,
  onReport,
  ownReactions = [],
  align = "right"
}: MessageActionMenuProps) {
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  const isStarred = useChatOrganizationStore((state) =>
    state.isMessageStarred(message.id)
  );
  const starMessage = useChatOrganizationStore((state) => state.starMessage);
  const unstarMessage = useChatOrganizationStore((state) => state.unstarMessage);

  const isDM = Boolean(
    channel?.type === "messaging" ||
      (channel?.data as any)?.studyConnectType === "dm" ||
      channel?.id?.startsWith("dm_")
  );

  const actions = resolveMessageActions({
    message,
    currentUserId: channel?.client?.userID || "",
    channel,
    isDM,
    channelRole,
    isStarred
  });


  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    if (isStarred) {
      await unstarMessage(message.id, channel);
    } else {
      const chanData = (channel?.data || {}) as any;
      const isDM =
        chanData?.studyConnectType === "dm" ||
        String(channel?.id || "").startsWith("dm-");

      let attachmentType: "image" | "file" | "voice" | undefined;
      if (message.attachments?.some((a) => a.type === "image")) {
        attachmentType = "image";
      } else if (
        message.attachments?.some(
          (a) => a.type === "voice" || a.type === "audio"
        )
      ) {
        attachmentType = "voice";
      } else if (message.attachments?.length) {
        attachmentType = "file";
      }

      await starMessage(
        {
          messageId: message.id,
          channelId: channel?.id || "",
          channelCid: channel?.cid || "",
          channelName:
            (chanData?.name as string) || channel?.id || "Direct Message",
          communityId: chanData?.communityId,
          communityName: chanData?.communityName,
          isDM,
          senderId: message.user?.id || "",
          senderName: message.user?.name || "Classmate",
          senderAvatar: message.user?.image,
          senderRoll: (message.user as any)?.rollNumber,
          text: message.text || "",
          createdAt: String(message.created_at || new Date().toISOString()),
          hasAttachments: Boolean(message.attachments?.length),
          attachmentType
        },
        channel
      );
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Measure space below to determine whether menu should open upward or downward
  const checkUpward = () => {
    const target = dropdownRef.current || containerRef.current;
    if (target) {
      const rect = target.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const scrollParent = target.closest(
        ".str-chat__list, .str-chat__message-list-scroll-container"
      );
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const spaceBelowInParent = parentRect.bottom - rect.bottom;
        setOpenUpward(spaceBelow < 220 || spaceBelowInParent < 220);
      } else {
        setOpenUpward(spaceBelow < 220);
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isDropdownOpen]);

  const handleCopyText = async () => {
    if (message.text) {
      try {
        await navigator.clipboard.writeText(message.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text:", err);
      }
    }
    setIsDropdownOpen(false);
  };

  const isDeleted = message.type === "deleted" || Boolean(message.deleted_at);
  if (isDeleted) return null;

  return (
    <>
      {/* Desktop Hover Action Bar & Mobile Touch Menu */}
      <div
        ref={containerRef}
        onMouseEnter={checkUpward}
        className={`absolute -top-3.5 ${
          align === "right" ? "right-2" : "left-2"
        } z-20 flex items-center bg-white dark:bg-[#111B2C] border border-slate-200 dark:border-slate-700/80 rounded-full shadow-sm py-0.5 px-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 scale-95 group-hover:scale-100`}
      >
        {/* Quick Reaction Button */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              checkUpward();
              setIsReactionPickerOpen(!isReactionPickerOpen);
            }}
            className="p-1.5 rounded-full text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Add reaction"
            aria-label="Add reaction"
          >
            <Smile size={14} />
          </button>

          <ReactionPickerPopover
            isOpen={isReactionPickerOpen}
            onClose={() => setIsReactionPickerOpen(false)}
            onSelectReaction={onReact}
            ownReactions={ownReactions}
            align={align}
            position={openUpward ? "top" : "bottom"}
          />
        </div>

        {/* Quoted Reply in Channel Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReply(message);
          }}
          className="p-1.5 rounded-full text-slate-500 hover:text-[#005FFF] dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Quote reply in channel"
          aria-label="Quote reply"
        >
          <Reply size={14} />
        </button>

        {/* Reply in Thread Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenThread(message);
          }}
          className="p-1.5 rounded-full text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Reply in thread"
          aria-label="Reply in thread"
        >
          <MessageSquare size={14} />
        </button>

        {/* 3-dots Context Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              checkUpward();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className={`p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              isDropdownOpen ? "bg-slate-100 dark:bg-slate-800" : ""
            }`}
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal size={14} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: openUpward ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: openUpward ? 4 : -4 }}
                transition={{ duration: 0.12 }}
                className={`absolute ${
                  align === "right" ? "right-0" : "left-0"
                } ${
                  openUpward
                    ? "bottom-full mb-1.5 origin-bottom"
                    : "top-full mt-1.5 origin-top"
                } z-50 w-44 rounded-xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700/80 shadow-xl py-1 text-xs text-slate-700 dark:text-slate-200 backdrop-blur-md`}
              >
                {/* Copy Text */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} className="text-slate-400" />
                  )}
                  <span>{copied ? "Copied to clipboard" : "Copy text"}</span>
                </button>

                {/* Star / Unstar Message */}
                {actions.canStar && (
                  <button
                    type="button"
                    onClick={handleToggleStar}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Star
                      size={14}
                      className={
                        isStarred
                          ? "text-amber-500 fill-amber-500"
                          : "text-slate-400"
                      }
                    />
                    <span>{isStarred ? "Unstar message" : "Star message"}</span>
                  </button>
                )}

                {/* Forward Message */}
                {actions.canForward && onForward && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      onForward(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Share2 size={14} className="text-[#1E90FF]" />
                    <span>Forward message</span>
                  </button>
                )}

                {/* Pin / Unpin Message */}
                {actions.canPin && onTogglePin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      onTogglePin(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Pin
                      size={14}
                      className={
                        actions.isPinned
                          ? "text-amber-500 fill-amber-500"
                          : "text-amber-500"
                      }
                    />
                    <span>{actions.isPinned ? "Unpin message" : "Pin to channel"}</span>
                  </button>
                )}

                {/* Edit (only for author) */}
                {actions.canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      onEdit(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Pencil size={14} className="text-sky-500" />
                    <span>Edit message</span>
                  </button>
                )}

                {/* Select Message (Multi-Select) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    onToggleSelect(message.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <CheckSquare size={14} className="text-indigo-400" />
                  <span>Select message</span>
                </button>

                {/* Report message */}
                {actions.canReport && onReport && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      onReport(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors text-left cursor-pointer"
                  >
                    <Flag size={14} />
                    <span>Report message</span>
                  </button>
                )}


                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Delete Trigger */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete...</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Choice Modal / Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 text-slate-800 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Delete Message</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose how you want to delete this message.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 my-4">
                {/* Delete for Me */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDeleteForMe(message);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Delete for me
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    This message will be hidden from your device only.
                  </div>
                </button>

                {/* Delete for Everyone (if mine or moderator) */}
                {(isMine || canModerate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      onDeleteForEveryone(message);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40 transition-colors text-left cursor-pointer"
                  >
                    <div className="font-semibold text-red-600 dark:text-red-300">
                      Delete for everyone
                    </div>
                    <div className="text-[11px] text-red-500/80 dark:text-red-400/80">
                      Soft-delete for everyone in this channel (leaves a tombstone).
                    </div>
                  </button>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
