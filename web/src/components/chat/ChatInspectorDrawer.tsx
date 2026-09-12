import React, { useState } from "react";
import {
  X,
  MessageSquare,
  Bookmark,
  Users,
  Shield,
  Send,
  Code,
  FileText,
  Pin,
  Award,
  Download,
  ExternalLink,
  Sparkles,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, CodeSnippet } from "../../types/chat";
import { useChatStore } from "../../store/chat.store";
import { MessageItem } from "./MessageItem";
import { socketService } from "../../services/socket.service";

interface ChatInspectorDrawerProps {
  communityId: string;
  channelId?: string;
  currentUserId?: string;
  currentUserName?: string;
  members?: Array<{
    _id: string;
    fullName: string;
    rollNumber?: string;
    department?: string;
    role?: string;
    isOnline?: boolean;
    karma?: number;
  }>;
  className?: string;
}

export const ChatInspectorDrawer: React.FC<ChatInspectorDrawerProps> = ({
  communityId,
  channelId,
  currentUserId,
  currentUserName = "Student",
  members = [],
  className = ""
}) => {
  const {
    inspectorMode,
    setInspectorMode,
    threadParentMessage,
    threadReplies,
    addThreadReply,
    pinnedMessages,
    messages
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<"thread" | "vault" | "roster">(
    inspectorMode === "closed" ? "thread" : (inspectorMode as "thread" | "vault" | "roster")
  );

  const [threadInput, setThreadInput] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // Sync activeTab if inspectorMode changed externally
  React.useEffect(() => {
    if (inspectorMode !== "closed") {
      setActiveTab(inspectorMode);
    }
  }, [inspectorMode]);

  if (inspectorMode === "closed") {
    return null;
  }

  // Handle send reply in thread
  const handleSendThreadReply = () => {
    if (!threadInput.trim() || !threadParentMessage) return;

    const socket = socketService.get();
    const payload = {
      communityId,
      channelId,
      parentMessageId: threadParentMessage._id,
      content: threadInput.trim()
    };

    socket?.emit("chat:sendThreadReply", payload, (res: any) => {
      if (res?.success && res.data) {
        addThreadReply(res.data);
        setThreadInput("");
      }
    });
  };

  // Collect vault items (pinned messages, code snippets, attachments)
  const vaultSnippets = messages.filter((m) => m.codeSnippet);
  const vaultAttachments = messages.flatMap((m) => m.attachments || []);

  const filteredMembers = members.filter((m) =>
    memberSearch
      ? m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.rollNumber?.toLowerCase().includes(memberSearch.toLowerCase())
      : true
  );

  const onlineMembers = filteredMembers.filter((m) => m.isOnline);
  const offlineMembers = filteredMembers.filter((m) => !m.isOnline);

  return (
    <div
      className={`w-80 flex-shrink-0 flex flex-col bg-white/95 dark:bg-[#0B1324]/95 border-l border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 h-full ${className}`}
    >
      {/* ── Top Header & Tab Navigation ── */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#080D1A] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              setActiveTab("thread");
              setInspectorMode("thread");
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "thread"
                ? "bg-[#1E90FF] text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Thread</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("vault");
              setInspectorMode("vault");
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "vault"
                ? "bg-[#1E90FF] text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Vault</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("roster");
              setInspectorMode("roster");
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "roster"
                ? "bg-[#1E90FF] text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster</span>
          </button>
        </div>

        <button
          onClick={() => setInspectorMode("closed")}
          className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] rounded-lg transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {/* ── TAB 1: THREAD DISCUSSION ── */}
        {activeTab === "thread" && (
          <div className="flex flex-col h-full">
            {threadParentMessage ? (
              <div className="flex flex-col flex-1">
                {/* Parent Message Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 mb-3 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {threadParentMessage.senderName || threadParentMessage.senderId?.fullName}
                    </span>
                    <span className="font-mono text-[10px]">Root Question</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {threadParentMessage.content}
                  </p>
                  {threadParentMessage.codeSnippet && (
                    <div className="mt-2 p-2 bg-slate-900 dark:bg-[#050811] rounded-lg text-[10px] font-mono text-cyan-300 overflow-x-auto">
                      {threadParentMessage.codeSnippet.code}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 mb-2">
                  <MessageSquare className="w-3 h-3 text-[#1E90FF]" />
                  <span>Discussion Stream ({threadReplies.length})</span>
                </div>

                {/* Reply Stream */}
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {threadReplies.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">
                      No replies yet in this thread. Start the conversation below!
                    </div>
                  ) : (
                    threadReplies.map((reply) => (
                      <div
                        key={reply._id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1A30]/60 border border-slate-200 dark:border-slate-800 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            {reply.senderName || reply.senderId?.fullName || "Student"}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {new Date(reply.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{reply.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Thread Input Bar */}
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={threadInput}
                    onChange={(e) => setThreadInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendThreadReply()}
                    placeholder="Reply in thread..."
                    className="flex-1 bg-slate-100/80 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
                  />
                  <button
                    onClick={handleSendThreadReply}
                    disabled={!threadInput.trim()}
                    className="p-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] disabled:opacity-50 text-white transition-all shadow-md shadow-[#1E90FF]/25 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
                <span>Select a message and click "Reply in Thread" to view discussions.</span>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SHARED VAULT ── */}
        {activeTab === "vault" && (
          <div className="space-y-4">
            {/* Pinned Messages Section */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">
                <Pin className="w-3.5 h-3.5" />
                <span>Pinned Resources ({pinnedMessages.length})</span>
              </div>

              {pinnedMessages.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 italic text-center">
                  No pinned messages in this circle
                </div>
              ) : (
                <div className="space-y-2">
                  {pinnedMessages.map((m) => (
                    <div
                      key={m._id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-colors shadow-xs"
                    >
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                        {m.senderName || m.senderId?.fullName}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-3">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Code Snippets Vault */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400 mb-2">
                <Code className="w-3.5 h-3.5" />
                <span>Code Library ({vaultSnippets.length})</span>
              </div>

              {vaultSnippets.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 italic text-center">
                  No code snippets shared yet
                </div>
              ) : (
                <div className="space-y-2">
                  {vaultSnippets.map((m) => (
                    <div
                      key={m._id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 font-mono text-[11px] shadow-xs"
                    >
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold text-slate-900 dark:text-slate-200">
                          {m.codeSnippet?.title || `${m.codeSnippet?.language} Snippet`}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-[#162544] text-cyan-600 dark:text-cyan-300">
                          {m.codeSnippet?.language}
                        </span>
                      </div>
                      <pre className="p-2 bg-slate-900 dark:bg-[#050811] rounded text-slate-200 text-[10px] overflow-x-auto max-h-20">
                        {m.codeSnippet?.code}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Files & PDFs */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E90FF] mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Shared Files ({vaultAttachments.length})</span>
              </div>

              {vaultAttachments.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 italic text-center">
                  No attachments shared in this channel
                </div>
              ) : (
                <div className="space-y-1.5">
                  {vaultAttachments.map((f, idx) => (
                    <a
                      key={idx}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 hover:border-[#1E90FF]/50 text-xs transition-colors group shadow-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#1E90FF]" />
                        <span className="truncate text-slate-700 dark:text-slate-300 group-hover:text-[#1E90FF]">
                          {f.originalName}
                        </span>
                      </div>
                      <Download className="w-3 h-3 text-slate-400 group-hover:text-[#1E90FF]" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: ROSTER & PRESENCE ── */}
        {activeTab === "roster" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search scholars..."
                className="w-full bg-slate-100/80 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E90FF]"
              />
            </div>

            {/* Online Members */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-1.5">
                Online ({onlineMembers.length})
              </div>
              <div className="space-y-1">
                {onlineMembers.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0F1A30] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-6 h-6 rounded-full bg-[#1E90FF] flex items-center justify-center text-[10px] font-bold text-white">
                        {m.fullName.charAt(0).toUpperCase()}
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#0B132B]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                          {m.fullName}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{m.rollNumber}</span>
                      </div>
                    </div>

                    {m.karma && m.karma > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                        <Award className="w-2.5 h-2.5" />
                        {m.karma}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Offline ({offlineMembers.length})
                </div>
                <div className="space-y-1">
                  {offlineMembers.map((m) => (
                    <div
                      key={m._id}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0F1A30] opacity-60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {m.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{m.rollNumber}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
