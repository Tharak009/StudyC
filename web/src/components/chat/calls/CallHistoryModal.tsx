import React, { useEffect, useState } from "react";
import {
  X,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Users,
  Clock,
  RefreshCw,
  PhoneCall
} from "lucide-react";
import { callHistoryApi } from "../../../api/call-history.api";
import { callSignalingService } from "../../../services/call-signaling.service";
import type { CallHistoryItem } from "../../../types/call.types";

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s";
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  } catch {
    return isoString;
  }
}

export function CallHistoryModal({ isOpen, onClose }: CallHistoryModalProps) {
  const [items, setItems] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "missed" | "voice" | "video">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async (targetPage = 1, tab = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; limit: number; status?: string; type?: string } = {
        page: targetPage,
        limit: 15
      };

      if (tab === "missed") {
        params.status = "missed";
      } else if (tab === "voice" || tab === "video") {
        params.type = tab;
      }

      const res = await callHistoryApi.getHistory(params);
      setItems(res.items);
      setPage(res.page);
      setTotalPages(res.pages);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to load call history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory(1, activeTab);
    }
  }, [isOpen, activeTab]);

  const handleRedial = (item: CallHistoryItem) => {
    onClose();
    if (item.mode === "direct" && item.peer.userId) {
      callSignalingService.initiateCall({
        targetUserId: item.peer.userId,
        targetUserName: item.peer.name,
        targetUserAvatar: item.peer.avatar,
        channelId: item.channelId || undefined,
        isVideo: item.type === "video"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-history-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200 flex flex-col gap-4 max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 id="call-history-title" className="text-base font-bold text-white">
                Call History
              </h3>
              <p className="text-xs text-slate-400">Review recent voice and video calls</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close call history"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
          {(["all", "missed", "voice", "video"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-750"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto min-h-[320px] flex flex-col gap-2 pr-1">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-sky-400" />
              <span className="text-xs">Loading call records...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-2">
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={() => fetchHistory(page, activeTab)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
              <PhoneCall size={32} className="text-slate-600" />
              <p className="text-xs">No calls recorded in this category.</p>
            </div>
          ) : (
            items.map((item) => {
              const isMissed = item.status === "missed";
              const isDeclined = item.status === "declined";
              const isOutgoing = item.direction === "outgoing";

              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-750/70 transition-colors"
                >
                  {/* Left: Direction + User Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status / Direction Icon */}
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isMissed
                          ? "bg-rose-500/15 text-rose-400"
                          : isDeclined
                          ? "bg-amber-500/15 text-amber-400"
                          : isOutgoing
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-sky-500/15 text-sky-400"
                      }`}
                    >
                      {isMissed ? (
                        <PhoneMissed size={16} />
                      ) : isOutgoing ? (
                        <PhoneOutgoing size={16} />
                      ) : (
                        <PhoneIncoming size={16} />
                      )}
                    </div>

                    {/* Avatar Fallback */}
                    <div className="relative shrink-0">
                      {item.peer.avatar ? (
                        <img
                          src={item.peer.avatar}
                          alt={item.peer.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                          {item.mode === "group" || item.mode === "stage" ? (
                            <Users size={16} />
                          ) : (
                            (item.peer.name || "U").slice(0, 2).toUpperCase()
                          )}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 text-slate-300">
                        {item.type === "video" ? <Video size={10} /> : <Phone size={10} />}
                      </div>
                    </div>

                    {/* Text Metadata */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate max-w-[160px] sm:max-w-[200px]">
                        {item.peer.name}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimestamp(item.startedAt)}
                        </span>
                        <span>•</span>
                        <span
                          className={
                            isMissed
                              ? "text-rose-400 font-medium"
                              : isDeclined
                              ? "text-amber-400"
                              : "text-slate-300"
                          }
                        >
                          {isMissed
                            ? "Missed"
                            : isDeclined
                            ? "Declined"
                            : item.status === "cancelled"
                            ? "Cancelled"
                            : formatDuration(item.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Redial Button */}
                  {item.mode === "direct" && item.peer.userId && (
                    <button
                      type="button"
                      onClick={() => handleRedial(item)}
                      className="p-2 rounded-xl bg-slate-700/70 hover:bg-emerald-600/80 hover:text-white text-slate-300 transition-colors cursor-pointer shrink-0 ml-2"
                      title={`Call back ${item.peer.name}`}
                      aria-label={`Call back ${item.peer.name}`}
                    >
                      {item.type === "video" ? <Video size={14} /> : <Phone size={14} />}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => fetchHistory(page - 1, activeTab)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => fetchHistory(page + 1, activeTab)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
