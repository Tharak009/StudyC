import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Ban, Flag, Loader2, MessageSquare, Phone, Search, ShieldCheck, UserRound, Video, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { usersApi } from "../../api/users.api";
import { friendsApi, type FriendshipStatusResult } from "../../api/friends.api";
import { streamApi } from "../../api/stream.api";
import { callSignalingService } from "../../services/call-signaling.service";
import { useToastStore } from "../../store/toast.store";
import { fromStreamUserId } from "../../utils/stream-id";
import { ReportModal } from "./modals/ReportModal";

interface ContactProfileDrawerProps {
  isOpen: boolean;
  userId: string;
  fallbackName?: string;
  fallbackAvatar?: string;
  contextLabel?: string;
  onSearchInChat?: () => void;
  onClose: () => void;
}

export function ContactProfileDrawer({
  isOpen,
  userId,
  fallbackName,
  fallbackAvatar,
  contextLabel,
  onSearchInChat,
  onClose
}: ContactProfileDrawerProps) {
  const cleanId = fromStreamUserId(userId);
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [blocked, setBlocked] = useState(false);
  const [working, setWorking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["public-profile", cleanId],
    queryFn: () => usersApi.getPublicProfile(cleanId),
    enabled: isOpen && Boolean(cleanId),
    retry: false
  });
  const statusQuery = useQuery({
    queryKey: ["friendship-status", cleanId],
    queryFn: () => friendsApi.getStatus(cleanId),
    enabled: isOpen && Boolean(cleanId),
    retry: false
  });

  useEffect(() => {
    if (!isOpen || !cleanId) return;
    let mounted = true;
    usersApi.listBlocked().then((items) => {
      if (!mounted || !Array.isArray(items)) return;
      setBlocked(items.some((item: any) => fromStreamUserId(String(item.user?._id || item.user?.id || item.user)) === cleanId));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [isOpen, cleanId]);

  const profile = profileQuery.data;
  const name = profile?.fullName || fallbackName || "StudyConnect member";
  const photo = profile?.profilePicture || fallbackAvatar;
  const friendship = statusQuery.data as FriendshipStatusResult | undefined;

  const runRelationshipAction = async (action: "request" | "accept" | "decline" | "cancel" | "remove") => {
    setWorking(true);
    try {
      if (action === "request") await friendsApi.sendRequest(cleanId);
      else if (action === "accept") await friendsApi.acceptRequest(cleanId);
      else if (action === "decline") await friendsApi.declineRequest(cleanId);
      else if (action === "cancel") await friendsApi.cancelRequest(cleanId);
      else if (friendship?.friendshipId) await friendsApi.removeFriend(cleanId);
      await statusQuery.refetch();
      addToast(action === "request" ? "Friend request sent" : action === "accept" ? "Friend request accepted" : action === "remove" ? "Friend removed" : action === "decline" ? "Friend request declined" : "Friend request cancelled", "success");
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not update friendship", "error");
    } finally {
      setWorking(false);
    }
  };

  const toggleBlock = async () => {
    setWorking(true);
    try {
      if (blocked) await usersApi.unblockUser(cleanId);
      else await usersApi.blockUser(cleanId);
      setBlocked(!blocked);
      addToast(blocked ? `${name} unblocked` : `${name} blocked`, "success");
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not update block status", "error");
    } finally {
      setWorking(false);
      setShowBlockConfirm(false);
    }
  };

  const openMessage = async () => {
    setWorking(true);
    try {
      const conversation = await streamApi.getOrCreateDm(cleanId);
      onClose();
      navigate(`/chat?mode=dms&conv=${encodeURIComponent(conversation.channelId)}`);
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not open this direct message", "error");
    } finally {
      setWorking(false);
    }
  };

  const startCall = async (isVideo: boolean) => {
    setWorking(true);
    try {
      const conversation = await streamApi.getOrCreateDm(cleanId);
      onClose();
      callSignalingService.initiateCall({
        targetUserId: conversation.targetUser.id,
        targetUserName: profile?.fullName || fallbackName || conversation.targetUser.name,
        targetUserAvatar: profile?.profilePicture || fallbackAvatar || conversation.targetUser.image,
        channelId: conversation.channelId,
        isVideo
      });
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not start this call", "error");
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (!showPhoto) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setShowPhoto(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPhoto]);

  const relationshipLabel = friendship?.status === "PENDING_SENT" ? "Request sent" : "Add friend";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[65] flex justify-end bg-black/35" onClick={onClose}>
            <motion.aside
              role="dialog" aria-modal="true" aria-label={`${name} contact information`}
              onClick={(event) => event.stopPropagation()}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-[#0D1524] dark:text-slate-100"
            >
              <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#0D1524]/95">
                <h2 className="font-semibold">Contact info</h2>
                <button onClick={onClose} aria-label="Close contact information" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
              </header>
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <button type="button" onClick={() => photo && setShowPhoto(true)} aria-label={photo ? `View ${name}'s profile photo` : undefined} className={`mb-4 h-28 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${photo ? "cursor-zoom-in" : "cursor-default"}`}>
                    {photo ? <img src={photo} alt={`${name} profile`} className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-7 h-14 w-14 text-slate-400" />}
                  </button>
                  <h3 className="text-xl font-bold">{name}</h3>
                  {profile?.rollNumber && <p className="mt-1 text-sm text-slate-500">{profile.rollNumber}</p>}
                  {contextLabel && <p className="mt-2 text-xs text-slate-500">Viewing from {contextLabel}</p>}
                </div>

                <div className={`mt-5 grid w-full ${onSearchInChat ? "grid-cols-4" : "grid-cols-3"} gap-2`}>
                  <button disabled={working} onClick={openMessage} className="rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><MessageSquare className="mx-auto mb-1 h-4 w-4" />Message</button>
                  <button disabled={working} onClick={() => startCall(false)} className="rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Phone className="mx-auto mb-1 h-4 w-4" />Voice</button>
                  <button disabled={working} onClick={() => startCall(true)} className="rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Video className="mx-auto mb-1 h-4 w-4" />Video</button>
                  {onSearchInChat && <button onClick={() => { onClose(); onSearchInChat(); }} className="rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Search className="mx-auto mb-1 h-4 w-4" />Search</button>}
                </div>

                {profileQuery.isLoading ? (
                  <div className="mt-8 flex justify-center text-[#1E90FF]"><Loader2 className="animate-spin" /></div>
                ) : profileQuery.isError ? (
                  <div className="mt-8 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800/50">
                    Profile information is unavailable or restricted.
                    <button onClick={() => profileQuery.refetch()} className="mt-2 block w-full font-semibold text-[#1E90FF]">Try again</button>
                  </div>
                ) : profile && (
                  <div className="mt-7 space-y-4">
                    <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">About</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{profile.bio?.trim() || <span className="text-slate-400">No About information</span>}</p>
                    </section>
                    <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Academic profile</p>
                      <p className="mt-2 text-sm">{profile.department || "Department not provided"}</p>
                      {profile.academicYear != null && <p className="mt-1 text-xs text-slate-500">Year {profile.academicYear}</p>}
                    </section>
                  </div>
                )}
                <div className="mt-5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {friendship?.status === "SELF" ? <button disabled className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold dark:border-slate-700">You</button>
                    : friendship?.status === "PENDING_RECEIVED" ? <button disabled={working} onClick={() => runRelationshipAction("accept")} className="rounded-xl bg-[#1E90FF] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Accept request</button>
                    : friendship?.status === "FRIENDS" ? <button disabled={working} onClick={() => { if (window.confirm(`Remove ${name} from your friends?`)) void runRelationshipAction("remove"); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold dark:border-slate-700">Remove friend</button>
                    : <button disabled={working || friendship?.status === "PENDING_SENT" || !friendship} onClick={() => runRelationshipAction("request")} className="rounded-xl bg-[#1E90FF] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{relationshipLabel}</button>}
                    <button disabled={working} onClick={() => setShowReport(true)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold dark:border-slate-700"><Flag className="mr-1 inline h-4 w-4" />Report</button>
                  </div>
                  {(friendship?.status === "PENDING_RECEIVED" || friendship?.status === "PENDING_SENT") && <button disabled={working} onClick={() => runRelationshipAction(friendship.status === "PENDING_RECEIVED" ? "decline" : "cancel")} className="w-full text-xs font-medium text-slate-500 hover:text-rose-500">{friendship.status === "PENDING_RECEIVED" ? "Decline request" : "Cancel sent request"}</button>}
                  {friendship?.status !== "SELF" && <button disabled={working} onClick={() => setShowBlockConfirm(true)} className="w-full rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:border-rose-900/60 dark:text-rose-400"><Ban className="mr-2 inline h-4 w-4" />{blocked ? "Unblock contact" : "Block contact"}</button>}
                  <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/40"><ShieldCheck size={15} className="mt-0.5 shrink-0" /> Only profile details returned by StudyConnect's public profile endpoint are shown. Phone number and username are not available in the current account model. Photo visibility controls are not implemented as server-side profile privacy preferences.</div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {showPhoto && photo && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowPhoto(false)}><button className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white" aria-label="Close photo preview"><X /></button><img src={photo} alt={`${name} profile photo enlarged`} className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} /></div>}
      {showBlockConfirm && <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBlockConfirm(false)}><div role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#0D1524]"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="text-rose-500" />{blocked ? `Unblock ${name}?` : `Block ${name}?`}</div><p className="my-3 text-sm text-slate-500">{blocked ? "This contact will be able to interact with you again under StudyConnect's block rules." : "StudyConnect will apply its existing block policy to direct messages and calls."}</p><div className="flex justify-end gap-2"><button onClick={() => setShowBlockConfirm(false)} className="rounded-lg px-3 py-2 text-sm">Cancel</button><button disabled={working} onClick={toggleBlock} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{working ? "Saving…" : blocked ? "Unblock" : "Block"}</button></div></div></div>}
      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} targetType="USER" targetId={cleanId} targetTitle={name} />
    </>
  );
}
