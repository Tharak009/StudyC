import React, { useState } from "react";
import { Settings, Camera, Mic, Volume2, X, Check } from "lucide-react";

interface ActiveStudyRoomSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleReconnecting?: () => void;
  onTriggerEnded?: () => void;
  onTriggerKicked?: () => void;
  onTriggerBanned?: () => void;
  onToggleWaitingRoom?: () => void;
}

export function ActiveStudyRoomSettings({
  isOpen,
  onClose,
  onToggleReconnecting,
  onTriggerEnded,
  onTriggerKicked,
  onTriggerBanned,
  onToggleWaitingRoom,
}: ActiveStudyRoomSettingsProps) {
  const [selectedCamera, setSelectedCamera] = useState("default-cam");
  const [selectedMic, setSelectedMic] = useState("default-mic");
  const [selectedSpeaker, setSelectedSpeaker] = useState("default-speaker");

  const [testMicLevel, setTestMicLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);

  if (!isOpen) return null;

  const handleTestMic = () => {
    if (isTestingMic) {
      setIsTestingMic(false);
      setTestMicLevel(0);
    } else {
      setIsTestingMic(true);
      // Simulate level meter fluctuations
      let level = 10;
      const interval = setInterval(() => {
        if (!isTestingMic) {
          clearInterval(interval);
          return;
        }
        level = Math.floor(Math.random() * 80) + 10;
        setTestMicLevel(level);
      }, 100);

      // Stop after 5 seconds
      setTimeout(() => {
        setIsTestingMic(false);
        setTestMicLevel(0);
        clearInterval(interval);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 bg-slate-950/20 backdrop-blur-[2px] animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative my-8 w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/5 dark:bg-ink-900 transition-all duration-300 animate-scale-up">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.04] dark:hover:text-white transition"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/[0.04] dark:text-slate-350">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Device Settings
            </h3>
            <p className="text-[10px] text-slate-550 font-semibold uppercase mt-0.5">
              Audio & Video Configuration
            </p>
          </div>
        </div>

        {/* Form Selectors */}
        <div className="mt-4 space-y-4">
          {/* Camera Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
              <Camera size={14} className="text-indigo-500" />
              Camera Selection
            </label>
            <select
              className="field py-2 text-xs"
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              aria-label="Select Camera Device"
            >
              <option value="default-cam">Integrated HD Webcam (Default)</option>
              <option value="external-usb-cam">USB Video Device (External)</option>
              <option value="virtual-cam">OBS Virtual Camera</option>
            </select>
          </div>

          {/* Microphone Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
              <Mic size={14} className="text-indigo-500" />
              Microphone Input
            </label>
            <select
              className="field py-2 text-xs"
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              aria-label="Select Microphone Input"
            >
              <option value="default-mic">Internal Microphone Array (Default)</option>
              <option value="external-usb-mic">USB Studio Microphone (Input)</option>
              <option value="headset-mic">Wireless Headset Microphone</option>
            </select>
          </div>

          {/* Mic Level Testing Area */}
          <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-3 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-550 font-bold uppercase">Test Input Level</span>
              <button
                type="button"
                onClick={handleTestMic}
                className="text-[10px] font-bold text-indigo-650 hover:underline dark:text-indigo-400"
              >
                {isTestingMic ? "Stop Test" : "Test Mic"}
              </button>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200/50 dark:bg-white/[0.04] overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-100"
                style={{ width: `${testMicLevel}%` }}
              />
            </div>
          </div>

          {/* Speaker Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
              <Volume2 size={14} className="text-indigo-500" />
              Speakers Output
            </label>
            <select
              className="field py-2 text-xs"
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              aria-label="Select Audio Speakers"
            >
              <option value="default-speaker">Realtek Audio Speakers (Default)</option>
              <option value="external-headphones">Stereo USB Headphones</option>
              <option value="monitor-speakers">HDMI Display Output Speakers</option>
            </select>
          </div>

          {/* Simulation Diagnostics Panel */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Simulation Controls</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onToggleReconnecting}
                className="rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-2 py-1 text-[10px] font-semibold text-slate-650 dark:text-slate-350 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Toggle Reconnecting
              </button>
              <button
                type="button"
                onClick={onToggleWaitingRoom}
                className="rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-2 py-1 text-[10px] font-semibold text-slate-650 dark:text-slate-350 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Toggle Lobby View
              </button>
              <button
                type="button"
                onClick={onTriggerEnded}
                className="rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-2 py-1 text-[10px] font-semibold text-slate-650 dark:text-slate-350 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Simulate Room Ended
              </button>
              <button
                type="button"
                onClick={onTriggerKicked}
                className="rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-2 py-1 text-[10px] font-semibold text-red-600 dark:text-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Simulate Kicked
              </button>
              <button
                type="button"
                onClick={onTriggerBanned}
                className="rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-2 py-1 text-[10px] font-semibold text-red-600 dark:text-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Simulate Banned
              </button>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:border-white/5 dark:text-slate-405 dark:hover:bg-white/[0.03] transition focus:outline-none focus:ring-2 focus:ring-signal-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-ink-950 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-signal-500 shadow-md shadow-slate-950/10"
          >
            <Check size={14} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
