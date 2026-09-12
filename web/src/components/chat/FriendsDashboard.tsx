import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  UserPlus,
  Check,
  X,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Trash2,
  UserCheck
} from "lucide-react";
import { friendsApi, type FriendRecord, type FriendRequestsResult } from "../../api/friends.api";
import { usersApi } from "../../api/users.api";
import { useToastStore } from "../../store/toast.store";
import type { User as AuthUser } from "../../types/auth";
import type { StudyCircle } from "./CircleSwitcher";

export type FriendsTab = "online" | "all" | "pending" | "add_friend";

interface FriendsDashboardProps {
  currentUser?: AuthUser | null;
  onStartChat: (peerId: string, customPeer?: { name: string; roll?: string; dept?: string }) => void;
  activeCircles?: StudyCircle[];
  onSelectCircle?: (circle: StudyCircle) => void;
}

export function FriendsDashboard({
  currentUser,
  onStartChat,
  activeCircles = [],
  onSelectCircle
}: FriendsDashboardProps) {
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<FriendsTab>("online");
  const [searchFilter, setSearchFilter] = useState("");

  // Friends & Requests Data
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [requests, setRequests] = useState<FriendRequestsResult>({ sent: [], received: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Add Friend Tab State
  const [addFriendInput, setAddFriendInput] = useState("");
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ── Fetch Friends & Requests ──────────────────────────────────────────────
  const loadFriendsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        friendsApi.getRequests().catch(() => ({ sent: [], received: [] }))
      ]);
      setFriends(friendsData || []);
      setRequests(requestsData || { sent: [], received: [] });
    } catch (err) {
      console.warn("Could not load friends data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriendsData();
  }, [loadFriendsData]);

  // ── Search Campus Directory in Add Friend Tab ─────────────────────────────
  useEffect(() => {
    if (activeTab !== "add_friend" || !addFriendInput.trim()) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const users = await usersApi.search(addFriendInput.trim());
        if (isMounted) {
          setSearchResults((users || []).filter((u) => u._id !== currentUser?._id));
        }
      } catch (err) {
        console.warn("User search error:", err);
      } finally {
        if (isMounted) setIsSearchingUsers(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [addFriendInput, activeTab, currentUser?._id]);

  // ── Friend Actions ─────────────────────────────────────────────────────────
  const handleAcceptRequest = async (userId: string, userName: string) => {
    try {
      setProcessingId(userId);
      await friendsApi.acceptRequest(userId);
      addToast(`Connected with ${userName}!`, "success");
      await loadFriendsData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to accept request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (userId: string) => {
    try {
      setProcessingId(userId);
      await friendsApi.declineRequest(userId);
      addToast("Friend request declined", "info");
      await loadFriendsData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to decline request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = async (userId: string) => {
    try {
      setProcessingId(userId);
      await friendsApi.cancelRequest(userId);
      addToast("Friend request cancelled / reverted", "info");
      await loadFriendsData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to cancel request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendFriendRequest = async (userId: string, userName: string) => {
    try {
      setProcessingId(userId);
      await friendsApi.sendRequest(userId);
      addToast(`Friend request sent to ${userName}!`, "success");
      await loadFriendsData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to send friend request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFriend = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from your friends?`)) return;
    try {
      setProcessingId(userId);
      await friendsApi.removeFriend(userId);
      addToast(`Removed ${userName} from friends`, "info");
      await loadFriendsData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to remove friend", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Derived Counts & Filtered Lists ───────────────────────────────────────
  const pendingCount = (requests.received?.length || 0) + (requests.sent?.length || 0);

  const onlineFriends = friends.filter(
    (f) => (f.user as any).isOnline !== false
  );

  const filteredOnline = onlineFriends.filter((f) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      f.user.fullName?.toLowerCase().includes(q) ||
      f.user.rollNumber?.toLowerCase().includes(q) ||
      f.user.department?.toLowerCase().includes(q)
    );
  });

  const filteredAll = friends.filter((f) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      f.user.fullName?.toLowerCase().includes(q) ||
      f.user.rollNumber?.toLowerCase().includes(q) ||
      f.user.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-50/50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
        {/* ── Top Discord Friends Header & Tab Bar ────────────────────── */}
        <header className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-white/80 dark:bg-[#0B1324]/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            {/* Friends Icon & Title */}
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span>Friends</span>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />

            {/* Discord Style Tab Navigation */}
            <nav className="flex items-center gap-1 text-xs font-semibold">
              {/* Online Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("online")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "online"
                    ? "bg-slate-200/90 dark:bg-[#162544] text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F1A30]"
                }`}
              >
                <span>Online</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                  ({onlineFriends.length})
                </span>
              </button>

              {/* All Friends Tab */}
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "all"
                    ? "bg-slate-200/90 dark:bg-[#162544] text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F1A30]"
                }`}
              >
                <span>All</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                  ({friends.length})
                </span>
              </button>

              {/* Pending Tab with Badge */}
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "pending"
                    ? "bg-slate-200/90 dark:bg-[#162544] text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F1A30]"
                }`}
              >
                <span>Pending</span>
                {pendingCount > 0 && (
                  <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white shadow-xs">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Add Friend Tab (Emerald Highlighted Button) */}
              <button
                type="button"
                onClick={() => setActiveTab("add_friend")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ml-2 cursor-pointer ${
                  activeTab === "add_friend"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Friend</span>
              </button>
            </nav>
          </div>
        </header>

        {/* ── Tab Content Container ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {/* ── TAB 1: ONLINE FRIENDS ─────────────────────────────────── */}
          {activeTab === "online" && (
            <div className="max-w-3xl space-y-4">
              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search online friends..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-xs"
                />
              </div>

              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                Online — {filteredOnline.length}
              </div>

              {filteredOnline.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    No friends are online right now
                  </p>
                  <button
                    onClick={() => setActiveTab("add_friend")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Add Campus Friends
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredOnline.map((friend) => {
                    const u = friend.user;
                    const initial = (u.fullName || "S").charAt(0).toUpperCase();

                    return (
                      <div
                        key={friend.friendshipId || u._id}
                        className="group flex items-center justify-between p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#0B1324] hover:border-[#1E90FF]/40 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            {u.profilePicture ? (
                              <img
                                src={u.profilePicture}
                                alt={u.fullName}
                                className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                {initial}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0B1324]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {u.fullName}
                              </span>
                              {u.role === "ADMIN" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1E90FF]/15 text-[#1E90FF] font-bold border border-[#1E90FF]/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {u.rollNumber} • {u.department || "Campus Scholar"}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onStartChat(u._id, {
                                name: u.fullName,
                                roll: u.rollNumber,
                                dept: u.department
                              })
                            }
                            title="Send Direct Message"
                            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#162544] hover:bg-[#1E90FF] text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: ALL FRIENDS ───────────────────────────────────── */}
          {activeTab === "all" && (
            <div className="max-w-3xl space-y-4">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search all friends..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF] shadow-xs"
                />
              </div>

              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                All Friends — {filteredAll.length}
              </div>

              {filteredAll.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {searchFilter ? "No friends match your search" : "You haven't added any friends yet"}
                  </p>
                  <button
                    onClick={() => setActiveTab("add_friend")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Find Students
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAll.map((friend) => {
                    const u = friend.user;
                    const initial = (u.fullName || "S").charAt(0).toUpperCase();

                    return (
                      <div
                        key={friend.friendshipId || u._id}
                        className="group flex items-center justify-between p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#0B1324] hover:border-[#1E90FF]/40 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            {u.profilePicture ? (
                              <img
                                src={u.profilePicture}
                                alt={u.fullName}
                                className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                {initial}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0B1324]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {u.fullName}
                              </span>
                              {u.role === "ADMIN" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1E90FF]/15 text-[#1E90FF] font-bold border border-[#1E90FF]/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {u.rollNumber} • {u.department || "Student"}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onStartChat(u._id, {
                                name: u.fullName,
                                roll: u.rollNumber,
                                dept: u.department
                              })
                            }
                            title="Start Direct Message"
                            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#162544] hover:bg-[#1E90FF] text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={processingId === u._id}
                            onClick={() => handleRemoveFriend(u._id, u.fullName)}
                            title="Remove Friend"
                            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#162544] hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: PENDING REQUESTS (INCOMING & OUTGOING) ─────────── */}
          {activeTab === "pending" && (
            <div className="max-w-3xl space-y-6">
              {/* Received Requests */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Received Requests — {requests.received?.length || 0}
                </div>

                {!requests.received || requests.received.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No incoming friend requests.</p>
                ) : (
                  <div className="space-y-2">
                    {requests.received.map((req) => {
                      const u = req.requester;
                      const initial = (u.fullName || "S").charAt(0).toUpperCase();

                      return (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                {u.fullName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                {u.rollNumber} • {u.department || "Campus Student"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Accept Button */}
                            <button
                              type="button"
                              disabled={processingId === u._id}
                              onClick={() => handleAcceptRequest(u._id, u.fullName)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>

                            {/* Decline Button */}
                            <button
                              type="button"
                              disabled={processingId === u._id}
                              onClick={() => handleDeclineRequest(u._id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#162544] hover:bg-rose-600 text-slate-600 dark:text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sent Requests (with Cancel / Revert) */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Sent Requests — {requests.sent?.length || 0}
                </div>

                {!requests.sent || requests.sent.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No outgoing requests waiting.</p>
                ) : (
                  <div className="space-y-2">
                    {requests.sent.map((req) => {
                      const u = req.recipient;
                      const initial = (u.fullName || "S").charAt(0).toUpperCase();

                      return (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                {u.fullName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                {u.rollNumber} • {u.department || "Peer"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Cancel / Revert Request Button */}
                            <button
                              type="button"
                              disabled={processingId === u._id}
                              onClick={() => handleCancelRequest(u._id)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel Request</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: ADD FRIEND ────────────────────────────────────── */}
          {activeTab === "add_friend" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
                  ADD FRIEND
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can search campus peers by their full name, student email, or university roll number.
                </p>
              </div>

              {/* Search input with button */}
              <div className="relative flex items-center bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 focus-within:border-emerald-500 transition-colors shadow-xs">
                <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma, CS21001, or name@university.edu"
                  value={addFriendInput}
                  onChange={(e) => setAddFriendInput(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
                {isSearchingUsers && (
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-spin mr-3 shrink-0" />
                )}
              </div>

              {/* Search Results */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Directory Results
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-white/50 dark:bg-[#0B1324]/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                    {addFriendInput.trim()
                      ? "No students found matching this search."
                      : "Type a classmate's name or roll number above to send a request."}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => {
                      const isFriend = friends.some((f) => f.user._id === user._id);
                      const isSent = requests.sent?.some((r) => r.recipient._id === user._id);
                      const isReceived = requests.received?.some((r) => r.requester._id === user._id);
                      const initial = (user.fullName || "S").charAt(0).toUpperCase();

                      return (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                {user.fullName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                {user.rollNumber} • {user.department || "Student"}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isFriend ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Friends</span>
                              </span>
                            ) : isSent ? (
                              <button
                                type="button"
                                disabled={processingId === user._id}
                                onClick={() => handleCancelRequest(user._id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel Request</span>
                              </button>
                            ) : isReceived ? (
                              <button
                                type="button"
                                disabled={processingId === user._id}
                                onClick={() => handleAcceptRequest(user._id, user.fullName)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept Request</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={processingId === user._id}
                                onClick={() => handleSendFriendRequest(user._id, user.fullName)}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Send Request</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Discord Right Panel: "Active Now" ─────────────────────────── */}
      <aside className="w-80 h-full shrink-0 p-5 bg-slate-100/50 dark:bg-[#0B1324]/40 border-l border-slate-200/80 dark:border-slate-800/80 overflow-y-auto no-scrollbar hidden xl:flex flex-col space-y-5">
        <div>
          <h4 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-3">
            Active Now
          </h4>

          {/* Live Study Stages or Peer Activity */}
          <div className="space-y-3">
            {activeCircles.slice(0, 3).map((circle) => (
              <div
                key={circle.id}
                onClick={() => onSelectCircle && onSelectCircle(circle)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#0B1324] border border-slate-200/80 dark:border-slate-800/80 hover:border-[#1E90FF]/40 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-xs">
                    {circle.emoji}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate group-hover:text-[#1E90FF] transition-colors">
                      {circle.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {circle.dept} • {circle.memberCount} Scholars
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    Drop-in Study Stage
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">Join Stage</span>
                </div>
              </div>
            ))}

            {/* Quick study encouragement box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E90FF]/10 to-indigo-900/10 border border-[#1E90FF]/25 text-slate-700 dark:text-gray-300 shadow-xs">
              <div className="flex items-center gap-2 text-[#1E90FF] font-bold text-xs mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Academic Focus</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect with course mates to initiate 25-minute Pomodoro sprints and share synchronized code reviews.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default FriendsDashboard;
