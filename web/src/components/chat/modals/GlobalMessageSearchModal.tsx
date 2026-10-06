import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  MessageSquare,
  Users,
  FileText,
  Image as ImageIcon,
  Mic,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  Loader2,
  Hash,
  AlertCircle,
  RefreshCw,
  User
} from "lucide-react";
import { useStreamChat } from "../../../hooks/useStreamChat";
import { useChatPrivacyStore } from "../../../store/chat-privacy.store";

export interface SearchResultItem {
  id: string;
  cid: string;
  sourceType: "dm" | "circle";
  sourceId: string;
  sourceName: string;
  channelId?: string;
  channelName?: string;
  communityId?: string;
  senderName: string;
  senderAvatar?: string;
  senderRoll?: string;
  rawSenderId?: string;
  content: string;
  messageType: string;
  createdAt: string;
  attachments?: Array<{ url: string; originalName: string; mimeType: string }>;
}


export interface GlobalMessageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: "all" | "dms" | "circles" | "current";
  currentConversationId?: string | null;
  currentChannelCid?: string | null;
  currentCommunityId?: string | null;
  currentChannelId?: string | null;
  currentPeerName?: string;
  currentCircleName?: string;
  onSelectMessage: (item: SearchResultItem) => void;
}

export function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) return <span>{text}</span>;

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-amber-300 dark:bg-amber-500/30 text-slate-900 dark:text-amber-200 px-0.5 rounded font-semibold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}

const TYPE_FILTERS = [
  { id: "all", label: "All Types", icon: MessageSquare },
  { id: "text", label: "Text", icon: MessageSquare },
  { id: "media", label: "Media & Photos", icon: ImageIcon },
  { id: "file", label: "Documents", icon: FileText },
  { id: "voice", label: "Voice Notes", icon: Mic }
];

const DATE_FILTERS = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "week", label: "Past 7 days" },
  { id: "month", label: "Past 30 days" }
];

export const GlobalMessageSearchModal: React.FC<GlobalMessageSearchModalProps> = ({
  isOpen,
  onClose,
  initialScope = "all",
  currentConversationId,
  currentChannelCid,
  currentCommunityId,
  currentChannelId,
  currentPeerName,
  currentCircleName,
  onSelectMessage
}) => {
  const { client } = useStreamChat();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "dms" | "circles" | "current">(initialScope);
  const [messageType, setMessageType] = useState("all");
  const [dateFilter, setDateFilter] = useState("any");
  const [senderFilter, setSenderFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setScope(initialScope);
    } else {
      setQuery("");
      setSenderFilter("");
      setResults([]);
      setNextCursor(null);
      setHasSearched(false);
      setSearchError(null);
    }
  }, [isOpen, initialScope]);

  // Compute date range from filter
  const getDateRange = useCallback(() => {
    if (dateFilter === "any") return {};
    const now = new Date();
    const start = new Date();
    if (dateFilter === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === "week") {
      start.setDate(now.getDate() - 7);
    } else if (dateFilter === "month") {
      start.setDate(now.getDate() - 30);
    }
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }, [dateFilter]);

  // Map a Stream search message response to a SearchResultItem
  const mapStreamResultToItem = useCallback(
    (item: any): SearchResultItem => {
      const msg = item.message || item;
      const chan = msg.channel || {};
      const chanData = (chan.data || {}) as any;

      const isDM =
        chanData.studyConnectType === "dm" ||
        chan.type === "messaging" && String(chan.id || "").startsWith("dm-");

      const sender = msg.user || {};

      let displaySourceName = chanData.name || chan.name || "Conversation";
      if (isDM && !chanData.name) {
        // For DMs find peer member name
        const members = Object.values(chan.members || {}) as any[];
        const peer = members.find((m) => m.user_id !== client?.userID) || members[0];
        displaySourceName = peer?.user?.name || currentPeerName || "Direct Message";
      } else if (!isDM && chanData.communityName) {
        displaySourceName = `${chanData.communityName} • #${chanData.name || chan.id}`;
      } else if (!isDM && currentCircleName) {
        displaySourceName = `${currentCircleName} • #${chanData.name || chan.id}`;
      }

      const attachments = (msg.attachments || []).map((att: any) => ({
        url: att.asset_url || att.image_url || att.url || "",
        originalName: att.title || att.fallback || "Attachment",
        mimeType: att.mime_type || att.type || ""
      }));

      return {
        id: msg.id,
        cid: msg.cid || chan.cid || `messaging:${chan.id}`,
        sourceType: isDM ? "dm" : "circle",
        sourceId: chan.id || currentConversationId || "",
        sourceName: displaySourceName,
        channelId: chan.id,
        channelName: chanData.name || chan.id,
        communityId: chanData.communityId || currentCommunityId || undefined,
        senderName: sender.name || "Classmate",
        senderAvatar: sender.image,
        senderRoll: (sender as any).rollNumber || "Student",
        rawSenderId: sender.id,
        content: msg.text || (attachments.length ? `📎 ${attachments[0].originalName}` : ""),
        messageType: attachments.some((a: any) => a.mimeType.startsWith("image/"))
          ? "image"
          : attachments.some((a: any) => a.mimeType.startsWith("audio/"))
          ? "voice"
          : attachments.length
          ? "file"
          : "text",
        createdAt: msg.created_at,
        attachments
      };
    },
    [client?.userID, currentPeerName, currentCircleName, currentConversationId, currentCommunityId]
  );

  // Build Stream search query parameters
  const buildSearchFilters = useCallback(() => {
    if (!client?.userID) return null;

    // 1. Channel filters (enforce authorization: user must be member)
    const channelFilters: any = {
      members: { $in: [client.userID] }
    };

    if (scope === "dms") {
      channelFilters.studyConnectType = "dm";
    } else if (scope === "circles") {
      channelFilters.studyConnectType = "community";
    } else if (scope === "current") {
      if (currentChannelCid) {
        channelFilters.cid = currentChannelCid;
      } else if (currentChannelId) {
        channelFilters.id = currentChannelId;
      } else if (currentConversationId) {
        channelFilters.id = currentConversationId;
      }
    }

    // 2. Message filters
    const msgFilter: any = {};
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      msgFilter.text = { $q: trimmedQuery };
    }

    if (senderFilter.trim()) {
      msgFilter["user.name"] = { $autocomplete: senderFilter.trim() };
    }

    const { startDate, endDate } = getDateRange();
    if (startDate) {
      msgFilter.created_at = { $gte: startDate };
      if (endDate) {
        msgFilter.created_at.$lte = endDate;
      }
    }

    if (messageType === "media") {
      msgFilter["attachments.type"] = { $in: ["image"] };
    } else if (messageType === "file") {
      msgFilter["attachments.type"] = { $in: ["file"] };
    } else if (messageType === "voice") {
      msgFilter["attachments.type"] = { $in: ["voice", "audio"] };
    }

    return { channelFilters, msgFilter, trimmedQuery };
  }, [
    client?.userID,
    scope,
    query,
    senderFilter,
    getDateRange,
    messageType,
    currentChannelCid,
    currentChannelId,
    currentConversationId
  ]);

  // Primary search executor
  const executeSearch = useCallback(async () => {
    if (!client || !client.userID) return;

    const params = buildSearchFilters();
    if (!params) return;
    const { channelFilters, msgFilter, trimmedQuery } = params;

    // Don't search if everything is empty
    if (!trimmedQuery && messageType === "all" && dateFilter === "any" && !senderFilter.trim()) {
      setResults([]);
      setNextCursor(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      // Use client.search directly on Stream Chat SDK
      const queryParam = Object.keys(msgFilter).length > 0 ? msgFilter : trimmedQuery;

      const response = await client.search(
        channelFilters,
        queryParam,
        {
          limit: 20,
          sort: [{ created_at: -1 }]
        }
      );

      const privacyStore = useChatPrivacyStore.getState();
      const rawItems = (response.results || []).map(mapStreamResultToItem);
      const items = rawItems.filter((item) => {
        // Exclude messages from blocked users
        if (privacyStore.isUserBlocked(item.rawSenderId)) return false;
        // Exclude messages from locked conversations unless unlocked in current session
        const chanId = item.channelId || item.sourceId;
        if (chanId && privacyStore.isLocked(chanId) && !privacyStore.isUnlockedInSession(chanId)) {
          return false;
        }
        return true;
      });

      setResults(items);
      setNextCursor(response.next || null);
    } catch (err: any) {
      console.error("Stream search error:", err);
      setSearchError(err?.message || "Could not complete search. Please try again.");
      setResults([]);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, buildSearchFilters, messageType, dateFilter, senderFilter, mapStreamResultToItem]);

  // Load more results via cursor pagination
  const handleLoadMore = async () => {
    if (!client || !nextCursor || isLoadingMore) return;

    const params = buildSearchFilters();
    if (!params) return;
    const { channelFilters, msgFilter, trimmedQuery } = params;

    setIsLoadingMore(true);
    try {
      const queryParam = Object.keys(msgFilter).length > 0 ? msgFilter : trimmedQuery;
      const response = await client.search(
        channelFilters,
        queryParam,
        {
          limit: 20,
          next: nextCursor,
          sort: [{ created_at: -1 }]
        }
      );

      const privacyStore = useChatPrivacyStore.getState();
      const rawNewItems = (response.results || []).map(mapStreamResultToItem);
      const newItems = rawNewItems.filter((item) => {
        if (privacyStore.isUserBlocked(item.rawSenderId)) return false;
        const chanId = item.channelId || item.sourceId;
        if (chanId && privacyStore.isLocked(chanId) && !privacyStore.isUnlockedInSession(chanId)) {
          return false;
        }
        return true;
      });

      setResults((prev) => [...prev, ...newItems]);
      setNextCursor(response.next || null);
    } catch (err) {
      console.error("Error loading more search results:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };


  // Debounced search on typing
  useEffect(() => {
    if (!isOpen) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      executeSearch();
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, scope, messageType, dateFilter, senderFilter, isOpen, executeSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-start justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.16 }}
          className="w-full max-w-2xl bg-white dark:bg-[#0D1524] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >

          {/* Top Search Input Box */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-[#111A2E]">
            <Search size={20} className="text-[#1E90FF] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages (e.g. 'binary search', homework, exam)..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear query"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showFilters || messageType !== "all" || dateFilter !== "any" || senderFilter
                  ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-[#1E90FF]"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              title="Toggle filters"
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scope Segmented Control */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1 overflow-x-auto text-xs font-semibold bg-white dark:bg-[#0D1524]">
            <button
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                scope === "all"
                  ? "bg-[#1E90FF] text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              All Accessible
            </button>
            <button
              onClick={() => setScope("dms")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                scope === "dms"
                  ? "bg-[#1E90FF] text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Direct Messages
            </button>
            <button
              onClick={() => setScope("circles")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                scope === "circles"
                  ? "bg-[#1E90FF] text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Communities
            </button>
            {(currentConversationId || currentChannelCid || currentChannelId) && (
              <button
                onClick={() => setScope("current")}
                className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                  scope === "current"
                    ? "bg-[#1E90FF] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Current Chat Only
              </button>
            )}
          </div>

          {/* Expanded Filters Drawer */}
          {showFilters && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#090F1C] border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
              {/* Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Type:</span>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                >
                  {TYPE_FILTERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Date:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                >
                  {DATE_FILTERS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sender filter input */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
                <User size={13} className="text-slate-400" />
                <input
                  type="text"
                  value={senderFilter}
                  onChange={(e) => setSenderFilter(e.target.value)}
                  placeholder="Sender name..."
                  className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Reset Filters */}
              {(messageType !== "all" || dateFilter !== "any" || senderFilter) && (
                <button
                  onClick={() => {
                    setMessageType("all");
                    setDateFilter("any");
                    setSenderFilter("");
                  }}
                  className="text-[11px] text-sky-500 hover:underline font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 size={32} className="animate-spin text-[#1E90FF]" />
                <p className="text-xs">Searching messages across Stream channels...</p>
              </div>
            ) : searchError ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle size={32} className="text-rose-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Search Failed
                </p>
                <p className="text-xs text-slate-400 max-w-sm">{searchError}</p>
                <button
                  onClick={() => executeSearch()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E90FF] text-white text-xs font-semibold"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Found {results.length} message{results.length === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono text-[10px]">Stream Search Engine</span>
                </div>

                {results.map((res) => {
                  const dateStr = new Date(res.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div
                      key={res.id}
                      onClick={() => {
                        onSelectMessage(res);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500/70 hover:shadow-xs cursor-pointer transition-all flex flex-col gap-2 group"
                    >
                      {/* Source & Sender Header */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {res.senderAvatar ? (
                            <img
                              src={res.senderAvatar}
                              alt={res.senderName}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {res.senderName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {res.senderName}
                          </span>
                          <span className="text-[11px] text-slate-400">in</span>
                          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 truncate max-w-[180px]">
                            {res.sourceName}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                      </div>

                      {/* Content Snippet */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        <HighlightedText text={res.content} query={query} />
                      </p>

                      {/* Attachments / Badges Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          {res.messageType === "image" && (
                            <span className="inline-flex items-center gap-1 text-sky-500 font-medium">
                              <ImageIcon size={12} />
                              <span>Photo</span>
                            </span>
                          )}
                          {res.messageType === "file" && (
                            <span className="inline-flex items-center gap-1 text-indigo-500 font-medium">
                              <FileText size={12} />
                              <span>Document</span>
                            </span>
                          )}
                          {res.messageType === "voice" && (
                            <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                              <Mic size={12} />
                              <span>Voice message</span>
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                          <span>Jump to message</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Cursor Pagination Button */}
                {nextCursor && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Loading more...</span>
                        </>
                      ) : (
                        <span>Load more results</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : hasSearched ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <Search size={36} className="text-slate-300 dark:text-slate-700 mb-1" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No messages found
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  We couldn't find any messages matching "{query}". Try searching with different keywords or changing your filters.
                </p>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-[#1E90FF] flex items-center justify-center mb-1">
                  <Search size={22} />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Search StudyConnect Messages
                </p>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Search across all direct messages and community channels that you have access to. Filter by message type, date, or sender.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
