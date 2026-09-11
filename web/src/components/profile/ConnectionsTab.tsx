import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  MessageCircle,
  UserPlus,
  Check,
  X,
  UserCheck,
  ShieldCheck,
  MoreHorizontal
} from "lucide-react";
import { useNavigate } from "react-router";
import { useToastStore } from "../../store/toast.store";
import { useAuthStore } from "../../store/auth.store";
import { usersApi } from "../../api/users.api";
import type { User as AuthUser } from "../../types/auth";

export interface ClassmateConnection {
  id: string;
  name: string;
  roll: string;
  dept: string;
  batch: string;
  isOnline: boolean;
  status: "connected" | "pending_incoming" | "pending_outgoing" | "none";
  sharedCircles: number;
}

const MOCK_SEED_IDS = new Set([
  "u-meera",
  "u-rohan",
  "u-ananya",
  "u-devansh",
  "u-priya",
  "u-kabir"
]);

function loadSavedClassmates(): ClassmateConnection[] {
  try {
    const raw = localStorage.getItem("studyconnect_peer_directory");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const real = parsed.filter(
          (p: any) =>
            p &&
            !MOCK_SEED_IDS.has(p.id) &&
            !p.name?.includes("Meera Patel") &&
            !p.name?.includes("Rohan Verma")
        );
        return real.map((p: any) => ({
          id: p.id,
          name: p.name,
          roll: p.roll || "CS24-100",
          dept: p.dept || "Computer Science & Engineering",
          batch: p.batch || "2026",
          isOnline: p.isOnline ?? true,
          status: p.status || "none",
          sharedCircles: p.sharedCircles || 1
        }));
      }
    }
  } catch {}
  return [];
}

export function ConnectionsTab() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const currentUser = useAuthStore((state) => state.user);
  const [classmates, setClassmates] = useState<ClassmateConnection[]>(loadSavedClassmates);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "dept" | "batch" | "pending">("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Search real registered users from MongoDB Atlas
  React.useEffect(() => {
    if (!addModalOpen) return;
    let isMounted = true;
    const fetchUsers = async () => {
      setIsSearchingUsers(true);
      try {
        const users = await usersApi.search(modalSearch);
        if (isMounted) {
          // Exclude the current logged-in user
          setSearchResults((users || []).filter((u) => u._id !== currentUser?._id));
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        if (isMounted) setIsSearchingUsers(false);
      }
    };

    const timer = setTimeout(fetchUsers, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [modalSearch, addModalOpen, currentUser?._id]);

  const pendingCount = classmates.filter(
    (c) => c.status === "pending_incoming" || c.status === "pending_outgoing"
  ).length;

  const filteredList = classmates.filter((c) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match = c.name.toLowerCase().includes(q) || c.roll.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Filter
    if (activeFilter === "dept" && !c.dept.includes("Computer Science")) return false;
    if (activeFilter === "batch" && c.batch !== "2026") return false;
    if (activeFilter === "pending" && c.status !== "pending_incoming" && c.status !== "pending_outgoing") {
      return false;
    }

    return true;
  });

  const updateAndPersist = (updater: (prev: ClassmateConnection[]) => ClassmateConnection[]) => {
    setClassmates((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem("studyconnect_peer_directory", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAccept = (id: string, name: string) => {
    updateAndPersist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "connected" as const } : c))
    );
    addToast(`Connected with ${name}!`, "success");
  };

  const handleDecline = (id: string) => {
    updateAndPersist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "none" as const } : c))
    );
    addToast("Connection request declined", "info");
  };

  const handleConnect = (id: string, name: string) => {
    updateAndPersist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "pending_outgoing" as const } : c))
    );
    addToast(`Connection invitation sent to ${name}`, "info");
  };

  const handleSendMessageToPeer = (peer: ClassmateConnection) => {
    try {
      const raw = localStorage.getItem("studyconnect_dm_conversations");
      let convs = raw ? JSON.parse(raw) : [];
      let targetConv = convs.find((c: any) => c.peer?.id === peer.id || c.peer?.name === peer.name);
      if (!targetConv) {
        targetConv = {
          id: `conv-${peer.id}`,
          peer: {
            id: peer.id,
            name: peer.name,
            roll: peer.roll,
            dept: peer.dept,
            isOnline: peer.isOnline
          },
          lastMessage: {
            text: "Direct connection started from profile",
            senderId: "system",
            time: "Just now",
            isRead: true,
            isDelivered: true
          },
          unreadCount: 0
        };
        convs = [targetConv, ...convs];
        localStorage.setItem("studyconnect_dm_conversations", JSON.stringify(convs));
      }
      navigate(`/direct-messages/${targetConv.id}`);
    } catch {
      navigate("/direct-messages");
    }
  };

  const handleConnectWithRegisteredUser = (targetUser: AuthUser) => {
    const existing = classmates.find((c) => c.id === targetUser._id);
    if (existing) {
      if (existing.status === "connected") {
        addToast(`You are already connected with ${targetUser.fullName}`, "info");
        return;
      }
      if (existing.status === "pending_outgoing") {
        addToast(`Connection invitation already sent to ${targetUser.fullName}`, "info");
        return;
      }
    }

    const newConnection: ClassmateConnection = {
      id: targetUser._id,
      name: targetUser.fullName,
      roll: targetUser.rollNumber || "CSE",
      dept: targetUser.department || "Computer Science",
      batch: "2026",
      isOnline: true,
      status: "pending_outgoing",
      sharedCircles: 1
    };

    // Strict deduplication: remove any existing entry with this ID and add fresh
    updateAndPersist((prev) => [newConnection, ...prev.filter((c) => c.id !== targetUser._id)]);
    addToast(`Connection invitation sent to ${targetUser.fullName}!`, "success");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      
      {/* ── Top Search & Filter Toolbar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search & Send Request Button */}
        <div className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search classmates by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shrink-0 shadow-sm shadow-[#1E90FF]/25 cursor-pointer transition-all"
          >
            <UserPlus size={14} />
            <span>Send Request</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === "all"
                ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All Peers
          </button>
          <button
            onClick={() => setActiveFilter("dept")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === "dept"
                ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Same Dept
          </button>
          <button
            onClick={() => setActiveFilter("batch")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === "batch"
                ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Batch 2026
          </button>
          <button
            onClick={() => setActiveFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "pending"
                ? "bg-amber-500 text-white"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] tabular-nums font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Classmate Cards Grid or Empty State ───────────────────────── */}
      {classmates.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
            <Users size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            No Peer Connections Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Connect with classmates and study partners to collaborate on notes, assignments, and study circles.
          </p>
          <button
            onClick={() => navigate("/direct-messages")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
          >
            <UserPlus size={14} />
            <span>Find Peers in Direct Messages</span>
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-8 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">No peers matched your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((peer) => (
            <motion.div
              key={peer.id}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5 mb-3">
                {/* Avatar with Presence Ring */}
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1E90FF] text-white font-bold text-xs shadow-sm">
                    {getInitials(peer.name)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#0F1A30] ${
                      peer.isOnline ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {peer.name}
                    </h4>
                    <ShieldCheck size={12} className="text-[#1E90FF] shrink-0" />
                  </div>
                  <p className="text-[10px] tabular-nums text-slate-400 truncate mt-0.5 font-medium">
                    {peer.roll} • {peer.batch}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {peer.dept}
                  </p>
                </div>
              </div>

              {/* Mutual Circles & Action Buttons */}
              <div>
                <div className="text-[10px] tabular-nums text-[#1E90FF] pb-3 border-b border-slate-200/70 dark:border-slate-800/60 flex items-center gap-1 font-medium">
                  <Users size={11} />
                  <span>{peer.sharedCircles} shared study circles</span>
                </div>

                <div className="pt-3">
                  {peer.status === "connected" && (
                    <button
                      onClick={() => handleSendMessageToPeer(peer)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
                    >
                      <MessageCircle size={13} />
                      <span>Send Message</span>
                    </button>
                  )}

                  {peer.status === "pending_incoming" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAccept(peer.id, peer.name)}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                      >
                        <Check size={12} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleDecline(peer.id)}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                      >
                        <X size={12} />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}

                  {peer.status === "pending_outgoing" && (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-bold text-center"
                    >
                      Invitation Pending...
                    </button>
                  )}

                  {peer.status === "none" && (
                    <button
                      onClick={() => handleConnect(peer.id, peer.name)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] text-slate-700 dark:text-slate-300 hover:text-[#1E90FF] hover:border-[#1E90FF] text-xs font-bold transition-colors cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Send Connection Request Modal (Clean Backdrop, Zero Blur) ─── */}
      <AnimatePresence>
        {addModalOpen && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setAddModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl text-slate-900 dark:text-slate-100"
            >
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <UserPlus size={18} className="text-[#1E90FF]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Send Campus Connection Request
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Invite a verified student to connect, collaborate on shared study circles, and start direct messaging.
              </p>

              <div className="space-y-4">
                {/* Search Registered Classmates */}
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search registered classmate by name or roll number..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20"
                    autoFocus
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Real User Search Results List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                  {isSearchingUsers ? (
                    <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-[#1E90FF] border-t-transparent animate-spin" />
                      <span>Searching verified campus database...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {modalSearch.trim()
                          ? `No registered classmates found matching "${modalSearch}".`
                          : "Type a name or roll number above to find registered students."}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Only verified registered accounts are eligible for connection requests.
                      </p>
                    </div>
                  ) : (
                    searchResults.map((user) => {
                      const conn = classmates.find((c) => c.id === user._id);
                      const isConnected = conn?.status === "connected";
                      const isPendingOutgoing = conn?.status === "pending_outgoing";

                      return (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#1E90FF] to-[#187bcd] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {user.profilePicture ? (
                                <img
                                  src={user.profilePicture}
                                  alt={user.fullName}
                                  className="h-full w-full object-cover rounded-xl"
                                />
                              ) : (
                                getInitials(user.fullName)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                <span className="truncate">{user.fullName}</span>
                                <ShieldCheck size={13} className="text-[#1E90FF] shrink-0" />
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {user.rollNumber || "CSE"} • {user.department || "Engineering"}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 ml-2">
                            {isConnected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                <UserCheck size={12} />
                                <span>Connected</span>
                              </span>
                            ) : isPendingOutgoing ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                                <Check size={12} />
                                <span>Request Sent</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConnectWithRegisteredUser(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                <UserPlus size={12} />
                                <span>Connect</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default ConnectionsTab;
