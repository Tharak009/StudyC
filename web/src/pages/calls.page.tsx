import { useDeferredValue, useState } from "react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, RefreshCw, Search, Video, Users } from "lucide-react";
import { callHistoryApi } from "../api/call-history.api";
import { callSignalingService } from "../services/call-signaling.service";
import { socketService } from "../services/socket.service";
import type { CallHistoryItem } from "../types/call.types";

type CallFilter = "all" | "missed" | "voice" | "video";

function callTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toDateString() === new Date().toDateString() ? time : `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function directionIcon(item: CallHistoryItem) {
  if (item.status === "missed" || item.status === "declined") return PhoneMissed;
  return item.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
}

export function CallsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CallFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const historyQuery = useQuery({
    queryKey: ["call-history", filter, page, deferredSearch],
    queryFn: () => callHistoryApi.getHistory({
      page,
      limit: 20,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(filter === "missed" ? { status: "missed" } : {}),
      ...(filter === "voice" || filter === "video" ? { type: filter } : {})
    })
  });
  const items = historyQuery.data?.items || [];
  const selected = items.find((item) => item._id === selectedId) || null;

  useEffect(() => {
    const socket = socketService.get() || socketService.connect();
    if (!socket) return;

    const refreshMissedCalls = () => {
      void queryClient.invalidateQueries({ queryKey: ["call-history"] });
    };
    socket.on("call:missed", refreshMissedCalls);
    return () => {
      socket.off("call:missed", refreshMissedCalls);
    };
  }, [queryClient]);

  const redial = (item: CallHistoryItem) => {
    if (item.mode !== "direct" || !item.peer.userId) return;
    void callSignalingService.initiateCall({
      targetUserId: item.peer.userId,
      targetUserName: item.peer.name,
      targetUserAvatar: item.peer.avatar,
      channelId: item.channelId || undefined,
      isVideo: item.type === "video"
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-white dark:bg-[#080D1A]">
      <aside className={`${mobileDetailsOpen ? "hidden" : "flex"} h-full w-full min-w-0 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B132B] sm:flex sm:w-[360px] lg:w-[390px]`}>
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-white/10">
          <h1 className="text-lg font-bold">Calls</h1>
          <button type="button" onClick={() => void historyQuery.refetch()} aria-label="Refresh call history" title="Refresh" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"><RefreshCw size={17} /></button>
        </header>
        <div className="shrink-0 space-y-3 border-b border-slate-100 p-3 dark:border-white/5">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setSelectedId(null); }} placeholder="Search call history" aria-label="Search call history" className="w-full rounded-xl bg-slate-100 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#1E90FF]/30 dark:bg-[#080D1A]" />
          </label>
          <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist" aria-label="Call history filters">
            {(["all", "missed", "voice", "video"] as const).map((value) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => { setFilter(value); setPage(1); setSelectedId(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === value ? "bg-[#1E90FF]/12 text-[#1E90FF] dark:bg-[#1E90FF]/20" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}>{value}</button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {historyQuery.isLoading ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((key) => <div key={key} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />)}</div> : historyQuery.isError ? (
            <div className="p-6 text-center"><p className="text-sm text-rose-500">Could not load call history.</p><button type="button" onClick={() => void historyQuery.refetch()} className="mt-3 text-sm font-semibold text-[#1E90FF]">Try again</button></div>
          ) : items.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">{deferredSearch ? "No calls match your search." : "Your recent calls will appear here."}</p> : items.map((item) => {
            const Direction = directionIcon(item);
            const isActive = selected?._id === item._id;
            return <div key={item._id} className={`group flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? "bg-[#1E90FF]/8 dark:bg-[#1E90FF]/10" : "hover:bg-slate-50 dark:hover:bg-white/[0.035]"}`}>
              <button type="button" onClick={() => { setSelectedId(item._id); setMobileDetailsOpen(true); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {item.peer.avatar ? <img src={item.peer.avatar} alt="" className="size-11 shrink-0 rounded-full object-cover" /> : <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1E90FF]/10 font-bold text-[#1E90FF]">{item.peer.name.slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.peer.name}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Direction size={13} className={item.status === "missed" ? "text-rose-500" : "text-emerald-500"} />{item.mode === "direct" ? item.direction : `${item.mode} call`} · {item.type}</span></span>
                <time className="self-start whitespace-nowrap pt-1 text-[11px] text-slate-400">{callTime(item.startedAt)}</time>
              </button>
              {item.mode === "direct" && <button type="button" aria-label={`Call ${item.peer.name}`} title="Call back" onClick={() => redial(item)} className="rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-[#1E90FF] group-hover:opacity-100 focus:opacity-100 dark:hover:bg-white/10"><Phone size={16} /></button>}
            </div>;
          })}
        </div>
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>{historyQuery.data ? `${historyQuery.data.total} calls` : ""}</span>
          <div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">Previous</button><span>{historyQuery.data?.page || page} / {historyQuery.data?.pages || 1}</span><button type="button" disabled={page >= (historyQuery.data?.pages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">Next</button></div>
        </footer>
      </aside>
      <main className={`${mobileDetailsOpen ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col items-center justify-center bg-slate-50 px-4 dark:bg-[#080D1A] sm:flex sm:px-8`}>
        {selected ? <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-[#0B132B]">
          <button type="button" onClick={() => setMobileDetailsOpen(false)} aria-label="Back to call history" className="mb-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-slate-500 hover:text-[#1E90FF] sm:hidden"><ArrowLeft size={17} />Call history</button>
          {selected.peer.avatar ? <img src={selected.peer.avatar} alt="" className="mx-auto size-20 rounded-full object-cover" /> : <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#1E90FF]/10 text-2xl font-bold text-[#1E90FF]">{selected.peer.name.slice(0, 1).toUpperCase()}</span>}
          <h2 className="mt-4 text-xl font-bold">{selected.peer.name}</h2>
          <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">{selected.mode} {selected.type} call · {selected.status}</p>
          <p className="mt-2 text-xs text-slate-400">{callTime(selected.startedAt)}{selected.durationSeconds ? ` · ${Math.floor(selected.durationSeconds / 60)}m ${selected.durationSeconds % 60}s` : ""}</p>
          {selected.mode === "group" && selected.communityName && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-500"><Users size={15} />{selected.communityName}</p>}
          {selected.mode === "direct" && <div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => redial(selected)} className="inline-flex items-center gap-2 rounded-xl bg-[#1E90FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#187BCD]">{selected.type === "video" ? <Video size={17} /> : <Phone size={17} />}Call back</button></div>}
        </div> : <div className="max-w-md text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300"><PhoneOutgoing size={25} /></div><h2 className="mt-5 text-2xl font-semibold">Voice and video calling</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your call history and available actions appear here.</p><div className="mt-7 flex justify-center gap-5 text-xs text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1.5"><PhoneIncoming size={14} />Incoming</span><span className="inline-flex items-center gap-1.5"><Video size={14} />Video</span><span className="inline-flex items-center gap-1.5"><PhoneMissed size={14} />Missed</span></div></div>}
      </main>
    </div>
  );
}
