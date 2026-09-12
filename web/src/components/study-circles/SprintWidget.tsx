import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  Award,
  Sparkles,
  ChevronDown,
  Headphones,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../../store/chat.store";
import { socketService } from "../../services/socket.service";

interface SprintWidgetProps {
  communityId: string;
  channelId?: string;
  currentUserId?: string;
  currentUserName?: string;
  className?: string;
}

type SoundscapeType = "none" | "rain" | "library" | "lofi";

export const SprintWidget: React.FC<SprintWidgetProps> = ({
  communityId,
  channelId,
  currentUserId,
  currentUserName,
  className = ""
}) => {
  const { activeSprint, setActiveSprint, updateSprintParticipants } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [topicInput, setTopicInput] = useState("Deep Work & Problem Solving");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Soundscape audio synthesizer state
  const [activeSound, setActiveSound] = useState<SoundscapeType>("none");
  const [volume, setVolume] = useState(0.4);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<Array<AudioNode>>([]);

  // Calculate remaining time from active sprint
  useEffect(() => {
    if (!activeSprint?.isActive) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(activeSprint.endsAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && activeSprint.isActive) {
        // Complete sprint
        const socket = socketService.get();
        socket?.emit("sprint:complete", { communityId, channelId });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSprint, communityId, channelId]);

  // Web Audio API Generative Soundscape Engine
  const stopSoundscape = useCallback(() => {
    activeNodesRef.current.forEach((node) => {
      try {
        if ("stop" in node && typeof (node as any).stop === "function") {
          (node as any).stop();
        }
        node.disconnect();
      } catch {}
    });
    activeNodesRef.current = [];
  }, []);

  const playSoundscape = useCallback(
    (type: SoundscapeType) => {
      stopSoundscape();
      if (type === "none") {
        setActiveSound("none");
        return;
      }

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume, ctx.currentTime);
        masterGain.connect(ctx.destination);
        activeNodesRef.current.push(masterGain);

        if (type === "rain") {
          // Generative Brown noise for continuous soothing rain
          const bufferSize = 2 * ctx.sampleRate;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          }

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          whiteNoise.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(800, ctx.currentTime);

          whiteNoise.connect(filter);
          filter.connect(masterGain);
          whiteNoise.start();
          activeNodesRef.current.push(whiteNoise, filter);
        } else if (type === "library") {
          // Soft ambient rustle / air resonance
          const bufferSize = 2 * ctx.sampleRate;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          let b0 = 0, b1 = 0, b2 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2) * 0.1;
          }

          const pinkSource = ctx.createBufferSource();
          pinkSource.buffer = noiseBuffer;
          pinkSource.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(450, ctx.currentTime);
          filter.Q.setValueAtTime(1.2, ctx.currentTime);

          pinkSource.connect(filter);
          filter.connect(masterGain);
          pinkSource.start();
          activeNodesRef.current.push(pinkSource, filter);
        } else if (type === "lofi") {
          // Binaural Alpha waves drone (200Hz base + 210Hz alpha difference)
          const oscL = ctx.createOscillator();
          const oscR = ctx.createOscillator();
          const pannerL = ctx.createStereoPanner?.() || ctx.createGain();
          const pannerR = ctx.createStereoPanner?.() || ctx.createGain();

          oscL.type = "sine";
          oscL.frequency.setValueAtTime(196, ctx.currentTime); // G3

          oscR.type = "sine";
          oscR.frequency.setValueAtTime(206, ctx.currentTime); // +10Hz Alpha pulse

          if ("pan" in pannerL) (pannerL as StereoPannerNode).pan.setValueAtTime(-0.8, ctx.currentTime);
          if ("pan" in pannerR) (pannerR as StereoPannerNode).pan.setValueAtTime(0.8, ctx.currentTime);

          const lofiFilter = ctx.createBiquadFilter();
          lofiFilter.type = "lowpass";
          lofiFilter.frequency.setValueAtTime(320, ctx.currentTime);

          oscL.connect(pannerL);
          oscR.connect(pannerR);
          pannerL.connect(lofiFilter);
          pannerR.connect(lofiFilter);
          lofiFilter.connect(masterGain);

          oscL.start();
          oscR.start();
          activeNodesRef.current.push(oscL, oscR, lofiFilter);
        }

        setActiveSound(type);
      } catch (e) {
        console.warn("AudioContext soundscape initialization note:", e);
      }
    },
    [volume, stopSoundscape]
  );

  // Update master volume dynamically
  useEffect(() => {
    if (activeNodesRef.current[0] && activeNodesRef.current[0] instanceof GainNode) {
      activeNodesRef.current[0].gain.setValueAtTime(volume, audioCtxRef.current?.currentTime || 0);
    }
  }, [volume]);

  // Clean up audio nodes on unmount
  useEffect(() => {
    return () => {
      stopSoundscape();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSoundscape]);

  // Socket start sprint handler
  const handleStartSprint = (minutes: number) => {
    const socket = socketService.get();
    socket?.emit("sprint:start", {
      communityId,
      channelId,
      durationMinutes: minutes,
      topic: topicInput
    });
    setIsOpen(false);
  };

  const handleJoinSprint = () => {
    const socket = socketService.get();
    socket?.emit("sprint:join", { communityId, channelId });
    if (currentUserId && activeSprint) {
      updateSprintParticipants([...activeSprint.participants, currentUserId]);
    }
  };

  const handleLeaveSprint = () => {
    const socket = socketService.get();
    socket?.emit("sprint:leave", { communityId, channelId });
    if (currentUserId && activeSprint) {
      updateSprintParticipants(activeSprint.participants.filter((id) => id !== currentUserId));
    }
  };

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isUserParticipating = currentUserId && activeSprint?.participants?.includes(currentUserId);
  const totalSprintSeconds = (activeSprint?.durationMinutes || 25) * 60;
  const progressPercent =
    totalSprintSeconds > 0
      ? Math.max(0, Math.min(100, ((totalSprintSeconds - secondsRemaining) / totalSprintSeconds) * 100))
      : 0;

  return (
    <div className={`relative ${className}`}>
      {/* ── Collapsed / Quick Glance Bar ── */}
      <div className="flex items-center gap-2 bg-[#0F1A30]/80 backdrop-blur-md border border-[#162544] hover:border-emerald-500/40 rounded-xl px-3 py-1.5 shadow-lg transition-all">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left group"
          title="Study Sprint & Ambient Focus Soundscape"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <Timer className="w-4 h-4" />
            {activeSprint?.isActive && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200">
              {activeSprint?.isActive ? (
                <span className="font-mono text-emerald-400 font-bold">{formatTime(secondsRemaining)}</span>
              ) : (
                <span>Study Sprint</span>
              )}
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
            <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
              {activeSprint?.isActive ? activeSprint.topic : "Start Pomodoro"}
            </span>
          </div>
        </button>

        {/* Quick Ambient Sound Toggle */}
        <div className="h-4 w-px bg-[#162544] mx-1" />
        <button
          onClick={() => playSoundscape(activeSound === "none" ? "rain" : "none")}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            activeSound !== "none"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              : "text-gray-400 hover:text-gray-200 hover:bg-[#162544]"
          }`}
          title={activeSound !== "none" ? `Soundscape: ${activeSound} (Click to mute)` : "Play Ambient Focus Audio"}
        >
          {activeSound !== "none" ? <Headphones className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Quick Join / Leave when active */}
        {activeSprint?.isActive && (
          <button
            onClick={isUserParticipating ? handleLeaveSprint : handleJoinSprint}
            className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-all ${
              isUserParticipating
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
            }`}
          >
            {isUserParticipating ? "Joined" : "Join"}
          </button>
        )}
      </div>

      {/* ── Expanded Study Sprint & Soundscape Deck ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-80 bg-[#0B132B] border border-[#162544] rounded-2xl p-4 shadow-2xl z-50 backdrop-blur-xl text-gray-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#162544]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold tracking-wide text-white">Study Sprint (Pomodoro)</span>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                +15 Karma on Finish
              </span>
            </div>

            {/* Timer Ring Section */}
            {activeSprint?.isActive ? (
              <div className="my-4 flex flex-col items-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#162544"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#10B981"
                      strokeWidth="8"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * progressPercent) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-2xl font-black tracking-tight text-white">
                      {formatTime(secondsRemaining)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">remaining</span>
                  </div>
                </div>

                <p className="mt-2 text-xs font-semibold text-center text-gray-300 max-w-[240px]">
                  "{activeSprint.topic}"
                </p>

                {/* Participants Roster */}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {activeSprint.participants?.length || 1} student
                    {(activeSprint.participants?.length || 1) > 1 ? "s" : ""} sprinting
                  </span>
                </div>

                {/* Join / Leave Controls */}
                <div className="mt-4 flex w-full gap-2">
                  <button
                    onClick={isUserParticipating ? handleLeaveSprint : handleJoinSprint}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all shadow-md ${
                      isUserParticipating
                        ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isUserParticipating ? "Leave Sprint" : "Join Sprint (+15 Karma)"}
                  </button>
                </div>
              </div>
            ) : (
              /* Idle / Start Sprint Controls */
              <div className="my-3 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Sprint Focus Goal / Topic
                  </label>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Solve 3 LeetCode Graph problems"
                    className="w-full bg-[#0F1A30] border border-[#162544] rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">
                    Duration
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[15, 25, 45].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setCustomMinutes(mins)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          customMinutes === mins
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-[#0F1A30] hover:bg-[#162544] text-gray-300 border border-[#162544]"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleStartSprint(customMinutes)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Circle Study Sprint
                </button>
              </div>
            )}

            {/* ── Generative Web Audio Soundscape Hub ── */}
            <div className="mt-4 pt-3 border-t border-[#162544] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Synthesized Focus Audio</span>
                </div>
                <span className="text-[10px] text-gray-500">Pure Web Audio</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "rain", label: "🌧️ Rain" },
                  { id: "library", label: "📚 Library" },
                  { id: "lofi", label: "🎵 Alpha Wave" }
                ].map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => playSoundscape(activeSound === sound.id ? "none" : (sound.id as SoundscapeType))}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
                      activeSound === sound.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "bg-[#0F1A30] hover:bg-[#162544] text-gray-400 border border-[#162544]"
                    }`}
                  >
                    {sound.label}
                  </button>
                ))}
              </div>

              {activeSound !== "none" && (
                <div className="flex items-center gap-2 pt-1">
                  <Volume2 className="w-3 h-3 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#162544] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <button
                    onClick={() => playSoundscape("none")}
                    className="text-[10px] text-rose-400 hover:text-rose-300"
                  >
                    Mute
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
