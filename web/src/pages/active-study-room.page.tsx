import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Hand,
  Smile,
  Settings,
  LogOut,
  Copy,
  Lock,
  Users,
  Clock,
  Signal,
  Wifi,
  WifiOff,
  MessageSquare,
  FileText,
} from "lucide-react";
import { ActiveStudyRoomSidebar, type SidebarTab } from "../components/active-study-room-sidebar";

type RoomState = "loading" | "empty" | "active";
type ParticipantCount = 1 | 2 | 4 | 6 | 9 | 16;

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isSpeaking: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  hasRaisedHand: boolean;
  reaction?: string;
  isScreenSharing: boolean;
  networkStrength: "good" | "fair" | "poor";
  joinTime: string;
  isOnline: boolean;
}

const MOCK_PARTICIPANTS: Participant[] = [
  {
    id: "1",
    name: "Alex Johnson",
    isHost: true,
    isSpeaking: true,
    isMicOn: true,
    isCameraOn: true,
    hasRaisedHand: false,
    reaction: undefined,
    isScreenSharing: false,
    networkStrength: "good",
    joinTime: "2h ago",
    isOnline: true,
  },
  {
    id: "2",
    name: "Sarah Chen",
    isHost: false,
    isSpeaking: false,
    isMicOn: true,
    isCameraOn: true,
    hasRaisedHand: false,
    reaction: "👋",
    isScreenSharing: false,
    networkStrength: "good",
    joinTime: "1h 50m ago",
    isOnline: true,
  },
  {
    id: "3",
    name: "Marcus Rodriguez",
    isHost: false,
    isSpeaking: false,
    isMicOn: false,
    isCameraOn: true,
    hasRaisedHand: true,
    reaction: undefined,
    isScreenSharing: false,
    networkStrength: "fair",
    joinTime: "1h 45m ago",
    isOnline: true,
  },
  {
    id: "4",
    name: "Emma Williams",
    isHost: false,
    isSpeaking: false,
    isMicOn: true,
    isCameraOn: true,
    hasRaisedHand: false,
    reaction: undefined,
    isScreenSharing: false,
    networkStrength: "good",
    joinTime: "5m ago",
    isOnline: true,
  },
  {
    id: "5",
    name: "David Kim",
    isHost: false,
    isSpeaking: false,
    isMicOn: true,
    isCameraOn: false,
    hasRaisedHand: false,
    reaction: undefined,
    isScreenSharing: false,
    networkStrength: "fair",
    joinTime: "2m ago",
    isOnline: true,
  },
  {
    id: "6",
    name: "Olivia Garcia",
    isHost: false,
    isSpeaking: false,
    isMicOn: true,
    isCameraOn: true,
    hasRaisedHand: false,
    reaction: undefined,
    isScreenSharing: false,
    networkStrength: "good",
    joinTime: "Just now",
    isOnline: true,
  },
];

function ParticipantTile({ participant, isSpeaking }: { participant: Participant; isSpeaking: boolean }) {
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        isSpeaking
          ? "border-signal-500/60 bg-gradient-to-br from-signal-500/10 via-white to-white dark:via-ink-950 dark:to-ink-950 shadow-lg ring-2 ring-signal-500/20"
          : "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white dark:border-white/10 dark:from-white/[0.02] dark:via-white/[0.01] dark:to-ink-950 shadow-md"
      }`}
    >
      {/* Premium camera-off background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/20 to-slate-900/30" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 rounded-2xl backdrop-blur-[2px]" />

      {/* Speaking indicator - animated glow */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-2xl">
          <div className="absolute inset-0 rounded-2xl border-2 border-signal-500/40 animate-pulse shadow-lg shadow-signal-500/20" />
        </div>
      )}

      {/* Avatar and name */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-2xl font-bold text-white shadow-xl">
          {participant.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="text-center px-3">
          <p className="text-sm font-semibold text-slate-950 dark:text-white leading-tight">{participant.name}</p>
          {participant.isHost && (
            <span className="inline-block text-xs font-semibold text-signal-500 dark:text-signal-300 mt-1">Host</span>
          )}
        </div>
      </div>

      {/* Reaction emoji floating */}
      {participant.reaction && (
        <div className="absolute right-2 top-2 z-20 animate-bounce text-2xl">{participant.reaction}</div>
      )}

      {/* Status indicators */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
        {/* Mic status */}
        <div
          className={`flex size-6 items-center justify-center rounded-full ${
            participant.isMicOn ? "bg-green-500/20" : "bg-red-500/20"
          }`}
          title={participant.isMicOn ? "Microphone on" : "Microphone off"}
        >
          {participant.isMicOn ? (
            <Mic className="size-3 text-green-500" />
          ) : (
            <MicOff className="size-3 text-red-500" />
          )}
        </div>

        {/* Camera status */}
        <div
          className={`flex size-6 items-center justify-center rounded-full ${
            participant.isCameraOn ? "bg-green-500/20" : "bg-red-500/20"
          }`}
          title={participant.isCameraOn ? "Camera on" : "Camera off"}
        >
          {participant.isCameraOn ? (
            <div className="size-2 rounded-full bg-green-500" />
          ) : (
            <div className="size-2 rounded-full bg-red-500" />
          )}
        </div>

        {/* Network indicator */}
        <div
          className={`flex size-6 items-center justify-center rounded-full ${
            participant.networkStrength === "good"
              ? "bg-green-500/20"
              : participant.networkStrength === "fair"
                ? "bg-yellow-500/20"
                : "bg-red-500/20"
          }`}
          title={`Network: ${participant.networkStrength}`}
        >
          {participant.networkStrength === "good" ? (
            <Wifi className="size-3 text-green-500" />
          ) : participant.networkStrength === "fair" ? (
            <Wifi className="size-3 text-yellow-500" />
          ) : (
            <WifiOff className="size-3 text-red-500" />
          )}
        </div>
      </div>

      {/* Raised hand indicator */}
      {participant.hasRaisedHand && (
        <div className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full bg-yellow-500/20">
          <Hand className="size-4 text-yellow-500" />
        </div>
      )}

      {/* Screen share badge */}
      {participant.isScreenSharing && (
        <div className="absolute right-3 bottom-3 z-20 inline-flex items-center gap-1 rounded-lg bg-signal-500/20 px-2 py-1 text-xs font-medium text-signal-600 dark:text-signal-300">
          <Monitor className="size-3" />
          Presenting
        </div>
      )}
    </div>
  );
}

function ParticipantGrid({ participants }: { participants: Participant[] }) {
  const count = participants.length as ParticipantCount;

  const getGridConfig = () => {
    switch (count) {
      case 1:
        return { cols: "grid-cols-1", gap: "gap-4", padding: "p-8", maxWidth: "max-w-3xl", aspectRatio: "aspect-video" };
      case 2:
        return { cols: "grid-cols-2", gap: "gap-4", padding: "p-8", maxWidth: "max-w-5xl", aspectRatio: "aspect-video" };
      case 4:
        return { cols: "grid-cols-2", gap: "gap-4", padding: "p-6", maxWidth: "max-w-5xl", aspectRatio: "aspect-square" };
      case 6:
        return { cols: "grid-cols-3", gap: "gap-4", padding: "p-6", maxWidth: "max-w-6xl", aspectRatio: "aspect-square" };
      case 9:
        return { cols: "grid-cols-3", gap: "gap-3", padding: "p-6", maxWidth: "max-w-full", aspectRatio: "aspect-square" };
      case 16:
        return { cols: "grid-cols-4", gap: "gap-3", padding: "p-6", maxWidth: "max-w-full", aspectRatio: "aspect-square" };
      default:
        return { cols: "grid-cols-3", gap: "gap-3", padding: "p-6", maxWidth: "max-w-full", aspectRatio: "aspect-square" };
    }
  };

  const config = getGridConfig();

  return (
    <div className={`flex w-full items-center justify-center ${config.padding}`}>
      <div className={`grid ${config.cols} ${config.gap} w-full ${config.maxWidth} auto-rows-fr`}>
        {participants.map((participant) => (
          <div key={participant.id} className={`${config.aspectRatio} min-h-0`}>
            <ParticipantTile participant={participant} isSpeaking={participant.isSpeaking} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActiveStudyRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [roomState] = useState<RoomState>("active");
  const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const [timer, setTimer] = useState(134); // 2h 14m

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("participants");

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId || "ROOM-CODE");
    alert("Invite code copied!");
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/study-rooms/${roomId}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied!");
  };

  const handleLeave = () => {
    navigate("/dashboard");
  };

  const triggerReaction = (emoji: string) => {
    // Update local user's reaction mock
    setParticipants((prev) =>
      prev.map((p) => (p.id === "1" ? { ...p, reaction: emoji } : p))
    );
    setReactionOpen(false);

    // Ephemeral reaction disappears after 3 seconds
    setTimeout(() => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === "1" ? { ...p, reaction: undefined } : p))
      );
    }, 3000);
  };

  // Sync mic/camera/share toggles with user participant in grid
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === "1"
          ? {
              ...p,
              isMicOn,
              isCameraOn,
              isScreenSharing,
              hasRaisedHand,
            }
          : p
      )
    );
  }, [isMicOn, isCameraOn, isScreenSharing, hasRaisedHand]);

  if (roomState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="relative size-16">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-white/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-signal-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">Loading Study Room</p>
            <p className="text-sm text-slate-550 dark:text-slate-400">Connecting to the session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (roomState === "empty") {
    return (
      <div className="flex h-screen flex-col bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-ink-900/90 backdrop-blur-lg">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-semibold">Study Session</h1>
                <span className="inline-flex items-center rounded-full bg-signal-500/10 px-2.5 py-1 text-xs font-semibold text-signal-600 dark:text-signal-300">
                  Room: {roomId}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/10 dark:bg-red-500/[0.04] dark:text-red-400 dark:hover:bg-red-500/[0.08]"
              onClick={handleLeave}
            >
              <LogOut size={14} />
              Leave
            </button>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-ink-900 p-6 shadow-xl">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-white/[0.06] mx-auto flex items-center justify-center">
                  <Users className="size-8 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">Room is Empty</p>
              <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Waiting for other participants to join. Share the invite link to get started.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button min-h-0 py-2.5 px-4 text-xs font-semibold gap-1.5"
              onClick={handleCopyLink}
            >
              <Copy size={14} />
              Copy Invite Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 text-slate-950 dark:bg-ink-950 dark:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-ink-900/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Room info */}
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-semibold truncate">Active Study Session</h1>
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                StudyRoom
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-signal-500/10 px-2.5 py-1 text-xs font-semibold text-signal-600 dark:text-signal-300">
                <Lock className="size-3" />
                Active Call
              </span>
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-450 mt-1">
              <div className="flex items-center gap-1">
                <Users className="size-3.5" />
                <span>{participants.length} participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-3.5" />
                <span>{formatTime(timer)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Signal className="size-3.5" />
                <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 ml-4">
            <button
              type="button"
              className="secondary-button min-h-0 h-8 px-3 text-xs gap-1.5 focus:outline-none focus:ring-2 focus:ring-signal-500"
              title="Copy invite code"
              onClick={handleCopyCode}
            >
              <Copy size={14} />
              Code
            </button>
            <button
              type="button"
              className="secondary-button min-h-0 h-8 px-3 text-xs gap-1.5 focus:outline-none focus:ring-2 focus:ring-signal-500"
              title="Copy invite link"
              onClick={handleCopyLink}
            >
              <Copy size={14} />
              Link
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-red-250 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-500/10 dark:bg-red-500/[0.04] dark:text-red-400 dark:hover:bg-red-500/[0.08]"
              title="Leave meeting"
              onClick={handleLeave}
            >
              <LogOut size={14} />
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace split screen */}
      <div className="flex flex-1 h-[calc(100vh-70px-80px)] w-full overflow-hidden">
        <main className="flex-1 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-ink-950 dark:to-ink-900 flex items-center justify-center">
          <ParticipantGrid participants={participants} />
        </main>
        
        <ActiveStudyRoomSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeSidebarTab}
          setActiveTab={setActiveSidebarTab}
          participants={participants}
        />
      </div>

      {/* Floating controls - bottom section */}
      <div className="h-20 w-full flex items-center justify-center relative">
        {reactionOpen && (
          <div className="absolute bottom-20 z-50 flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-ink-900 animate-scale-up">
            {["👍", "👏", "❤️", "😂", "🎉", "🙌", "🤔"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="size-9 rounded-xl text-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                onClick={() => triggerReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-full border border-slate-250/80 bg-white/70 dark:border-white/10 dark:bg-ink-900/70 p-3 shadow-2xl backdrop-blur-xl">
          {/* Microphone */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              isMicOn
                ? "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20 focus:ring-red-500"
            }`}
            title={isMicOn ? "Mute microphone" : "Unmute microphone"}
            aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
            aria-pressed={isMicOn}
            onClick={() => setIsMicOn(!isMicOn)}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              isCameraOn
                ? "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20 focus:ring-red-500"
            }`}
            title={isCameraOn ? "Turn camera off" : "Turn camera on"}
            aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
            aria-pressed={isCameraOn}
            onClick={() => setIsCameraOn(!isCameraOn)}
          >
            {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              isScreenSharing
                ? "bg-signal-500/10 text-signal-600 dark:text-signal-300 hover:bg-signal-500/20"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            }`}
            title={isScreenSharing ? "Stop presenting" : "Present screen"}
            aria-label={isScreenSharing ? "Stop presenting" : "Present screen"}
            aria-pressed={isScreenSharing}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
          >
            <Monitor size={20} />
          </button>

          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

          {/* Raise Hand */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
              hasRaisedHand
                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            }`}
            title={hasRaisedHand ? "Lower hand" : "Raise hand"}
            aria-label={hasRaisedHand ? "Lower hand" : "Raise hand"}
            aria-pressed={hasRaisedHand}
            onClick={() => setHasRaisedHand(!hasRaisedHand)}
          >
            <Hand size={20} />
          </button>

          {/* Reactions */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              reactionOpen
                ? "bg-signal-500/10 text-signal-600 dark:text-signal-300 hover:bg-signal-500/20"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            }`}
            title="Send reaction"
            aria-label="Send reaction"
            aria-haspopup="true"
            aria-expanded={reactionOpen}
            onClick={() => setReactionOpen(!reactionOpen)}
          >
            <Smile size={20} />
          </button>

          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

          {/* Participants */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              sidebarOpen && activeSidebarTab === "participants"
                ? "bg-signal-500/10 text-signal-600 dark:text-signal-300 hover:bg-signal-500/20"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            }`}
            title="Participants list"
            aria-label="Participants list"
            onClick={() => {
              if (sidebarOpen && activeSidebarTab === "participants") {
                setSidebarOpen(false);
              } else {
                setSidebarOpen(true);
                setActiveSidebarTab("participants");
              }
            }}
          >
            <Users size={20} />
          </button>

          {/* Chat */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              sidebarOpen && activeSidebarTab === "chat"
                ? "bg-signal-500/10 text-signal-600 dark:text-signal-300 hover:bg-signal-500/20"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            }`}
            title="Session chat"
            aria-label="Session chat"
            onClick={() => {
              if (sidebarOpen && activeSidebarTab === "chat") {
                setSidebarOpen(false);
              } else {
                setSidebarOpen(true);
                setActiveSidebarTab("chat");
              }
            }}
          >
            <MessageSquare size={20} />
          </button>

          {/* Notes */}
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500 ${
              sidebarOpen && activeSidebarTab === "notes"
                ? "bg-signal-500/10 text-signal-600 dark:text-signal-300 hover:bg-signal-500/20"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            }`}
            title="Shared notes"
            aria-label="Shared notes"
            onClick={() => {
              if (sidebarOpen && activeSidebarTab === "notes") {
                setSidebarOpen(false);
              } else {
                setSidebarOpen(true);
                setActiveSidebarTab("notes");
              }
            }}
          >
            <FileText size={20} />
          </button>

          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

          {/* Settings */}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-signal-500"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>

          {/* Leave Meeting (destructive) */}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-red-500 hover:bg-red-500/10 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Leave call"
            aria-label="Leave call"
            onClick={handleLeave}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
