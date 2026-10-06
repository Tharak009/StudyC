import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertCircle,
  X,
  Wifi,
  RefreshCw,
  Users,
  Monitor,
  Hand,
  Minimize2,
  Maximize2,
  Settings
} from "lucide-react";
import { useCallStore } from "../../../store/call.store";
import { useAuthStore } from "../../../store/auth.store";
import { callSignalingService } from "../../../services/call-signaling.service";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareView } from "./ScreenShareView";
import { StageParticipantsList } from "./StageParticipantsList";
import { DeviceSettingsModal } from "./DeviceSettingsModal";
import { MAX_GROUP_CALL_PARTICIPANTS } from "../../../constants/call.constants";
import type { CallParticipant } from "../../../types/call.types";

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function CallOverlay() {
  const {
    callMode,
    status,
    type,
    peerName,
    peerAvatar,
    isCaller,
    isMuted,
    isCameraOff,
    remoteCameraOff,
    localStream,
    remoteStream,
    duration,
    errorMessage,
    networkQuality,
    groupCommunityName,
    groupParticipants,
    groupRemoteStreams,
    isScreenSharing,
    screenSharerId,
    localScreenStream,
    stageMode,
    handRaised,
    raiseHandQueue,
    isMinimized,
    setIsMinimized,
    reset
  } = useCallStore();

  const user = useAuthStore((s) => s.user);

  const [isStageListOpen, setIsStageListOpen] = useState(false);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize call signaling listeners on mount
  useEffect(() => {
    callSignalingService.init();
  }, []);

  // Attach local stream to local video tag
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, status, isCameraOff]);

  // Attach remote stream to remote video tag
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);

  if (status === "IDLE") return null;

  // ── 1. Floating Minimized Picture-in-Picture Mode ─────────────────────────
  // Allows full concurrent navigation and messaging in Stream Chat while the call stays live
  if (isMinimized && (status === "CONNECTED" || status === "CONNECTING" || status === "RECONNECTING")) {
    const isGroup = callMode === "group";
    const title = isGroup
      ? groupCommunityName || (stageMode === "stage" ? "Voice Stage" : "Study Room Call")
      : peerName || "Direct Call";

    return (
      <div className="fixed bottom-6 right-6 z-[110] w-76 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl p-3.5 backdrop-blur-xl flex flex-col gap-2.5 text-white select-none animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold truncate max-w-[140px]">{title}</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md">
              {formatDuration(duration)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            aria-label="Expand call view"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Expand call"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* Action Controls in Minimized Mode */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                isGroup ? callSignalingService.toggleGroupMute() : callSignalingService.toggleMute()
              }
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isMuted
                  ? "bg-red-500/20 text-red-400"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            {type === "video" && (
              <button
                type="button"
                onClick={() =>
                  isGroup ? callSignalingService.toggleGroupCamera() : callSignalingService.toggleCamera()
                }
                aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isCameraOff
                    ? "bg-red-500/20 text-red-400"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {isCameraOff ? <VideoOff size={14} /> : <Video size={14} />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              isGroup ? callSignalingService.leaveGroupCall(true) : callSignalingService.endCall()
            }
            aria-label="Leave or end call"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
          >
            <PhoneOff size={13} />
            <span>Leave</span>
          </button>
        </div>
      </div>
    );
  }

  // ── 2. Incoming Call Prompt Modal ──────────────────────────────────────────
  if (status === "RINGING") {
    const isIncomingVideo = type === "video";

    return (
      <AnimatePresence>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="incoming-call-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl bg-[#0B1220]/95 border border-slate-700/70 p-6 text-center shadow-2xl backdrop-blur-xl text-white flex flex-col items-center"
          >
            {/* Pulsing Avatar */}
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-[#1E90FF]/30 animate-ping" />
              {peerAvatar ? (
                <img
                  src={peerAvatar}
                  alt={peerName || "Caller avatar"}
                  className="relative w-24 h-24 rounded-full object-cover shadow-xl ring-4 ring-[#1E90FF]/50"
                />
              ) : (
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-3xl font-bold shadow-xl ring-4 ring-[#1E90FF]/50">
                  {(peerName || "U").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <h3 id="incoming-call-title" className="text-xl font-bold text-white mb-1">
              {peerName || "Classmate"}
            </h3>
            <p className="text-xs text-sky-400 font-medium mb-6 flex items-center gap-1.5">
              {isIncomingVideo ? <Video size={14} /> : <Phone size={14} />}
              <span>Incoming {isIncomingVideo ? "Video" : "Voice"} Call...</span>
            </p>

            {/* Accept / Decline Action Controls */}
            <div className="flex items-center gap-6 w-full justify-center">
              <button
                type="button"
                onClick={() => callSignalingService.rejectCall("declined")}
                aria-label="Decline incoming call"
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 active:scale-95">
                  <PhoneOff size={22} />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-red-400">Decline</span>
              </button>

              <button
                type="button"
                onClick={() => callSignalingService.acceptCall(isIncomingVideo)}
                aria-label={isIncomingVideo ? "Accept video call" : "Accept voice call"}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-600/90 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 active:scale-95 animate-bounce">
                  {isIncomingVideo ? <Video size={22} /> : <Phone size={22} />}
                </div>
                <span className="text-xs text-slate-400 group-hover:text-emerald-400">
                  {isIncomingVideo ? "Accept Video" : "Accept Voice"}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // ── 3. Call Terminated Notification Banner ────────────────────────────────
  if (
    status === "ENDED" ||
    status === "REJECTED" ||
    status === "MISSED" ||
    status === "CANCELLED" ||
    status === "FAILED"
  ) {
    const isError = status === "FAILED" || status === "MISSED";
    const isBusy = errorMessage?.toLowerCase().includes("busy");

    return (
      <div
        role="alert"
        className="fixed top-6 right-6 z-[100] max-w-sm rounded-2xl bg-slate-900/95 border border-slate-800 text-white p-4 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isError ? "bg-red-500/20 text-red-400" : isBusy ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-300"
          }`}
        >
          {isError ? <AlertCircle size={20} /> : <PhoneOff size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {status === "FAILED"
              ? "Call Failed"
              : status === "MISSED"
              ? "Missed Call"
              : status === "REJECTED"
              ? isBusy
                ? "User Busy"
                : "Call Declined"
              : status === "CANCELLED"
              ? "Call Cancelled"
              : "Call Ended"}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {errorMessage || (duration > 0 ? `Duration: ${formatDuration(duration)}` : "Disconnected")}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label="Dismiss call notice"
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // ── 4. Group Call & Voice Stage UI ─────────────────────────────────────────
  if (callMode === "group") {
    const currentUserId = user?._id || "";
    const allParticipants = Object.values(groupParticipants);
    const remoteParticipants = allParticipants.filter((p) => p.userId !== currentUserId);
    const localInList = allParticipants.find((p) => p.userId === currentUserId);

    const localParticipant: CallParticipant = localInList || {
      userId: currentUserId || "local",
      socketId: "",
      name: user?.fullName || "You",
      avatar: user?.profilePicture,
      role: isCaller ? "host" : stageMode === "stage" ? "listener" : "participant",
      joinedAt: Date.now(),
      audioEnabled: !isMuted,
      videoEnabled: !isCameraOff,
      connectionState: "CONNECTED"
    };

    const isHostOrMod = localParticipant.role === "host" || localParticipant.role === "moderator";
    const isListener =
      stageMode === "stage" &&
      (localParticipant.role === "listener" || (!localParticipant.role && !isHostOrMod));

    // Screen sharing identification
    const isScreenActive = Boolean(screenSharerId);
    const isLocalPresenter =
      screenSharerId === currentUserId || (isScreenSharing && !screenSharerId);
    const presenterName = isLocalPresenter
      ? "You"
      : screenSharerId
      ? groupParticipants[screenSharerId]?.name || "Participant"
      : "";
    const presenterStream = isLocalPresenter
      ? localScreenStream || localStream
      : screenSharerId
      ? groupRemoteStreams[screenSharerId] || null
      : null;

    const totalCount = remoteParticipants.length + 1;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-call-title"
        className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none"
      >
        <div className="relative w-full max-w-6xl h-[88vh] overflow-hidden rounded-3xl bg-[#0B1220] border border-slate-800 shadow-2xl flex flex-col">
          {/* Top Header Bar */}
          <div className="relative z-20 flex items-center justify-between px-5 py-3.5 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-white min-w-0">
              <span id="group-call-title" className="text-sm font-semibold truncate max-w-[220px]">
                {groupCommunityName || (stageMode === "stage" ? "Voice Stage" : "Study Room Call")}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-slate-300">
                {status === "CONNECTED" ? formatDuration(duration) : "Connecting..."}
              </span>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-medium"
                title="Participant count"
              >
                <Users size={12} />
                <span>
                  {totalCount}/{MAX_GROUP_CALL_PARTICIPANTS}
                </span>
              </div>
              {stageMode === "stage" && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Stage
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {status === "CONNECTED" && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    networkQuality === "excellent"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : networkQuality === "good"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : networkQuality === "fair"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : networkQuality === "poor"
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  }`}
                  title={`Connection Quality: ${networkQuality}`}
                >
                  <Wifi size={12} />
                  <span className="capitalize">{networkQuality}</span>
                </div>
              )}

              {/* Minimize / PiP Toggle */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize call overlay"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Minimize (Picture-in-Picture)"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Center Stage Layout */}
          <div className="relative flex-1 w-full bg-slate-950 p-4 overflow-hidden flex flex-col">
            {isScreenActive ? (
              /* ── Screen Sharing View Mode ── */
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <div className="flex-1 min-h-0">
                  <ScreenShareView
                    stream={presenterStream}
                    presenterName={presenterName}
                    isLocal={isLocalPresenter}
                    onStopSharing={() => callSignalingService.stopScreenShare()}
                  />
                </div>

                {/* Horizontal Participant Thumbnail Strip */}
                <div className="h-32 flex items-center gap-2.5 overflow-x-auto py-1 px-1 shrink-0">
                  <div className="w-48 h-full aspect-video shrink-0">
                    <ParticipantTile
                      participant={{
                        ...localParticipant,
                        audioEnabled: !isMuted,
                        videoEnabled: !isCameraOff
                      }}
                      stream={localStream}
                      isLocal={true}
                    />
                  </div>
                  {remoteParticipants.map((p) => (
                    <div key={p.userId} className="w-48 h-full aspect-video shrink-0">
                      <ParticipantTile
                        participant={p}
                        stream={groupRemoteStreams[p.userId]}
                        isLocal={false}
                        canModerate={isHostOrMod}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : stageMode === "stage" ? (
              /* ── Dedicated Voice Stage Mode ── */
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Stage Speakers Section */}
                <div>
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Mic size={14} />
                    <span>Stage Speakers</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Local Participant (if speaker or host) */}
                    {!isListener && (
                      <div className="aspect-video min-h-[160px]">
                        <ParticipantTile
                          participant={{
                            ...localParticipant,
                            audioEnabled: !isMuted,
                            videoEnabled: !isCameraOff
                          }}
                          stream={localStream}
                          isLocal={true}
                        />
                      </div>
                    )}
                    {/* Remote Speakers */}
                    {remoteParticipants
                      .filter(
                        (p) =>
                          p.role === "host" || p.role === "moderator" || p.role === "speaker"
                      )
                      .map((p) => (
                        <div key={p.userId} className="aspect-video min-h-[160px]">
                          <ParticipantTile
                            participant={p}
                            stream={groupRemoteStreams[p.userId]}
                            isLocal={false}
                            canModerate={isHostOrMod}
                          />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Audience / Listeners Section */}
                <div className="mt-2 pt-4 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Users size={14} />
                    <span>Audience</span>
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {/* Local user if in audience */}
                    {isListener && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-white">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span>You (Listening)</span>
                        {handRaised && <Hand size={12} className="text-amber-400 animate-bounce" />}
                      </div>
                    )}
                    {remoteParticipants
                      .filter((p) => p.role === "listener" || (!p.role && p.role !== "host" && p.role !== "moderator" && p.role !== "speaker"))
                      .map((p) => (
                        <div
                          key={p.userId}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300"
                        >
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                              {p.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <span>{p.name}</span>
                          {p.handRaised && <Hand size={12} className="text-amber-400 animate-bounce" />}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Standard Group Video/Voice Grid ── */
              <div
                className={`grid gap-3 w-full h-full items-center justify-center overflow-y-auto ${
                  totalCount <= 1
                    ? "grid-cols-1 max-w-xl mx-auto"
                    : totalCount === 2
                    ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
                    : totalCount <= 4
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3"
                }`}
              >
                <div className="w-full h-full min-h-[160px] max-h-[380px] aspect-video">
                  <ParticipantTile
                    participant={{
                      ...localParticipant,
                      audioEnabled: !isMuted,
                      videoEnabled: !isCameraOff
                    }}
                    stream={localStream}
                    isLocal={true}
                  />
                </div>
                {remoteParticipants.map((p) => (
                  <div key={p.userId} className="w-full h-full min-h-[160px] max-h-[380px] aspect-video">
                    <ParticipantTile
                      participant={p}
                      stream={groupRemoteStreams[p.userId]}
                      isLocal={false}
                      canModerate={isHostOrMod}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Voice Stage Participants Drawer */}
            <StageParticipantsList
              isOpen={isStageListOpen}
              onClose={() => setIsStageListOpen(false)}
              isModeratorOrHost={isHostOrMod}
            />
          </div>

          {/* Bottom Toolbar */}
          <div className="relative z-20 flex items-center justify-center gap-3 sm:gap-4 py-3.5 px-6 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md">
            {/* Microphone Toggle */}
            <button
              type="button"
              disabled={isListener}
              onClick={() => callSignalingService.toggleGroupMute()}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isListener
                  ? "bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-60"
                  : isMuted
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              title={
                isListener
                  ? "Listeners cannot unmute (Raise hand to request speak)"
                  : isMuted
                  ? "Unmute microphone"
                  : "Mute microphone"
              }
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              disabled={isListener}
              onClick={() => callSignalingService.toggleGroupCamera()}
              aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isListener
                  ? "bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-60"
                  : isCameraOff
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              title={isCameraOff ? "Turn on camera" : "Turn off camera"}
            >
              {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            {/* Screen Share Toggle */}
            <button
              type="button"
              disabled={isScreenActive && !isLocalPresenter}
              onClick={() =>
                isScreenSharing
                  ? callSignalingService.stopScreenShare()
                  : callSignalingService.startScreenShare()
              }
              aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isScreenActive && !isLocalPresenter
                  ? "bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-60"
                  : isScreenSharing
                  ? "bg-sky-500 text-white shadow-lg ring-2 ring-sky-400/50"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              title={
                isScreenActive && !isLocalPresenter
                  ? "Someone else is currently presenting"
                  : isScreenSharing
                  ? "Stop sharing screen"
                  : "Share screen"
              }
            >
              <Monitor size={20} />
            </button>

            {/* Hand Raise Toggle (Stage mode only) */}
            {stageMode === "stage" && isListener && (
              <button
                type="button"
                onClick={() =>
                  handRaised
                    ? callSignalingService.cancelSpeakRequest()
                    : callSignalingService.requestToSpeak()
                }
                aria-label={handRaised ? "Lower hand" : "Raise hand to speak"}
                className={`p-3.5 rounded-full transition-all cursor-pointer ${
                  handRaised
                    ? "bg-amber-500 text-slate-950 font-bold shadow-lg ring-2 ring-amber-400/50"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title={handRaised ? "Cancel speak request" : "Raise hand to speak"}
              >
                <Hand size={20} />
              </button>
            )}

            {/* Stage Participants List Toggle */}
            {stageMode === "stage" && (
              <button
                type="button"
                onClick={() => setIsStageListOpen((prev) => !prev)}
                aria-label="Toggle stage participant panel"
                className={`relative p-3.5 rounded-full transition-all cursor-pointer ${
                  isStageListOpen
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title="Stage participants"
              >
                <Users size={20} />
                {raiseHandQueue.length > 0 && isHostOrMod && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold flex items-center justify-center animate-bounce">
                    {raiseHandQueue.length}
                  </span>
                )}
              </button>
            )}

            {/* Device Settings Button */}
            <button
              type="button"
              onClick={() => setIsDeviceSettingsOpen(true)}
              aria-label="Audio and video settings"
              className="p-3.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
              title="Device Settings"
            >
              <Settings size={20} />
            </button>

            {/* Leave Call Button */}
            <button
              type="button"
              onClick={() => callSignalingService.leaveGroupCall(true)}
              aria-label="Leave group call"
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-2"
              title="Leave call"
            >
              <PhoneOff size={18} />
              <span className="text-xs">Leave</span>
            </button>
          </div>
        </div>

        {/* In-Call Audio/Video Device Settings Modal */}
        <DeviceSettingsModal
          isOpen={isDeviceSettingsOpen}
          onClose={() => setIsDeviceSettingsOpen(false)}
        />
      </div>
    );
  }

  // ── 5. Active 1-to-1 Direct Call Stage (Voice UI or Video UI) ──────────────
  const isVideoMode = type === "video";
  const hasRemoteVideo =
    Boolean(remoteStream && remoteStream.getVideoTracks().length > 0) && !remoteCameraOff;

  const isScreenActive = Boolean(screenSharerId);
  const isLocalPresenter = isScreenSharing;
  const presenterStream = isLocalPresenter ? localScreenStream : remoteStream;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-call-title"
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
    >
      <div
        className={`relative w-full overflow-hidden rounded-3xl bg-[#0B1220] border border-slate-800 shadow-2xl flex flex-col ${
          isVideoMode || isScreenActive ? "max-w-4xl h-[82vh]" : "max-w-md h-[480px]"
        }`}
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-3.5 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <span id="active-call-title" className="text-sm font-semibold">
              {peerName || "Classmate"}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 font-mono text-slate-200">
              {status === "CONNECTED"
                ? formatDuration(duration)
                : status === "CALLING"
                ? "Calling..."
                : status === "CONNECTING" || status === "ACCEPTED"
                ? "Connecting..."
                : status === "RECONNECTING"
                ? "Reconnecting..."
                : status}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {status === "CONNECTED" && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                  networkQuality === "excellent"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : networkQuality === "good"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : networkQuality === "fair"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : networkQuality === "poor"
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : "bg-sky-500/15 text-sky-400 border-sky-500/30"
                }`}
                title={`Call quality: ${networkQuality}`}
              >
                <Wifi size={12} />
                <span className="capitalize">{networkQuality}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize call overlay"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 cursor-pointer"
              title="Minimize (Picture-in-Picture)"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Reconnecting Alert Banner */}
        {status === "RECONNECTING" && (
          <div className="absolute top-14 inset-x-0 z-30 flex items-center justify-center pointer-events-none px-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-semibold text-xs shadow-xl animate-pulse backdrop-blur-md">
              <RefreshCw size={13} className="animate-spin" />
              <span>Connection interrupted. Reconnecting...</span>
            </div>
          </div>
        )}

        {/* Main Stage Content */}
        <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {isScreenActive ? (
            /* ── Screen Share Canvas in 1-to-1 ── */
            <div className="w-full h-full relative">
              <ScreenShareView
                stream={presenterStream}
                presenterName={isLocalPresenter ? "You" : peerName || "Peer"}
                isLocal={isLocalPresenter}
                onStopSharing={() => callSignalingService.stopScreenShare()}
              />
            </div>
          ) : isVideoMode ? (
            /* ── Video Call Layout (Remote Canvas + Local PIP) ── */
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-contain ${hasRemoteVideo ? "block" : "hidden"}`}
              />

              {!hasRemoteVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6">
                  {peerAvatar ? (
                    <img
                      src={peerAvatar}
                      alt={peerName || "Peer"}
                      className="w-28 h-28 rounded-full object-cover mb-4 ring-4 ring-slate-800"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold mb-4 text-slate-300">
                      {(peerName || "U").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm text-slate-400">
                    {status === "CALLING"
                      ? "Waiting for answer..."
                      : status === "CONNECTING"
                      ? "Connecting video stream..."
                      : status === "RECONNECTING"
                      ? "Reconnecting video line..."
                      : "Camera is off"}
                  </p>
                </div>
              )}

              {/* Local PIP Video Preview */}
              <div className="absolute bottom-20 right-5 w-36 h-24 sm:w-44 sm:h-30 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700/80 shadow-2xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isCameraOff ? "block" : "hidden"}`}
                />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
                    Camera Off
                  </div>
                )}
                {isMuted && (
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white text-[10px]">
                    <MicOff size={10} />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Dedicated Voice Call Layout ── */
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative mb-6">
                {status === "CALLING" && (
                  <div className="absolute inset-0 rounded-full bg-sky-500/25 animate-ping" />
                )}
                {status === "CONNECTED" && !isMuted && (
                  <div className="absolute -inset-2 rounded-full border-2 border-sky-500/40 animate-pulse" />
                )}
                {peerAvatar ? (
                  <img
                    src={peerAvatar}
                    alt={peerName || "Peer"}
                    className="relative w-32 h-32 rounded-full object-cover ring-4 ring-sky-500/40 shadow-2xl"
                  />
                ) : (
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-5xl font-bold text-white ring-4 ring-sky-500/40 shadow-2xl">
                    {(peerName || "U").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <h4 className="text-2xl font-bold text-white mb-1.5">{peerName || "Classmate"}</h4>
              <p className="text-sm text-slate-400 font-mono mb-4">
                {status === "CONNECTED"
                  ? formatDuration(duration)
                  : status === "CALLING"
                  ? "Ringing peer..."
                  : status === "RECONNECTING"
                  ? "Reconnecting voice line..."
                  : "Connecting audio line..."}
              </p>

              {status === "CONNECTED" && (
                <div className="flex items-center gap-1.5 mt-1" aria-hidden="true">
                  <span className="w-1.5 h-4 rounded-full bg-sky-400 animate-pulse" />
                  <span className="w-1.5 h-7 rounded-full bg-sky-500 animate-pulse delay-75" />
                  <span className="w-1.5 h-10 rounded-full bg-blue-500 animate-pulse delay-150" />
                  <span className="w-1.5 h-6 rounded-full bg-sky-500 animate-pulse delay-100" />
                  <span className="w-1.5 h-3 rounded-full bg-sky-400 animate-pulse" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="relative z-20 flex items-center justify-center gap-4 py-4 px-6 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md">
          {/* Microphone Mute / Unmute */}
          <button
            type="button"
            onClick={() => callSignalingService.toggleMute()}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            className={`p-3.5 rounded-full transition-all cursor-pointer ${
              isMuted
                ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Camera On / Off (Video Calls Only) */}
          {isVideoMode && (
            <button
              type="button"
              onClick={() => callSignalingService.toggleCamera()}
              aria-label={isCameraOff ? "Turn on camera" : "Turn off camera"}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isCameraOff
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              title={isCameraOff ? "Turn on camera" : "Turn off camera"}
            >
              {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          {/* Screen Share Button */}
          {status === "CONNECTED" && (
            <button
              type="button"
              onClick={() =>
                isScreenSharing
                  ? callSignalingService.stopScreenShare()
                  : callSignalingService.startScreenShare()
              }
              aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isScreenSharing
                  ? "bg-sky-500 text-white shadow-lg ring-2 ring-sky-400/50"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            >
              <Monitor size={20} />
            </button>
          )}

          {/* Device Settings Button */}
          <button
            type="button"
            onClick={() => setIsDeviceSettingsOpen(true)}
            aria-label="Audio and video settings"
            className="p-3.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
            title="Device Settings"
          >
            <Settings size={20} />
          </button>

          {/* End Call / Cancel Outgoing Call */}
          {status === "CALLING" && isCaller ? (
            <button
              type="button"
              onClick={() => callSignalingService.cancelCall()}
              aria-label="Cancel outgoing call"
              className="p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-2"
              title="Cancel call"
            >
              <X size={22} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => callSignalingService.endCall()}
              aria-label="End call"
              className="p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-2"
              title="End call"
            >
              <PhoneOff size={22} />
            </button>
          )}
        </div>

        {/* In-Call Audio/Video Device Settings Modal */}
        <DeviceSettingsModal
          isOpen={isDeviceSettingsOpen}
          onClose={() => setIsDeviceSettingsOpen(false)}
        />
      </div>
    </div>
  );
}
