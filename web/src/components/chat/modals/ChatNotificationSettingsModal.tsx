import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  Laptop,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Users,
  AtSign,
  Reply
} from "lucide-react";
import { useChatOrganizationStore } from "../../../store/chat-organization.store";

interface ChatNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatNotificationSettingsModal: React.FC<ChatNotificationSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const preferences = useChatOrganizationStore((state) => state.notificationPreferences);
  const updatePreferences = useChatOrganizationStore((state) => state.updateNotificationPreferences);

  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, [isOpen]);

  const requestDesktopPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
        if (perm === "granted") {
          updatePreferences({ desktopNotifications: true });
        } else {
          updatePreferences({ desktopNotifications: false });
        }
      } catch (err) {
        console.warn("Error requesting notification permission:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 p-4 sm:p-6 flex justify-center items-start sm:items-center animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-[#0D1524] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-200 select-none"
        >
          {/* Header */}
          <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#10192C] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#1E90FF] flex items-center justify-center">
                <Bell size={18} />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Chat Notification Preferences
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5 overflow-y-auto scrollbar-thin flex-1 min-h-0">
            {/* Desktop Notification Permission UX */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121B2D] border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop size={16} className="text-sky-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Desktop Notifications
                  </span>
                </div>
                {permissionState === "granted" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={13} />
                    <span>Enabled</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={13} />
                    <span>{permissionState === "denied" ? "Blocked in Browser" : "Needs Permission"}</span>
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Receive pop-up notifications on your desktop when receiving direct messages or mentions.
              </p>

              {permissionState !== "granted" && permissionState !== "denied" && (
                <button
                  type="button"
                  onClick={requestDesktopPermission}
                  className="mt-1 px-3 py-1.5 rounded-xl bg-[#1E90FF] hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition-colors self-start"
                >
                  Enable Desktop Notifications
                </button>
              )}
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Categories & Alerts
              </span>

              {/* Direct Messages */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={16} className="text-[#1E90FF]" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Direct Messages
                    </p>
                    <p className="text-[11px] text-slate-400">Alerts for 1-on-1 private messages</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.directMessages}
                  onChange={(e) => updatePreferences({ directMessages: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
              </label>

              {/* Community Messages */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Users size={16} className="text-indigo-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Community Messages
                    </p>
                    <p className="text-[11px] text-slate-400">New messages in joined channels</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.communityMessages}
                  onChange={(e) => updatePreferences({ communityMessages: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
              </label>

              {/* Mentions */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <AtSign size={16} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Mentions
                    </p>
                    <p className="text-[11px] text-slate-400">When someone @mentions your name</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.mentions}
                  onChange={(e) => updatePreferences({ mentions: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
              </label>

              {/* Thread Replies */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Reply size={16} className="text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Thread Replies
                    </p>
                    <p className="text-[11px] text-slate-400">Replies to threads you participate in</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.threadReplies}
                  onChange={(e) => updatePreferences({ threadReplies: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
              </label>

              {/* Sound Chime */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800/60 pt-3">
                <div className="flex items-center gap-2.5">
                  {preferences.sound ? (
                    <Volume2 size={16} className="text-sky-500" />
                  ) : (
                    <VolumeX size={16} className="text-slate-400" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Notification Chime Sound
                    </p>
                    <p className="text-[11px] text-slate-400">Play a subtle tone when new messages arrive</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sound}
                  onChange={(e) => updatePreferences({ sound: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1E90FF] focus:ring-sky-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 dark:bg-[#10192C] border-t border-slate-200/80 dark:border-slate-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
