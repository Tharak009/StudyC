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

  const [classmates, setClassmates] = useState<ClassmateConnection[]>(loadSavedClassmates);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "dept" | "batch" | "pending">("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPeerName, setNewPeerName] = useState("");
  const [newPeerRoll, setNewPeerRoll] = useState("");
  const [newPeerDept, setNewPeerDept] = useState("Computer Science & Engineering");

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

  const handleSendCustomRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeerName.trim()) return;

    const newConnection: ClassmateConnection = {
      id: `u-${Date.now()}`,
      name: newPeerName.trim(),
      roll: newPeerRoll.trim() || "CS24-120",
      dept: newPeerDept.trim() || "Computer Science & Engineering",
      batch: "2026",
      isOnline: true,
      status: "pending_outgoing",
      sharedCircles: 1
    };

    updateAndPersist((prev) => [newConnection, ...prev]);
    addToast(`Connection invitation sent to ${newConnection.name}!`, "success");
    setNewPeerName("");
    setNewPeerRoll("");
    setAddModalOpen(false);
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

              <form onSubmit={handleSendCustomRequest} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Classmate Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={newPeerName}
                    onChange={(e) => setNewPeerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CS24-115"
                      value={newPeerRoll}
                      onChange={(e) => setNewPeerRoll(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Department
                    </label>
                    <select
                      value={newPeerDept}
                      onChange={(e) => setNewPeerDept(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-2 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
                    >
                      <option value="Computer Science & Engineering">CSE</option>
                      <option value="Data Science & AI">Data Science</option>
                      <option value="Information Technology">IT</option>
                      <option value="Electronics & Comm">ECE</option>
                      <option value="Mechanical Engineering">Mech</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPeerName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-[#1E90FF]/25 cursor-pointer transition-all"
                  >
                    <UserPlus size={13} />
                    <span>Send Invitation</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default ConnectionsTab;
