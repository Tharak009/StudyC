import React, { useState, useEffect, useCallback } from "react";
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
  UserMinus,
  RotateCcw,
  Clock,
  ArrowRight,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router";
import { useToastStore } from "../../store/toast.store";
import { useAuthStore } from "../../store/auth.store";
import { usersApi } from "../../api/users.api";
import { friendsApi, type FriendRecord, type FriendRequestsResult } from "../../api/friends.api";
import { directMessagesApi } from "../../api/direct-messages.api";
import type { User as AuthUser } from "../../types/auth";
import { ImageViewerModal } from "../chat/media/ImageViewerModal";

export function ConnectionsTab() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const currentUser = useAuthStore((state) => state.user);

  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [requests, setRequests] = useState<FriendRequestsResult>({ sent: [], received: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"friends" | "received" | "sent">("friends");
  const [search, setSearch] = useState("");
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string; subtitle?: string } | null>(null);

  // Search registered classmates modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch real friends & pending requests from MongoDB Atlas
  const loadFriendshipData = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        friendsApi.getRequests().catch(() => ({ sent: [], received: [] }))
      ]);
      setFriends(friendsData || []);
      setRequests(requestsData || { sent: [], received: [] });
    } catch (err) {
      console.error("Failed to load friendship data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriendshipData();
  }, [loadFriendshipData]);

  // Search registered users from MongoDB Atlas for the Add modal
  useEffect(() => {
    if (!addModalOpen) return;
    let isMounted = true;
    const fetchUsers = async () => {
      setIsSearchingUsers(true);
      try {
        const users = await usersApi.search(modalSearch);
        if (isMounted) {
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

  // Actions
  const handleSendRequest = async (targetUser: AuthUser) => {
    setActionLoadingId(targetUser._id);
    try {
      await friendsApi.sendRequest(targetUser._id);
      addToast(`Friend request sent to ${targetUser.fullName}!`, "success");
      await loadFriendshipData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to send friend request", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (userId: string, userName?: string) => {
    setActionLoadingId(userId);
    try {
      await friendsApi.cancelRequest(userId);
      addToast(`Friend request cancelled${userName ? ` for ${userName}` : ""}`, "info");
      await loadFriendshipData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to cancel request", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (userId: string, userName?: string) => {
    setActionLoadingId(userId);
    try {
      await friendsApi.acceptRequest(userId);
      addToast(`Connected! You and ${userName || "classmate"} are now friends!`, "success");
      await loadFriendshipData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to accept request", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await friendsApi.declineRequest(userId);
      addToast("Friend request declined", "info");
      await loadFriendshipData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to decline request", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from your friends?`)) return;
    setActionLoadingId(userId);
    try {
      await friendsApi.removeFriend(userId);
      addToast(`${userName} removed from friends`, "info");
      await loadFriendshipData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to remove friend", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMessagePeer = async (peerId: string) => {
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Helper to determine friendship status of a user
  const getUserStatus = (userId: string): "friends" | "sent" | "received" | "none" => {
    if (friends.some((f) => f.user?._id === userId)) return "friends";
    if (requests.sent?.some((r) => r.recipient?._id === userId || (r.recipient as any) === userId)) {
      return "sent";
    }
    if (requests.received?.some((r) => r.requester?._id === userId || (r.requester as any) === userId)) {
      return "received";
    }
    return "none";
  };

  // Filter friends based on search input
  const filteredFriends = friends.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const nameMatch = f.user?.fullName?.toLowerCase().includes(q);
    const rollMatch = f.user?.rollNumber?.toLowerCase().includes(q);
    const deptMatch = f.user?.department?.toLowerCase().includes(q);
    return nameMatch || rollMatch || deptMatch;
  });

  const filteredReceived = (requests.received || []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const nameMatch = r.requester?.fullName?.toLowerCase().includes(q);
    const rollMatch = r.requester?.rollNumber?.toLowerCase().includes(q);
    return nameMatch || rollMatch;
  });

  const filteredSent = (requests.sent || []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const nameMatch = r.recipient?.fullName?.toLowerCase().includes(q);
    const rollMatch = r.recipient?.rollNumber?.toLowerCase().includes(q);
    return nameMatch || rollMatch;
  });

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
              placeholder="Search classmates by name, roll, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A30] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shrink-0 shadow-sm shadow-[#1E90FF]/25 cursor-pointer transition-all"
          >
            <UserPlus size={14} />
            <span>Add Friend</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "friends"
                ? "bg-[#1E90FF] text-white shadow-sm shadow-[#1E90FF]/25"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <UserCheck size={13} />
            <span>Friends</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                activeTab === "friends"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("received")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "received"
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock size={13} />
            <span>Received Requests</span>
            {requests.received?.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] tabular-nums font-bold animate-pulse">
                {requests.received.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("sent")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sent"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <RotateCcw size={12} />
            <span>Sent Requests</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                activeTab === "sent"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {requests.sent?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* ── Main Content Display ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400 text-xs">
          <span className="w-5 h-5 rounded-full border-2 border-[#1E90FF] border-t-transparent animate-spin" />
          <span>Synchronizing campus connections with MongoDB Atlas...</span>
        </div>
      ) : activeTab === "friends" ? (
        // ── 1. ACCEPTED FRIENDS ──────────────────────────────────────────
        filteredFriends.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1E90FF]/10 text-[#1E90FF] border border-[#1E90FF]/20 mb-3">
              <Users size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {search ? "No Matching Friends Found" : "No Friends Added Yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
              {search
                ? "Try adjusting your search keywords to find your friends."
                : "Add classmates and campus study partners to collaborate on assignments and chat in real-time."}
            </p>
            {!search && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-xs font-bold text-white shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
              >
                <UserPlus size={14} />
                <span>Search & Add Friends</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.map((f) => {
              const u = f.user;
              if (!u) return null;
              return (
                <motion.div
                  key={f.friendshipId}
                  whileHover={{ y: -3 }}
                  className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3.5 mb-3">
                      <div
                        onClick={() => {
                          if (u.profilePicture) {
                            setViewingPhoto({
                              url: u.profilePicture,
                              name: u.fullName,
                              subtitle: `${u.rollNumber || "CSE"} • ${u.department || "Engineering"}`
                            });
                          }
                        }}
                        className={`h-11 w-11 rounded-2xl bg-[#1E90FF] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm overflow-hidden relative ${
                          u.profilePicture ? "cursor-pointer group/avatar" : ""
                        }`}
                        title={u.profilePicture ? "Click to view profile photo" : undefined}
                      >
                        {u.profilePicture ? (
                          <>
                            <img src={u.profilePicture} alt={u.fullName} className="h-full w-full object-cover transition-transform duration-200 group-hover/avatar:scale-105" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                              <Eye size={16} className="text-white" />
                            </div>
                          </>
                        ) : (
                          getInitials(u.fullName || "Student")
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {u.fullName}
                          </h4>
                          <ShieldCheck size={13} className="text-[#1E90FF] shrink-0" />
                        </div>
                        <p className="text-[10px] tabular-nums text-slate-400 truncate mt-0.5 font-medium">
                          {u.rollNumber || "CSE"} • Year {u.academicYear || 1}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {u.department || "Engineering"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleMessagePeer(u._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-sm shadow-[#1E90FF]/20 cursor-pointer transition-all"
                    >
                      <MessageCircle size={13} />
                      <span>Message</span>
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(u._id, u.fullName)}
                      disabled={actionLoadingId === u._id}
                      title="Remove Friend"
                      className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : activeTab === "received" ? (
        // ── 2. RECEIVED PENDING REQUESTS ──────────────────────────────────
        filteredReceived.length === 0 ? (
          <div className="p-10 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80">
            <Clock size={28} className="mx-auto text-amber-500 mb-2 opacity-80" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Received Requests</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              When other campus scholars send you a friend request, they will appear here for you to accept or decline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReceived.map((req) => {
              const sender = req.requester;
              if (!sender) return null;
              const senderId = sender._id || (sender as any);
              return (
                <motion.div
                  key={req._id}
                  whileHover={{ y: -2 }}
                  className="p-5 rounded-3xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3.5 mb-3">
                    <div
                      onClick={() => {
                        if (sender.profilePicture) {
                          setViewingPhoto({
                            url: sender.profilePicture,
                            name: sender.fullName || "User",
                            subtitle: `${sender.rollNumber || "CSE"} • ${sender.department || "Campus Scholar"}`
                          });
                        }
                      }}
                      className={`h-11 w-11 rounded-2xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm overflow-hidden relative ${
                        sender.profilePicture ? "cursor-pointer group/avatar" : ""
                      }`}
                      title={sender.profilePicture ? "Click to view profile photo" : undefined}
                    >
                      {sender.profilePicture ? (
                        <>
                          <img src={sender.profilePicture} alt={sender.fullName} className="h-full w-full object-cover transition-transform duration-200 group-hover/avatar:scale-105" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </>
                      ) : (
                        getInitials(sender.fullName || "User")
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {sender.fullName}
                        </h4>
                      </div>
                      <p className="text-[10px] tabular-nums text-slate-400 truncate mt-0.5">
                        {sender.rollNumber || "CSE"} • {sender.department || "Campus Scholar"}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Clock size={10} />
                        <span>Incoming Friend Request</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-amber-500/20">
                    <button
                      onClick={() => handleAcceptRequest(senderId, sender.fullName)}
                      disabled={actionLoadingId === senderId}
                      className="flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Check size={13} />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(senderId)}
                      disabled={actionLoadingId === senderId}
                      className="flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <X size={13} />
                      <span>Decline</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        // ── 3. SENT PENDING REQUESTS (WITH REVERT / CANCEL) ────────────────
        filteredSent.length === 0 ? (
          <div className="p-10 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/80">
            <RotateCcw size={28} className="mx-auto text-indigo-500 mb-2 opacity-80" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Sent Requests</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              You haven't sent any friend requests that are pending approval.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSent.map((req) => {
              const target = req.recipient;
              if (!target) return null;
              const targetId = target._id || (target as any);
              return (
                <motion.div
                  key={req._id}
                  whileHover={{ y: -2 }}
                  className="p-5 rounded-3xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3.5 mb-3">
                    <div
                      onClick={() => {
                        if (target.profilePicture) {
                          setViewingPhoto({
                            url: target.profilePicture,
                            name: target.fullName || "User",
                            subtitle: `${target.rollNumber || "CSE"} • ${target.department || "Campus Scholar"}`
                          });
                        }
                      }}
                      className={`h-11 w-11 rounded-2xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm overflow-hidden relative ${
                        target.profilePicture ? "cursor-pointer group/avatar" : ""
                      }`}
                      title={target.profilePicture ? "Click to view profile photo" : undefined}
                    >
                      {target.profilePicture ? (
                        <>
                          <img src={target.profilePicture} alt={target.fullName} className="h-full w-full object-cover transition-transform duration-200 group-hover/avatar:scale-105" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </>
                      ) : (
                        getInitials(target.fullName || "User")
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {target.fullName}
                        </h4>
                      </div>
                      <p className="text-[10px] tabular-nums text-slate-400 truncate mt-0.5">
                        {target.rollNumber || "CSE"} • {target.department || "Campus Scholar"}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                        <Clock size={10} />
                        <span>Awaiting Response</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-500/20">
                    <button
                      onClick={() => handleCancelRequest(targetId, target.fullName)}
                      disabled={actionLoadingId === targetId}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      <span>Revert / Cancel Request</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* ── Add Friends / Search Registered Classmates Modal ──────────── */}
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
                  Search & Add Friends
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Connect with verified students across departments. Send or manage requests in real-time.
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
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-none">
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
                          : "Type a name or roll number above to discover classmates."}
                      </p>
                    </div>
                  ) : (
                    searchResults.map((user) => {
                      const status = getUserStatus(user._id);

                      return (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080D1A]/50 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => {
                                if (user.profilePicture) {
                                  setViewingPhoto({
                                    url: user.profilePicture,
                                    name: user.fullName,
                                    subtitle: `${user.rollNumber || "CSE"} • ${user.department || "Engineering"}`
                                  });
                                }
                              }}
                              className={`h-9 w-9 rounded-xl bg-gradient-to-tr from-[#1E90FF] to-[#187bcd] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden relative ${
                                user.profilePicture ? "cursor-pointer group/avatar" : ""
                              }`}
                              title={user.profilePicture ? "Click to view profile photo" : undefined}
                            >
                              {user.profilePicture ? (
                                <>
                                  <img
                                    src={user.profilePicture}
                                    alt={user.fullName}
                                    className="h-full w-full object-cover rounded-xl transition-transform duration-200 group-hover/avatar:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    <Eye size={14} className="text-white" />
                                  </div>
                                </>
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
                            {status === "friends" ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                  <UserCheck size={12} />
                                  <span>Friends</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFriend(user._id, user.fullName)}
                                  disabled={actionLoadingId === user._id}
                                  title="Remove Friend"
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                  <UserMinus size={13} />
                                </button>
                              </div>
                            ) : status === "sent" ? (
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(user._id, user.fullName)}
                                disabled={actionLoadingId === user._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                <RotateCcw size={11} />
                                <span>Cancel</span>
                              </button>
                            ) : status === "received" ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptRequest(user._id, user.fullName)}
                                  disabled={actionLoadingId === user._id}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeclineRequest(user._id)}
                                  disabled={actionLoadingId === user._id}
                                  className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendRequest(user)}
                                disabled={actionLoadingId === user._id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <UserPlus size={12} />
                                <span>Add Friend</span>
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

      {viewingPhoto && (
        <ImageViewerModal
          isOpen={!!viewingPhoto}
          images={[
            {
              url: viewingPhoto.url,
              originalName: `${viewingPhoto.name}'s Profile Photo`,
              caption: `${viewingPhoto.name} ${viewingPhoto.subtitle ? `(${viewingPhoto.subtitle})` : ""}`
            }
          ]}
          onClose={() => setViewingPhoto(null)}
        />
      )}
    </div>
  );
}

export default ConnectionsTab;
