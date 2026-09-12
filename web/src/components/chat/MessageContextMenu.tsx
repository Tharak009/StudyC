import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Reply,
  Copy,
  Edit2,
  Forward,
  Star,
  Pin,
  CheckSquare,
  Trash2,
  SmilePlus
} from "lucide-react";

export interface MessageContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  isSender: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  canEdit: boolean;
  canDeleteForEveryone: boolean;
  canPin: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onOpenEmojiPicker: () => void;
  onCopyText: () => void;
  onEdit: () => void;
  onForward: () => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
  onSelectMode: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  isMobileSheet?: boolean;
}

const QUICK_REACTION_EMOJIS = ["❤️", "👍", "💡", "🔥", "👏", "😂"];

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  isDeleted = false,
  isPinned = false,
  isStarred = false,
  canEdit,
  canDeleteForEveryone,
  canPin,
  onReply,
  onReact,
  onOpenEmojiPicker,
  onCopyText,
  onEdit,
  onForward,
  onToggleStar,
  onTogglePin,
  onSelectMode,
  onDeleteForMe,
  onDeleteForEveryone,
  isMobileSheet = false
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate clamped coordinates for desktop dropdown
  const menuWidth = 240;
  const menuHeight = 360;
  const posX = Math.min(Math.max(10, position.x), window.innerWidth - menuWidth - 16);
  const posY = Math.min(Math.max(10, position.y), window.innerHeight - menuHeight - 16);

  if (isMobileSheet) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:hidden">
          <motion.div
            ref={menuRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="w-full max-w-lg bg-[#0E1726] border-t border-slate-700/60 rounded-t-3xl p-4 shadow-2xl text-slate-200 select-none pb-8"
          >
            {/* Handle bar */}
            <div className="w-12 h-1.5 bg-slate-600/60 rounded-full mx-auto mb-3" />

            {/* Quick Reactions Bar */}
            {!isDeleted && (
              <div className="flex items-center justify-around py-2 px-1 mb-3 bg-[#162544]/60 rounded-2xl border border-slate-700/40">
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      onClose();
                    }}
                    className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-125 active:scale-95 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onOpenEmojiPicker();
                    onClose();
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-700/40 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <SmilePlus size={18} />
                </button>
              </div>
            )}

            {/* Action Items */}
            <div className="space-y-1">
              {!isDeleted && (
                <button
                  onClick={() => {
                    onReply();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
                >
                  <Reply size={16} className="text-sky-400" />
                  <span>Reply</span>
                </button>
              )}

              {!isDeleted && (
                <button
                  onClick={() => {
                    onCopyText();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
                >
                  <Copy size={16} className="text-slate-400" />
                  <span>Copy Text</span>
                </button>
              )}

              {canEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
                >
                  <Edit2 size={16} className="text-amber-400" />
                  <span>Edit Message</span>
                </button>
              )}

              {!isDeleted && (
                <button
                  onClick={() => {
                    onForward();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
                >
                  <Forward size={16} className="text-emerald-400" />
                  <span>Forward Message</span>
                </button>
              )}

              {!isDeleted && (
                <button
                  onClick={() => {
                    onToggleStar();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
                >
                  <Star size={16} className={isStarred ? "text-yellow-400 fill-yellow-400" : "text-slate-400"} />
                  <span>{isStarred ? "Unstar Message" : "Star Message"}</span>
                </button>
              )}

              {!isDeleted && canPin && (
                <button
                  onClick={() => {
                    onTogglePin();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
                >
                  <Pin size={16} className={isPinned ? "text-[#1E90FF] fill-[#1E90FF]" : "text-slate-400"} />
                  <span>{isPinned ? "Unpin Message" : "Pin Message"}</span>
                </button>
              )}

              <button
                onClick={() => {
                  onSelectMode();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-left text-sm font-medium transition-colors"
              >
                <CheckSquare size={16} className="text-purple-400" />
                <span>Select Messages</span>
              </button>

              <button
                onClick={() => {
                  onDeleteForMe();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-red-500/10 text-left text-sm font-medium text-red-400 transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete for Me</span>
              </button>

              {canDeleteForEveryone && (
                <button
                  onClick={() => {
                    onDeleteForEveryone();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-red-500/15 text-left text-sm font-medium text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete for Everyone</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-sm font-medium text-slate-300"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Desktop Context Dropdown Menu
  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{ left: `${posX}px`, top: `${posY}px` }}
        className="fixed z-50 w-60 rounded-2xl bg-[#0F1A30]/95 dark:bg-[#090E1B]/95 backdrop-blur-xl border border-[#162544] dark:border-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.65)] text-slate-200 py-1.5 select-none overflow-hidden"
      >
        {/* Quick Reactions Bar */}
        {!isDeleted && (
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#162544] bg-[#0A1120]/60">
            <div className="flex items-center gap-1">
              {QUICK_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(emoji);
                    onClose();
                  }}
                  className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                onOpenEmojiPicker();
                onClose();
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="More Reactions"
            >
              <SmilePlus size={15} />
            </button>
          </div>
        )}

        {/* Menu Items */}
        <div className="py-1">
          {!isDeleted && (
            <button
              onClick={() => {
                onReply();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
            >
              <Reply size={14} className="text-sky-400" />
              <span>Reply</span>
            </button>
          )}

          {!isDeleted && (
            <button
              onClick={() => {
                onCopyText();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
            >
              <Copy size={14} className="text-slate-400" />
              <span>Copy Text</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
            >
              <Edit2 size={14} className="text-amber-400" />
              <span>Edit</span>
            </button>
          )}

          {!isDeleted && (
            <button
              onClick={() => {
                onForward();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
            >
              <Forward size={14} className="text-emerald-400" />
              <span>Forward</span>
            </button>
          )}

          {!isDeleted && (
            <button
              onClick={() => {
                onToggleStar();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
            >
              <Star size={14} className={isStarred ? "text-yellow-400 fill-yellow-400" : "text-slate-400"} />
              <span>{isStarred ? "Unstar" : "Star"}</span>
            </button>
          )}

          {!isDeleted && canPin && (
            <button
              onClick={() => {
                onTogglePin();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
            >
              <Pin size={14} className={isPinned ? "text-[#1E90FF] fill-[#1E90FF]" : "text-slate-400"} />
              <span>{isPinned ? "Unpin" : "Pin"}</span>
            </button>
          )}

          <div className="my-1 border-t border-[#162544]" />

          <button
            onClick={() => {
              onSelectMode();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#162544] text-left text-xs font-medium transition-colors"
          >
            <CheckSquare size={14} className="text-purple-400" />
            <span>Select Messages</span>
          </button>

          <button
            onClick={() => {
              onDeleteForMe();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/10 text-left text-xs font-medium text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete for Me</span>
          </button>

          {canDeleteForEveryone && (
            <button
              onClick={() => {
                onDeleteForEveryone();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/15 text-left text-xs font-medium text-red-500 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete for Everyone</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageContextMenu;
