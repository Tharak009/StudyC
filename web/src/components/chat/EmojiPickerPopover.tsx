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
  GraduationCap,
  Image as ImageIcon
} from "lucide-react";
import { gifProvider, type GifItem } from "../../services/gif-provider";

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

export interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string, category: "STANDARD" | "CAMPUS_CUSTOM") => void;
  onSelectGif?: (gifUrl: string) => void;
  initialMode?: "emoji" | "stickers" | "gifs";
  align?: "left" | "right";
  className?: string;
}

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectGif,
  initialMode = "emoji",
  align = "right",
  className = ""
}) => {
  const [mainMode, setMainMode] = useState<"emoji" | "stickers" | "gifs">(initialMode);

  useEffect(() => {
    if (initialMode) {
      setMainMode(initialMode);
    }
  }, [initialMode, isOpen]);

  const [gifCategory, setGifCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"stickers" | "smileys" | "gestures" | "objects" | "symbols" | "recent">("smileys");
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

  const filteredGifs = useMemo(() => {
    const list = gifCategory === "all" ? gifProvider.getTrending() : gifProvider.getByCategory(gifCategory);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((g) => g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
  }, [searchQuery, gifCategory]);

  const handleSelectGif = (gifUrl: string) => {
    if (onSelectGif) {
      onSelectGif(gifUrl);
    } else {
      onSelectEmoji(gifUrl, "STANDARD");
    }
    onClose();
  };

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
        {/* ── Popover Header with Tabs & Search ── */}
        <div className="p-2.5 border-b border-[#162544] bg-[#0A1120]/70 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg bg-black/40 p-0.5 border border-slate-700/50">
              <button
                type="button"
                onClick={() => setMainMode("emoji")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  mainMode === "emoji" ? "bg-[#1E90FF] text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Smile size={12} />
                <span>Emoji</span>
              </button>
              <button
                type="button"
                onClick={() => setMainMode("stickers")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  mainMode === "stickers" ? "bg-[#1E90FF] text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <GraduationCap size={12} />
                <span>Stickers</span>
              </button>
              <button
                type="button"
                onClick={() => setMainMode("gifs")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  mainMode === "gifs" ? "bg-[#1E90FF] text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <ImageIcon size={12} />
                <span>GIFs</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
              placeholder={
                mainMode === "gifs"
                  ? "Search GIFs (study, code, celebrate)..."
                  : mainMode === "stickers"
                  ? "Search stickers (:duck, :scholar)..."
                  : "Search emojis..."
              }
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#162544]/60 border border-slate-700/60 focus:border-[#1E90FF] focus:outline-none text-slate-100 placeholder:text-slate-500 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Sub-header / Category Tabs ── */}
        {!searchQuery && mainMode === "emoji" && (
          <div className="flex items-center px-2 py-1.5 border-b border-[#162544] bg-[#0c1424]/80 gap-1 overflow-x-auto scrollbar-none shrink-0">
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

        {!searchQuery && mainMode === "gifs" && (
          <div className="flex items-center px-2.5 py-1.5 border-b border-[#162544] bg-[#0c1424]/80 gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {[
              { id: "all", label: "All" },
              { id: "study", label: "Study" },
              { id: "code", label: "Code" },
              { id: "celebrate", label: "Celebrate" },
              { id: "reactions", label: "Reactions" }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setGifCategory(cat.id)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                  gifCategory === cat.id
                    ? "bg-[#1E90FF] text-white shadow-xs"
                    : "bg-[#162544]/60 text-slate-400 hover:text-white hover:bg-[#162544]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content Body ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-[#162544]">
          {mainMode === "gifs" ? (
            /* GIFs View */
            <div>
              {filteredGifs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No matching GIFs found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredGifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSelectGif(gif.url)}
                      className="group relative aspect-4/3 overflow-hidden rounded-xl border border-slate-700/50 bg-[#162544]/40 hover:border-[#1E90FF] transition-all cursor-pointer"
                    >
                      <img
                        src={gif.previewUrl}
                        alt={gif.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white font-medium truncate block">
                          {gif.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : mainMode === "stickers" ? (
            /* Stickers View */
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Campus Custom Stickers
                </span>
                <span className="text-[10px] text-slate-500">Verified .edu</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {filteredStickers.map((s) => (
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
          ) : (
            /* Emoji View (Search or Categorized) */
            searchQuery ? (
              <div className="space-y-3">
                {filteredEmojis.length > 0 ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Matching Emojis ({filteredEmojis.length})
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
                ) : (
                  <p className="py-6 text-center text-xs text-slate-500">No matching emojis found.</p>
                )}
              </div>
            ) : activeTab === "recent" ? (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Frequently Used
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {recentEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSelect(emoji, "STANDARD")}
                      className="h-10 rounded-xl bg-[#162544]/40 hover:bg-[#1E90FF]/25 border border-slate-700/40 flex items-center justify-center text-xl hover:scale-115 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
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
            )
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-3 py-1.5 border-t border-[#162544] bg-[#0A1120] text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span>{mainMode === "gifs" ? "Tap GIF to send" : "Tap emoji/sticker to react or insert"}</span>
          <span className="font-mono text-sky-400/80">:shortcodes_supported</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default EmojiPickerPopover;
