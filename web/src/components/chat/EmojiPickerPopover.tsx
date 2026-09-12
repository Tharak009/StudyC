import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Smile,
  ThumbsUp,
  BookOpen,
  Hash,
  Clock,
  X,
  GraduationCap
} from "lucide-react";

export interface CampusSticker {
  shortcode: string;
  name: string;
  emoji: string;
  description: string;
  tag: string;
}

export const CAMPUS_STICKERS: CampusSticker[] = [
  {
    shortcode: ":verified_scholar:",
    name: "Verified Scholar",
    emoji: "🎓",
    description: "Peer reviewed & verified coursework answer",
    tag: "Academic"
  },
  {
    shortcode: ":all_nighter:",
    name: "All-Nighter",
    emoji: "🌙",
    description: "Grinding through midnight syllabus deadlines",
    tag: "Study"
  },
  {
    shortcode: ":debug_duck:",
    name: "Debug Duck",
    emoji: "🦆",
    description: "Explain line-by-line rubber duck debugging",
    tag: "Coding"
  },
  {
    shortcode: ":coffee_fuel:",
    name: "Coffee Fuel",
    emoji: "☕",
    description: "Maximum caffeine intake required for this problem",
    tag: "Vibe"
  },
  {
    shortcode: ":midterm_rip:",
    name: "Midterm RIP",
    emoji: "💀",
    description: "Syllabus was completely different from the exam",
    tag: "Exams"
  },
  {
    shortcode: ":code_wizard:",
    name: "Code Wizard",
    emoji: "🧙‍♂️",
    description: "Clean O(1) algorithm solution with no memory leaks",
    tag: "Coding"
  },
  {
    shortcode: ":gpa_booster:",
    name: "GPA Booster",
    emoji: "📈",
    description: "A+ assignment boost and curve appreciation",
    tag: "Academic"
  },
  {
    shortcode: ":brain_overheat:",
    name: "Brain Overheat",
    emoji: "🤯",
    description: "Recursion depth exceeded inside human brain",
    tag: "Exams"
  }
];

const EMOJI_CATEGORIES: Record<string, { label: string; icon: any; emojis: string[] }> = {
  smileys: {
    label: "Smileys",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😝",
      "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒",
      "😞", "😔", "😟", "😕", "🥺", "😢", "😭", "😤", "😠", "😡",
      "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
      "🤔", "🤭", "🤫", "😶", "😐", "😑", "😬", "🙄", "😴", "🤤"
    ]
  },
  gestures: {
    label: "Gestures",
    icon: ThumbsUp,
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘",
      "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚",
      "🖐️", "🖖", "👋", "🤙", "💪", "🦾", "🙏", "🤝", "👏", "🙌"
    ]
  },
  objects: {
    label: "Study Objects",
    icon: BookOpen,
    emojis: [
      "📚", "📖", "📕", "📗", "📘", "📙", "📝", "✏️", "✒️", "💻",
      "🖥️", "⌨️", "🖱️", "🔬", "🔭", "🧪", "🧫", "🧬", "📐", "📏",
      "📊", "📈", "📉", "🎒", "🎓", "💡", "⏰", "⏳", "☕", "🍕"
    ]
  },
  symbols: {
    label: "Symbols",
    icon: Hash,
    emojis: [
      "⚡", "🔥", "🚀", "💡", "❓", "❗", "⚠️", "❌", "✅", "💯",
      "🎯", "🏆", "🥇", "🥈", "🥉", "🌟", "✨", "💥", "🔒", "🔓",
      "🔑", "🛡️", "⚙️", "🔧", "🧩", "🏷️", "📌", "📍", "❤️", "💎"
    ]
  }
};

const RECENT_EMOJIS_KEY = "studyconnect_recent_emojis";

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string, category: "STANDARD" | "CAMPUS_CUSTOM") => void;
  align?: "left" | "right";
  className?: string;
}

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  align = "right",
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<"stickers" | "smileys" | "gestures" | "objects" | "symbols" | "recent">("stickers");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_EMOJIS_KEY);
      return saved ? JSON.parse(saved) : ["🎓", "🦆", "☕", "👍", "💡", "🔥"];
    } catch {
      return ["🎓", "🦆", "☕", "👍", "💡", "🔥"];
    }
  });

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelect = (emoji: string, category: "STANDARD" | "CAMPUS_CUSTOM") => {
    // Save to recents
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 16);
      try {
        localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    onSelectEmoji(emoji, category);
    onClose();
  };

  // Filtered Campus Stickers
  const filteredStickers = useMemo(() => {
    if (!searchQuery.trim()) return CAMPUS_STICKERS;
    const q = searchQuery.toLowerCase().replace(/:/g, "");
    return CAMPUS_STICKERS.filter(
      (s) =>
        s.shortcode.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered standard emojis if searching
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach((cat) => {
      if (cat.label.toLowerCase().includes(q)) {
        matches.push(...cat.emojis);
      }
    });
    return Array.from(new Set(matches));
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`absolute z-50 bottom-full mb-2 ${
          align === "right" ? "right-0" : "left-0"
        } w-80 sm:w-88 rounded-2xl bg-[#0F1A30]/95 dark:bg-[#080D1A]/95 backdrop-blur-2xl border border-[#162544] dark:border-slate-800/90 shadow-[0_12px_36px_rgba(0,0,0,0.55)] text-slate-200 overflow-hidden flex flex-col select-none ${className}`}
        style={{ maxHeight: "380px" }}
      >
        {/* ── Popover Header with Search ── */}
        <div className="p-3 border-b border-[#162544] bg-[#0A1120]/70 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
              <Sparkles size={14} className="text-[#1E90FF]" />
              <span>Academic Emoji & Stickers</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by shortcode (e.g. :duck, :scholar)..."
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#162544]/60 border border-slate-700/60 focus:border-[#1E90FF] focus:outline-none text-slate-100 placeholder:text-slate-500 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Category Tabs ── */}
        {!searchQuery && (
          <div className="flex items-center px-2 py-1.5 border-b border-[#162544] bg-[#0c1424]/80 gap-1 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setActiveTab("stickers")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === "stickers"
                  ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <GraduationCap size={12} />
              <span>Campus Stickers</span>
            </button>

            <button
              onClick={() => setActiveTab("recent")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                activeTab === "recent"
                  ? "bg-[#1E90FF] text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              title="Recently Used"
            >
              <Clock size={13} />
            </button>

            {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === key
                      ? "bg-[#1E90FF] text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                  title={cat.label}
                >
                  <IconComp size={13} />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Emoji Content Body ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-[#162544]">
          {searchQuery ? (
            /* Search Results */
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Campus Stickers ({filteredStickers.length})
                </span>
                {filteredStickers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No matching campus stickers</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {filteredStickers.map((s) => (
                      <button
                        key={s.shortcode}
                        onClick={() => handleSelect(s.shortcode, "CAMPUS_CUSTOM")}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#162544]/40 hover:bg-[#1E90FF]/20 border border-slate-700/40 hover:border-[#1E90FF]/40 text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl group-hover:scale-125 transition-transform">
                            {s.emoji}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-100 group-hover:text-sky-300">
                              {s.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {s.shortcode}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#0F1A30] text-sky-400 font-medium">
                          {s.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredEmojis.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Standard Emojis ({filteredEmojis.length})
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {filteredEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSelect(emoji, "STANDARD")}
                        className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "stickers" ? (
            /* Campus Stickers Tab */
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Campus Custom Stickers
                </span>
                <span className="text-[10px] text-slate-500">Verified .edu</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {CAMPUS_STICKERS.map((s) => (
                  <button
                    key={s.shortcode}
                    onClick={() => handleSelect(s.shortcode, "CAMPUS_CUSTOM")}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#162544]/50 hover:bg-[#1E90FF]/25 border border-slate-700/50 hover:border-[#1E90FF]/50 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0F1A30] flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-[#1E90FF]/30 transition-all">
                        {s.emoji}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 group-hover:text-sky-300">
                            {s.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 font-mono">
                            {s.tag}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                          {s.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 group-hover:text-sky-300">
                      {s.shortcode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === "recent" ? (
            /* Recent Emojis Tab */
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Frequently Used
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {recentEmojis.map((emoji) => {
                  const isCampus = emoji.startsWith(":");
                  const sticker = isCampus
                    ? CAMPUS_STICKERS.find((s) => s.shortcode === emoji)
                    : null;
                  return (
                    <button
                      key={emoji}
                      onClick={() =>
                        handleSelect(
                          emoji,
                          isCampus ? "CAMPUS_CUSTOM" : "STANDARD"
                        )
                      }
                      className="h-10 rounded-xl bg-[#162544]/40 hover:bg-[#1E90FF]/25 border border-slate-700/40 flex items-center justify-center text-xl hover:scale-115 transition-transform cursor-pointer"
                      title={sticker ? sticker.name : emoji}
                    >
                      {sticker ? sticker.emoji : emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Standard Categorized Emojis */
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {EMOJI_CATEGORIES[activeTab]?.label}
              </span>
              <div className="grid grid-cols-7 gap-1">
                {EMOJI_CATEGORIES[activeTab]?.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji, "STANDARD")}
                    className="h-8 w-8 rounded-lg hover:bg-[#1E90FF]/20 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-3 py-1.5 border-t border-[#162544] bg-[#0A1120] text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Click any reaction to toggle</span>
          <span className="font-mono text-sky-400/80">:shortcodes_supported</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default EmojiPickerPopover;
