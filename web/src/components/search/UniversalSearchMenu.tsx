import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Users,
  Calendar,
  BookOpen,
  User,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router";
import { communitiesApi } from "../../api/communities.api";
import { resourcesApi } from "../../api/resources.api";
import { usersApi } from "../../api/users.api";
import { eventsApi } from "../../api/events.api";
import { directMessagesApi } from "../../api/direct-messages.api";
import { useAuthStore } from "../../store/auth.store";

interface CircleResult {
  id: string;
  name: string;
  category?: string;
  membersCount?: number;
  description?: string;
}

interface EventResult {
  id: string;
  title: string;
  category?: string;
  dateStr?: string;
  timeStr?: string;
  organizer?: string;
  urgency?: string;
}

interface ResourceResult {
  id: string;
  title: string;
  department?: string;
  fileType?: string;
  downloadCount?: number;
}

interface PeerResult {
  _id: string;
  fullName: string;
  rollNumber?: string;
  department?: string;
  profilePicture?: string;
}

export function UniversalSearchMenu() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"all" | "circles" | "events" | "resources" | "peers">("all");
  const [isSearching, setIsSearching] = useState(false);

  const [circles, setCircles] = useState<CircleResult[]>([]);
  const [events, setEvents] = useState<EventResult[]>([]);
  const [resources, setResources] = useState<ResourceResult[]>([]);
  const [peers, setPeers] = useState<PeerResult[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Debounced search across backend & local stores
  useEffect(() => {
    if (!query.trim()) {
      setCircles([]);
      setEvents([]);
      setResources([]);
      setPeers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let isCurrent = true;

    const timer = setTimeout(async () => {
      const q = query.trim();

      try {
        const [circlesRes, resourcesRes, peersRes, eventsRes] = await Promise.allSettled([
          communitiesApi.list({ search: q, limit: 6 }),
          resourcesApi.list({ search: q, limit: 6 }),
          usersApi.search(q),
          eventsApi.list({ search: q, limit: 6 })
        ]);

        let matchedEvents: EventResult[] = [];
        if (eventsRes.status === "fulfilled" && Array.isArray(eventsRes.value)) {
          matchedEvents = eventsRes.value.map((ev) => ({
            id: ev._id,
            title: ev.title,
            category: ev.category,
            dateStr: ev.dateStr,
            timeStr: ev.timeStr,
            organizer: ev.organizer,
            urgency: ev.category === "deadlines" ? "Urgent" : undefined
          }));
        }

        if (!isCurrent) return;

        // Process circles
        let circlesList: CircleResult[] = [];
        if (circlesRes.status === "fulfilled" && circlesRes.value?.items) {
          circlesList = circlesRes.value.items.map((c) => ({
            id: c._id,
            name: c.name,
            category: c.category,
            membersCount: c.memberCount,
            description: c.description
          }));
        }

        // Process resources
        let resourcesList: ResourceResult[] = [];
        if (resourcesRes.status === "fulfilled" && resourcesRes.value?.items) {
          resourcesList = resourcesRes.value.items.map((r) => ({
            id: r._id,
            title: r.title,
            department: r.tags?.[0] || "Academic Vault",
            fileType: r.fileUrl?.split(".").pop() || "pdf",
            downloadCount: r.downloadCount || 0
          }));
        }

        // Process peers
        let peersList: PeerResult[] = [];
        if (peersRes.status === "fulfilled" && Array.isArray(peersRes.value)) {
          peersList = peersRes.value
            .filter((u) => u._id !== currentUser?._id)
            .slice(0, 6)
            .map((u) => ({
              _id: u._id,
              fullName: u.fullName,
              rollNumber: u.rollNumber,
              department: u.department,
              profilePicture: u.profilePicture
            }));
        }

        setCircles(circlesList);
        setEvents(matchedEvents);
        setResources(resourcesList);
        setPeers(peersList);
      } catch (err) {
        console.error("Universal search error:", err);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, currentUser?._id]);

  const totalResults = circles.length + events.length + resources.length + peers.length;

  const handleSelectCircle = (circleId: string) => {
    setIsOpen(false);
    navigate(`/chat?circle=${circleId}`);
  };

  const handleSelectEvent = () => {
    setIsOpen(false);
    navigate("/events");
  };

  const handleSelectResource = () => {
    setIsOpen(false);
    navigate("/resources");
  };

  const handleSelectPeer = async (peerId: string) => {
    setIsOpen(false);
    try {
      const conv = await directMessagesApi.startConversation(peerId);
      if (conv?._id) {
        navigate(`/direct-messages/${conv._id}`);
      } else {
        navigate("/direct-messages");
      }
    } catch {
      navigate("/direct-messages");
    }
  };

  return (
    <div ref={containerRef} className="flex-1 max-w-md relative">
      {/* ── Search Input Field ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          ref={inputRef}
          id="universal-search-input"
          type="text"
          placeholder="Search study circles, campus events, vault notes, peers..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]/80 pl-10 pr-16 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1E90FF] focus:outline-none focus:ring-1 focus:ring-[#1E90FF] transition-all shadow-inner"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
            >
              <X size={12} />
            </button>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 pointer-events-none">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* ── Search Results Dropdown Popover ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 sm:-right-24 top-full mt-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0F1A30]/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden text-slate-900 dark:text-slate-100"
          >
            {/* Filter Category Tabs Header */}
            {query.trim() && (
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-slate-50/50 dark:bg-[#080D1A]/40">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    activeCategory === "all"
                      ? "bg-[#1E90FF] text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All ({totalResults})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("circles")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    activeCategory === "circles"
                      ? "bg-[#1E90FF] text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Circles ({circles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("events")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    activeCategory === "events"
                      ? "bg-[#1E90FF] text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Events ({events.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("resources")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    activeCategory === "resources"
                      ? "bg-[#1E90FF] text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Notes ({resources.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("peers")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    activeCategory === "peers"
                      ? "bg-[#1E90FF] text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Peers ({peers.length})
                </button>
              </div>
            )}

            {/* Results Content Area */}
            <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
              {isSearching ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-[#1E90FF] border-t-transparent animate-spin" />
                  <span>Searching campus study circles, events, and vault...</span>
                </div>
              ) : !query.trim() ? (
                /* ── Quick Discovery Shortcuts when query is empty ── */
                <div className="p-3 space-y-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2">
                    Quick Discovery
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/chat");
                      }}
                      className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-[#1E90FF]/10 hover:border-[#1E90FF]/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-[#1E90FF] font-bold text-xs mb-1">
                        <Users size={14} />
                        <span>Study Circles</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Join active course channels and discussion stages
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/events");
                      }}
                      className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-[#1E90FF]/10 hover:border-[#1E90FF]/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-xs mb-1">
                        <Calendar size={14} />
                        <span>Campus Events</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Track upcoming lab deadlines and hackathons
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/resources");
                      }}
                      className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-[#1E90FF]/10 hover:border-[#1E90FF]/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs mb-1">
                        <BookOpen size={14} />
                        <span>Resource Vault</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Download notes, question banks, and manuals
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate("/direct-messages");
                      }}
                      className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-[#1E90FF]/10 hover:border-[#1E90FF]/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs mb-1">
                        <User size={14} />
                        <span>Direct Messages</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Chat 1-on-1 with verified classmates
                      </p>
                    </button>
                  </div>
                </div>
              ) : totalResults === 0 ? (
                /* ── Zero Results Found ── */
                <div className="py-10 text-center px-4">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Search size={18} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No results found for "{query}"
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                    Try searching for circle names like "Web Dev", events like "Hackathon", or peer names.
                  </p>
                </div>
              ) : (
                /* ── Categorized Results ── */
                <div className="space-y-3 p-1">
                  {/* 1. STUDY CIRCLES */}
                  {(activeCategory === "all" || activeCategory === "circles") && circles.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                        <Users size={12} className="text-[#1E90FF]" />
                        <span>Study Circles ({circles.length})</span>
                      </div>
                      {circles.map((circle) => (
                        <div
                          key={circle.id}
                          onClick={() => handleSelectCircle(circle.id)}
                          className="p-2.5 rounded-2xl hover:bg-[#1E90FF]/10 border border-transparent hover:border-[#1E90FF]/30 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-[#1E90FF]/15 text-[#1E90FF] border border-[#1E90FF]/30 flex items-center justify-center font-bold text-xs shrink-0">
                              📚
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1E90FF] truncate transition-colors">
                                {circle.name}
                              </h5>
                              <p className="text-[10px] text-slate-400 truncate">
                                {circle.category || "General"} • {circle.membersCount || 1} member(s)
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                            Open Circle &rarr;
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. CAMPUS EVENTS */}
                  {(activeCategory === "all" || activeCategory === "events") && events.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                        <Calendar size={12} className="text-amber-500" />
                        <span>Campus Events & Deadlines ({events.length})</span>
                      </div>
                      {events.map((event) => (
                        <div
                          key={event.id}
                          onClick={handleSelectEvent}
                          className="p-2.5 rounded-2xl hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                              <Calendar size={14} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 truncate transition-colors">
                                {event.title}
                              </h5>
                              <p className="text-[10px] text-slate-400 truncate">
                                {event.dateStr || "Upcoming"} • {event.category || "Event"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                            View Event &rarr;
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. RESOURCE VAULT */}
                  {(activeCategory === "all" || activeCategory === "resources") && resources.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                        <BookOpen size={12} className="text-emerald-500" />
                        <span>Resource Vault Notes ({resources.length})</span>
                      </div>
                      {resources.map((res) => (
                        <div
                          key={res.id}
                          onClick={handleSelectResource}
                          className="p-2.5 rounded-2xl hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                              <BookOpen size={14} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 truncate transition-colors">
                                {res.title}
                              </h5>
                              <p className="text-[10px] text-slate-400 truncate">
                                {res.department} • {res.fileType?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                            Open Vault &rarr;
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. CLASSMATES & PEERS */}
                  {(activeCategory === "all" || activeCategory === "peers") && peers.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                        <User size={12} className="text-indigo-500" />
                        <span>Classmates & Peers ({peers.length})</span>
                      </div>
                      {peers.map((peer) => (
                        <div
                          key={peer._id}
                          onClick={() => handleSelectPeer(peer._id)}
                          className="p-2.5 rounded-2xl hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/30 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {peer.profilePicture ? (
                                <img src={peer.profilePicture} alt={peer.fullName} className="h-full w-full object-cover" />
                              ) : (
                                peer.fullName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-500 truncate transition-colors">
                                  {peer.fullName}
                                </h5>
                                <ShieldCheck size={11} className="text-[#1E90FF]" />
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {peer.rollNumber || "CSE"} • {peer.department || "Campus"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                            Message &rarr;
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50/80 dark:bg-[#080D1A]/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px]">Esc</kbd> to close</span>
              <span>Universal Campus Directory</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UniversalSearchMenu;
