import React, { useState, useMemo } from "react";
import {
  Hash,
  Volume2,
  Bell,
  Shield,
  Coffee,
  Plus,
  Search,
  Users,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Radio,
  Lock,
  Compass
} from "lucide-react";
import type { Channel } from "../../types/chat";
import { useChatStore } from "../../store/chat.store";
import { socketService } from "../../services/socket.service";

interface CircleSidebarProps {
  community: {
    _id: string;
    name: string;
    description?: string;
    bannerImage?: string;
    memberCount?: number;
    owner?: string | { _id: string };
  };
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel?: () => void;
  currentUserId?: string;
  className?: string;
}

export const CircleSidebar: React.FC<CircleSidebarProps> = ({
  community,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  currentUserId,
  className = ""
}) => {
  const { activeVoiceStage, setActiveVoiceStage } = useChatStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    announcements: false,
    focus: false,
    watercooler: false,
    stages: false
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // 4-Tier Categorization
  const categorizedChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = channels.filter((c) =>
      query ? c.name.toLowerCase().includes(query) || c.topic?.toLowerCase().includes(query) : true
    );

    const announcements: Channel[] = [];
    const focus: Channel[] = [];
    const watercooler: Channel[] = [];
    const stages: Channel[] = [];

    filtered.forEach((ch) => {
      if (ch.type === "voice" || ch.category === "stages") {
        stages.push(ch);
      } else if (ch.type === "announcement" || ch.category === "announcements") {
        announcements.push(ch);
      } else if (
        ch.category === "watercooler" ||
        ch.name.toLowerCase().includes("lounge") ||
        ch.name.toLowerCase().includes("watercooler") ||
        ch.name.toLowerCase().includes("random")
      ) {
        watercooler.push(ch);
      } else {
        // Default to Academic Focus Rooms
        focus.push(ch);
      }
    });

    return { announcements, focus, watercooler, stages };
  }, [channels, searchQuery]);

  const handleJoinVoiceStage = (channel: Channel) => {
    const stageId = channel._id || channel.name;
    const socket = socketService.get();

    socket?.emit(
      "voice:joinStage",
      { stageId, communityId: community._id },
      (res: any) => {
        if (res?.success) {
          setActiveVoiceStage({
            stageId,
            channelName: channel.name,
            isConnected: true,
            isMuted: false,
            isSpeaking: false,
            isScreenSharing: false,
            peers: res.participants || []
          });
        }
      }
    );
  };

  return (
    <div
      className={`w-72 flex-shrink-0 flex flex-col bg-[#0B132B] border-r border-[#162544] h-full select-none ${className}`}
    >
      {/* ── Circle Header & Banner ── */}
      <div className="p-3 border-b border-[#162544] relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/20">
              {community.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-[140px]">
                {community.name}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>{community.memberCount || 1} Scholars</span>
              </div>
            </div>
          </div>

          {onCreateChannel && (
            <button
              onClick={onCreateChannel}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#162544] transition-colors"
              title="Create Study Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Search Jump Bar (Cmd+K) */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Jump to channel (Cmd+K)..."
            className="w-full bg-[#080D1A] border border-[#162544] rounded-lg pl-8 pr-3 py-1 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ── 4-Tier Categorized Channel List ── */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {/* Tier 1: Announcements & Syllabus */}
        {categorizedChannels.announcements.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory("announcements")}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-amber-400" />
                Syllabus & Notices
              </span>
              {collapsedCategories.announcements ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {!collapsedCategories.announcements && (
              <div className="mt-1 space-y-0.5">
                {categorizedChannels.announcements.map((ch) => {
                  const isSelected = activeChannelId === (ch._id || ch.name);
                  return (
                    <button
                      key={ch._id || ch.name}
                      onClick={() => onSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold"
                          : "text-gray-400 hover:text-gray-200 hover:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tier 2: Academic Focus Rooms (Strict Study Mode) */}
        <div>
          <button
            onClick={() => toggleCategory("focus")}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-400" />
              Academic Focus Rooms
            </span>
            {collapsedCategories.focus ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {!collapsedCategories.focus && (
            <div className="mt-1 space-y-0.5">
              {categorizedChannels.focus.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-gray-500 italic">
                  No focus channels found
                </div>
              ) : (
                categorizedChannels.focus.map((ch) => {
                  const isSelected = activeChannelId === (ch._id || ch.name);
                  return (
                    <button
                      key={ch._id || ch.name}
                      onClick={() => onSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                        isSelected
                          ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/40"
                          : "text-gray-300 hover:text-white hover:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Hash
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                          }`}
                        />
                        <span className="truncate">{ch.name}</span>
                      </div>

                      {/* Strict Study Mode Shield Indicator */}
                      {ch.isStrictStudyMode !== false && (
                        <div
                          title="Strict Study Mode: Off-topic messages are automatically filtered."
                          className={`p-0.5 rounded ${
                            isSelected ? "text-blue-200" : "text-emerald-400/80 group-hover:text-emerald-300"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Tier 3: Campus Watercooler */}
        {categorizedChannels.watercooler.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory("watercooler")}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Coffee className="w-3 h-3 text-amber-500" />
                Campus Watercooler
              </span>
              {collapsedCategories.watercooler ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {!collapsedCategories.watercooler && (
              <div className="mt-1 space-y-0.5">
                {categorizedChannels.watercooler.map((ch) => {
                  const isSelected = activeChannelId === (ch._id || ch.name);
                  return (
                    <button
                      key={ch._id || ch.name}
                      onClick={() => onSelectChannel(ch)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                          : "text-gray-400 hover:text-gray-200 hover:bg-[#0F1A30]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Coffee className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tier 4: Drop-in Study Stages (Audio / Screenshare) */}
        <div>
          <button
            onClick={() => toggleCategory("stages")}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              Drop-in Study Stages
            </span>
            {collapsedCategories.stages ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {!collapsedCategories.stages && (
            <div className="mt-1 space-y-1">
              {categorizedChannels.stages.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-gray-500 italic">
                  No active voice stages
                </div>
              ) : (
                categorizedChannels.stages.map((ch) => {
                  const stageId = ch._id || ch.name;
                  const isStageActive = activeVoiceStage?.stageId === stageId;
                  return (
                    <div
                      key={stageId}
                      className={`p-2 rounded-xl border transition-all ${
                        isStageActive
                          ? "bg-cyan-950/40 border-cyan-500/40 shadow-md shadow-cyan-950/50"
                          : "bg-[#0F1A30]/60 border-[#162544] hover:border-cyan-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isStageActive
                                ? "bg-cyan-500/20 text-cyan-300"
                                : "bg-[#162544] text-gray-400"
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                              {ch.name}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {ch.topic || "Drop-in Audio Stage"}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinVoiceStage(ch)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                            isStageActive
                              ? "bg-cyan-500 text-black shadow-sm"
                              : "bg-[#162544] hover:bg-cyan-600 hover:text-white text-cyan-300"
                          }`}
                        >
                          {isStageActive ? "Joined" : "Connect"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Circle Status Footer ── */}
      <div className="p-3 border-t border-[#162544] bg-[#080D1A]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-semibold text-gray-300">Circle Active</span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">Cobalt OS v2.0</span>
      </div>
    </div>
  );
};
