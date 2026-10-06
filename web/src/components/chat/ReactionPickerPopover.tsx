import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ReactionDefinition {
  type: string;
  emoji: string;
  label: string;
}

export const STANDARD_REACTIONS: ReactionDefinition[] = [
  { type: "thumbs_up", emoji: "👍", label: "Thumbs up" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" }
];

interface ReactionPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReaction: (reactionType: string) => void;
  ownReactions?: string[];
  align?: "left" | "right" | "center";
  position?: "top" | "bottom";
}

export function ReactionPickerPopover({
  isOpen,
  onClose,
  onSelectReaction,
  ownReactions = [],
  align = "right",
  position = "top"
}: ReactionPickerPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
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

  const alignClasses =
    align === "left"
      ? "left-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "right-0";

  const positionClasses =
    position === "top"
      ? "bottom-full mb-1.5 origin-bottom"
      : "top-full mt-1.5 origin-top";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.85, y: position === "top" ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: position === "top" ? 4 : -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`absolute z-50 ${alignClasses} ${positionClasses} flex items-center gap-1 p-1 rounded-full bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700/80 shadow-lg shadow-black/10 dark:shadow-black/30 backdrop-blur-md`}
          role="dialog"
          aria-label="Reactions"
        >
          {STANDARD_REACTIONS.map((reaction) => {
            const isSelected = ownReactions.includes(reaction.type);
            return (
              <motion.button
                key={reaction.type}
                type="button"
                whileHover={{ scale: 1.3, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectReaction(reaction.type);
                  onClose();
                }}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full text-base transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-sky-100 dark:bg-sky-950/70 ring-1.5 ring-[#005FFF]"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/80"
                }`}
                title={reaction.label}
                aria-label={reaction.label}
              >
                <span>{reaction.emoji}</span>
                {isSelected && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#005FFF]" />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
