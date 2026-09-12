import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Radio,
  Monitor,
  PhoneOff,
  Volume2,
  Users,
  Maximize2,
  Minimize2,
  Sparkles,
  ScreenShare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../../store/chat.store";
import { socketService } from "../../services/socket.service";

interface VoiceStageDockProps {
  currentUserId?: string;
  currentUserName?: string;
  className?: string;
}

export const VoiceStageDock: React.FC<VoiceStageDockProps> = ({
  currentUserId,
  currentUserName = "Student",
  className = ""
}) => {
  const {
    activeVoiceStage,
    setVoiceMuted,
    setVoiceSpeaking,
    setVoiceScreenSharing,
    leaveVoiceStage
  } = useChatStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Setup screen video stream preview if active
  useEffect(() => {
    if (videoPreviewRef.current && localScreenStream) {
      videoPreviewRef.current.srcObject = localScreenStream;
    }
  }, [localScreenStream]);

  if (!activeVoiceStage?.isConnected) {
    return null;
  }

  const { stageId, channelName, isMuted, isSpeaking, isScreenSharing, peers } = activeVoiceStage;

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setVoiceMuted(nextMuted);
    const socket = socketService.get();
    socket?.emit("voice:muteState", { stageId, isMuted: nextMuted });
  };

  const toggleScreenShare = async () => {
    const socket = socketService.get();
    if (isScreenSharing) {
      // Stop screenshare
      localScreenStream?.getTracks().forEach((t) => t.stop());
      setLocalScreenStream(null);
      setVoiceScreenSharing(false);
      socket?.emit("voice:screenshareState", { stageId, isSharing: false });
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert("Screen sharing is not supported by your browser.");
          return;
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Listen for user stopping share via native browser bar
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setLocalScreenStream(null);
            setVoiceScreenSharing(false);
            socket?.emit("voice:screenshareState", { stageId, isSharing: false });
          };
        }

        setLocalScreenStream(stream);
        setVoiceScreenSharing(true);
        socket?.emit("voice:screenshareState", { stageId, isSharing: true });
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    }
  };

  const handleLeave = () => {
    localScreenStream?.getTracks().forEach((t) => t.stop());
    setLocalScreenStream(null);
    const socket = socketService.get();
    socket?.emit("voice:leaveStage", { stageId });
    leaveVoiceStage();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${className}`}
      >
        <div className="bg-white/95 dark:bg-[#0B1324]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden p-3 min-w-[340px] max-w-[540px] text-slate-900 dark:text-slate-100">
          {/* Top Stage Bar */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                    {channelName || "Live Study Stage"}
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full uppercase">
                    Live
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  {peers.length + 1} connected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
                title={isMinimized ? "Expand Stage" : "Minimize Stage"}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Active Screen Sharing Preview (if user is sharing) */}
          {!isMinimized && isScreenSharing && localScreenStream && (
            <div className="my-2.5 rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 relative aspect-video">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-cyan-300 flex items-center gap-1">
                <ScreenShare className="w-3 h-3" />
                Sharing your screen
              </div>
            </div>
          )}

          {/* Participant Presence & Audio Wave Visualizer */}
          {!isMinimized && (
            <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {/* Local User */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isSpeaking
                      ? "ring-2 ring-emerald-400 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                      : "bg-slate-100 dark:bg-[#162544] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#233863]"
                  }`}
                >
                  {currentUserName.charAt(0).toUpperCase()}
                  {isMuted && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center">
                      <MicOff className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[50px]">
                  You
                </span>
              </div>

              {/* Peers */}
              {peers.map((peer) => (
                <div key={peer.socketId} className="flex flex-col items-center gap-1">
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      peer.isSpeaking
                        ? "ring-2 ring-[#1E90FF] bg-[#1E90FF]/20 text-[#1E90FF] shadow-[0_0_12px_rgba(30,144,255,0.5)]"
                        : "bg-slate-100 dark:bg-[#162544] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#233863]"
                    }`}
                  >
                    {peer.name.charAt(0).toUpperCase()}
                    {peer.isMuted && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center">
                        <MicOff className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[60px]">
                    {peer.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Controls */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              {/* Mic Toggle */}
              <button
                onClick={toggleMute}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isMuted
                    ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 border border-rose-500/30"
                    : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isMuted ? "Muted" : "Mute"}</span>
              </button>

              {/* Screenshare Toggle */}
              <button
                onClick={toggleScreenShare}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isScreenSharing
                    ? "bg-[#1E90FF]/20 text-[#1E90FF] border border-[#1E90FF]/40 font-bold"
                    : "bg-slate-100 dark:bg-[#0F1A30] hover:bg-slate-200 dark:hover:bg-[#162544] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isScreenSharing ? "Sharing" : "Share"}</span>
              </button>
            </div>

            {/* Leave Stage Button */}
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/30 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave Stage</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
