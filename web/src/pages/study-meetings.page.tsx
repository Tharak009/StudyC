import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, CameraOff, CalendarDays, Clock3, Copy, DoorOpen, Loader2, MessageSquareText, Mic, MicOff, MonitorUp, Pencil, Plus, Search, Settings2, Users, X } from "lucide-react";
import { Chat, Channel, Window, MessageList, MessageComposer } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import { studyMeetingsApi, type StudyMeeting, type StudyMeetingParticipant } from "../api/study-meetings.api";
import { useStreamChat } from "../hooks/useStreamChat";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { mediaDeviceManager } from "../services/media-device.service";
import { LiveKitGroupMediaManager } from "../services/group-webrtc.service";
import { useCallStore } from "../store/call.store";
import type { MediaDeviceInfo } from "../types/call.types";
import { StudyMeetingPreJoin, type PreJoinPreferences } from "../components/meetings/StudyMeetingPreJoin";

const fieldClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#1E90FF] dark:border-white/10 dark:bg-[#080D1A]";
const dateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const displayDateTime = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not set";

type MediaUi = { stream?: MediaStream; audioEnabled?: boolean; videoEnabled?: boolean };
type ScreenShareUi = { name: string; stream: MediaStream; local: boolean };

function SharedScreen({ share }: { share: ScreenShareUi }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) videoElement.srcObject = share.stream;
    return () => { if (videoElement) videoElement.srcObject = null; };
  }, [share.stream]);
  return (
    <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-white/10 sm:min-h-[360px]">
      <video ref={videoRef} autoPlay playsInline muted className="max-h-[min(68vh,760px)] w-full object-contain" />
      <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">{share.name}{share.local ? " (You)" : ""} is sharing</div>
    </div>
  );
}

function ParticipantMedia({ participant, media, local, audioOutputId, speaking, onAudioElement, onAudioPlaybackBlocked }: { participant: StudyMeetingParticipant; media?: MediaUi; local?: boolean; audioOutputId?: string; speaking?: boolean; onAudioElement?: (participantId: string, element: HTMLAudioElement | null) => void; onAudioPlaybackBlocked?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useCallback((element: HTMLAudioElement | null) => {
    audioElementRef.current = element;
    onAudioElement?.(participant.userId, element);
  }, [onAudioElement, participant.userId]);
  const hasVideo = Boolean(media?.videoEnabled && media.stream?.getVideoTracks().length);
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) videoElement.srcObject = media?.stream || null;
    const audioElement = audioElementRef.current;
    if (audioElement) {
      audioElement.srcObject = media?.stream || null;
      if (!local && media?.stream?.getAudioTracks().length) {
        void audioElement.play().catch(() => onAudioPlaybackBlocked?.());
      }
    }
    return () => {
      if (videoElement) videoElement.srcObject = null;
      if (audioElement) audioElement.srcObject = null;
    };
  }, [media?.stream, hasVideo, local, onAudioPlaybackBlocked, participant.userId]);
  useEffect(() => {
    if (!local && audioElementRef.current && audioOutputId) {
      void mediaDeviceManager.switchAudioOutputDevice(audioElementRef.current, audioOutputId);
    }
  }, [audioOutputId, local]);
  return (
    <div className={`relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border bg-slate-100 transition-colors dark:bg-[#0B132B] ${speaking ? "border-[#1E90FF] ring-2 ring-[#1E90FF]/35" : "border-slate-200 dark:border-white/10"}`}>
      {hasVideo ? <video ref={videoRef} autoPlay playsInline muted className={`h-full min-h-44 w-full object-cover ${local ? "-scale-x-100" : ""}`} /> : (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          {participant.avatar ? <img src={participant.avatar} alt="" className="size-16 rounded-full object-cover" /> : <div className="flex size-16 items-center justify-center rounded-full bg-[#1E90FF]/15 text-xl font-bold text-[#1E90FF]">{participant.name.slice(0, 1).toUpperCase()}</div>}
          <span className="max-w-full truncate text-sm font-semibold">{participant.name}{local ? " (You)" : ""}</span>
        </div>
      )}
      {!local && <audio ref={audioRef} data-participant-id={participant.userId} autoPlay className="hidden" />}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
        {media?.audioEnabled === true ? <Mic size={13} /> : media?.audioEnabled === false ? <MicOff size={13} /> : <Mic size={13} className="opacity-50" />}
        <span>{participant.name}{local ? " (You)" : ""}</span>
      </div>
      {speaking && <span className="absolute bottom-2 right-2 rounded-full bg-[#1E90FF] px-2 py-1 text-[10px] font-semibold text-white">Speaking</span>}
      {participant.role === "HOST" && <span className="absolute right-2 top-2 rounded-full bg-amber-400/90 px-2 py-1 text-[10px] font-bold text-slate-950">Host</span>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">{text}</div>;
}

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (updater: (page: number) => number) => void }) {
  return <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10">Previous</button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10">Next</button></div></div>;
}

export function StudyMeetingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { client, connectionStatus } = useStreamChat();
  const addToast = useToastStore((state) => state.addToast);
  const callStatus = useCallStore((state) => state.status);
  const routeInviteCode = new URLSearchParams(location.search).get("invite") || (location.state as any)?.inviteCode;
  const initialDashboardFilters = (location.state as any)?.dashboardFilters || {};
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState<StudyMeeting["access"]>("PUBLIC");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [mediaType, setMediaType] = useState<StudyMeeting["mediaType"]>("voice");
  const [capacity, setCapacity] = useState(12);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledStartLocal, setScheduledStartLocal] = useState("");
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState(60);
  const [creating, setCreating] = useState(false);
  const createRequestIdRef = useRef(crypto.randomUUID());
  const [createdInvitation, setCreatedInvitation] = useState<{ meetingId: string; title: string; code: string } | null>(null);
  const [listStatus, setListStatus] = useState<"WAITING" | "ACTIVE" | "ENDED" | "CANCELLED" | "HISTORY">(initialDashboardFilters.listStatus || "WAITING");
  const [listScope, setListScope] = useState<"all" | "organized" | "attending">(initialDashboardFilters.listScope || "all");
  const [searchInput, setSearchInput] = useState(initialDashboardFilters.searchInput || "");
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(initialDashboardFilters.listPage || 1);
  const [historyPage, setHistoryPage] = useState(initialDashboardFilters.historyPage || 1);
  const [editDraft, setEditDraft] = useState<{ id: string; title: string; subject: string; description: string; scheduledStartAt: string; expectedDurationMinutes: number | null; capacity: number; access: StudyMeeting["access"]; waitingRoomEnabled: boolean; updatedAt: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [resolvingInvitation, setResolvingInvitation] = useState(false);
  const [admissionActionId, setAdmissionActionId] = useState<string | null>(null);
  const dashboardReturnState = { dashboardFilters: { listStatus, listScope, searchInput, listPage, historyPage } };
  const [joinedMeeting, setJoinedMeeting] = useState<StudyMeeting | null>(null);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "failed">("idle");
  const [entryStage, setEntryStage] = useState<"idle" | "checking" | "media" | "connecting">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [cancellingAdmission, setCancellingAdmission] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<string>("good");
  const [mediaByParticipant, setMediaByParticipant] = useState<Record<string, MediaUi>>({});
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([]);
  const [participantPanelOpen, setParticipantPanelOpen] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [endingMeeting, setEndingMeeting] = useState(false);
  const [leavingMeeting, setLeavingMeeting] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const terminalRedirectRef = useRef<string | null>(null);
  const [screenShares, setScreenShares] = useState<Record<string, ScreenShareUi>>({});
  const [startingScreenShare, setStartingScreenShare] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [meetingLayout, setMeetingLayout] = useState<"shared" | "gallery">("gallery");
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatRetryKey, setChatRetryKey] = useState(0);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedVideoInput, setSelectedVideoInput] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");
  const [switchingDevice, setSwitchingDevice] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [streamChannel, setStreamChannel] = useState<StreamChannel | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const liveKitRef = useRef<LiveKitGroupMediaManager | null>(null);
  const remoteAudioElementsRef = useRef(new Map<string, HTMLAudioElement>());
  const activeMeetingIdRef = useRef<string | null>(null);
  const roomUnmountedRef = useRef(false);
  const joiningMeetingRef = useRef(false);
  const joinAttemptRef = useRef(0);
  const routeMeetingIdRef = useRef<string | null>(id || null);
  const registerRemoteAudioElement = useCallback((participantId: string, element: HTMLAudioElement | null) => {
    if (element) remoteAudioElementsRef.current.set(participantId, element);
    else remoteAudioElementsRef.current.delete(participantId);
  }, []);
  const notifyAudioPlaybackBlocked = useCallback(() => setAudioPlaybackBlocked(true), []);
  const resumeRemoteAudio = async () => {
    const results = await Promise.all(Array.from(remoteAudioElementsRef.current.values(), (element) => element.play().then(() => true).catch(() => false)));
    setAudioPlaybackBlocked(results.some((played) => !played));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setListPage(1); setHistoryPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const meetingsQuery = useQuery({
    queryKey: ["study-meetings", listStatus, listScope, search, listPage],
    queryFn: () => studyMeetingsApi.list({ status: listStatus === "HISTORY" ? "ENDED" : listStatus, scope: listScope, search, page: listPage, limit: 20 }),
    enabled: !id && listStatus !== "HISTORY"
  });
  const historyQuery = useQuery({ queryKey: ["study-meeting-history", historyPage, search], queryFn: () => studyMeetingsApi.history({ page: historyPage, limit: 20, search }), enabled: !id && listStatus === "HISTORY" });
  const meetingQuery = useQuery({ queryKey: ["study-meeting", id, routeInviteCode], queryFn: () => studyMeetingsApi.get(id!, routeInviteCode || undefined), enabled: Boolean(id), refetchInterval: (query) => joinedMeeting && !["ENDED", "CANCELLED"].includes(query.state.data?.status || "") ? 5000 : false });
  const inviteCode = routeInviteCode || meetingQuery.data?.inviteCode;
  const meeting = joinedMeeting || meetingQuery.data || null;
  const isHost = Boolean(meeting && currentUser?._id === meeting.createdBy);
  const admissionStatusQuery = useQuery({ queryKey: ["study-meeting-admission-status", id], queryFn: () => studyMeetingsApi.admissionStatus(id!), enabled: Boolean(id && meeting?.waitingRoomEnabled && !joinedMeeting), refetchInterval: 5000 });
  const admissionRequestsQuery = useQuery({ queryKey: ["study-meeting-admission-requests", id], queryFn: () => studyMeetingsApi.admissionRequests(id!), enabled: Boolean(id && meeting?.waitingRoomEnabled && isHost), refetchInterval: 5000 });
  const participants = useMemo(() => meeting?.participants.filter((p) => p.state === "JOINED") || [], [meeting]);
  const supportsAudioOutputSelection = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  useEffect(() => {
    if (!joinedMeeting) return;
    let mounted = true;
    const refreshDevices = async () => {
      const devices = await mediaDeviceManager.enumerateDevices();
      if (!mounted) return;
      setAudioInputs(devices.audioInputs);
      setVideoInputs(devices.videoInputs);
      setAudioOutputs(devices.audioOutputs);
      setSelectedAudioInput((current) => devices.audioInputs.some((device) => device.deviceId === current) ? current : mediaDeviceManager.getLocalStream()?.getAudioTracks()[0]?.getSettings().deviceId || devices.audioInputs[0]?.deviceId || "");
      setSelectedVideoInput((current) => devices.videoInputs.some((device) => device.deviceId === current) ? current : mediaDeviceManager.getLocalStream()?.getVideoTracks()[0]?.getSettings().deviceId || devices.videoInputs[0]?.deviceId || "");
      setSelectedAudioOutput((current) => devices.audioOutputs.some((device) => device.deviceId === current) ? current : devices.audioOutputs.some((device) => device.deviceId === mediaDeviceManager.currentAudioOutputId) ? mediaDeviceManager.currentAudioOutputId! : devices.audioOutputs[0]?.deviceId || "");
    };
    void refreshDevices();
    const unsubscribe = mediaDeviceManager.onDeviceChange(() => { void refreshDevices(); });
    return () => { mounted = false; unsubscribe(); };
  }, [joinedMeeting]);

  useEffect(() => {
    if (!joinedMeeting || !id) return;
    let active = true;
    const refreshPresence = () => {
      void studyMeetingsApi.heartbeat(id).catch((error: any) => {
        if (active && error?.response?.status === 403) {
          addToast("Your meeting participation has ended. Rejoin to continue.", "warning");
          void stopMeetingMedia(false);
        }
      });
    };
    refreshPresence();
    const timer = window.setInterval(refreshPresence, 20_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [joinedMeeting?._id, id]);

  useEffect(() => {
    roomUnmountedRef.current = false;
    return () => {
      roomUnmountedRef.current = true;
      joinAttemptRef.current += 1;
      const meetingId = activeMeetingIdRef.current;
      activeMeetingIdRef.current = null;
      liveKitRef.current?.close();
      liveKitRef.current = null;
      mediaDeviceManager.stopLocalMedia();
      if (meetingId) void studyMeetingsApi.leave(meetingId).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const previousId = routeMeetingIdRef.current;
    if (previousId === (id || null)) return;
    routeMeetingIdRef.current = id || null;
    const attemptId = ++joinAttemptRef.current;
    if (previousId) void studyMeetingsApi.leave(previousId).catch(() => undefined);
    activeMeetingIdRef.current = null;
    liveKitRef.current?.close();
    liveKitRef.current = null;
    mediaDeviceManager.stopLocalMedia();
    setJoinedMeeting(null);
    setConnectionState(joiningMeetingRef.current ? "connecting" : "idle");
    if (!joiningMeetingRef.current) setEntryStage("idle");
    setJoinError(null);
    setMediaByParticipant({});
    setScreenShares({});
    return () => {
      if (joinAttemptRef.current === attemptId) joinAttemptRef.current += 1;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !meeting?.streamChannelId || !client || connectionStatus !== "connected") return;
    if (!joinedMeeting) {
      setStreamChannel(null);
      setStreamError(null);
      return;
    }
    let mounted = true;
    let watchedChannel: StreamChannel | null = null;
    setStreamChannel(null);
    setStreamError(null);
    const load = async () => {
      try {
        const channel = client.channel("messaging", meeting.streamChannelId);
        await channel.watch();
        watchedChannel = channel;
        if (mounted) setStreamChannel(channel);
        else await channel.stopWatching();
      } catch (error: any) {
        if (mounted) setStreamError(error?.message || "Meeting chat could not be opened.");
      }
    };
    void load();
    return () => {
      mounted = false;
      if (watchedChannel) void watchedChannel.stopWatching().catch(() => undefined);
    };
  }, [id, meeting?.streamChannelId, client, connectionStatus, joinedMeeting?._id, chatRetryKey]);

  const hasScreenShares = Object.keys(screenShares).length > 0;
  useEffect(() => {
    // Show a new share immediately, then restore the gallery after the last share ends.
    setMeetingLayout(hasScreenShares ? "shared" : "gallery");
  }, [hasScreenShares]);

  const enterMeeting = async (preferences: PreJoinPreferences) => {
    if (!id) return;
    if (joiningMeetingRef.current || (joinedMeeting && connectionState !== "failed")) return;
    if (callStatus !== "IDLE") { addToast("Leave your current call before joining a study meeting.", "warning"); return; }
    const attemptId = ++joinAttemptRef.current;
    let attemptStream: MediaStream | null = null;
    let attemptManager: LiveKitGroupMediaManager | null = null;
    joiningMeetingRef.current = true;
    setJoinError(null);
    setEntryStage("checking");
    try {
      const result = await studyMeetingsApi.join(id, inviteCode || undefined);
      if ("admissionRequired" in result) {
        if (attemptId !== joinAttemptRef.current || roomUnmountedRef.current) return;
        setEntryStage("idle");
        await queryClient.invalidateQueries({ queryKey: ["study-meeting-admission-status", id] });
        addToast("Your request was sent to the host.", "success");
        return;
      }
      if (roomUnmountedRef.current || attemptId !== joinAttemptRef.current) {
        await studyMeetingsApi.leave(id).catch(() => undefined);
        return;
      }
      activeMeetingIdRef.current = id;
      setJoinedMeeting(result.meeting);
      setEntryStage("media");
      setSelectedAudioInput(preferences.audioInputId);
      setSelectedVideoInput(preferences.videoInputId);
      setSelectedAudioOutput(preferences.audioOutputId);
      const media = await mediaDeviceManager.acquireMedia(true, result.meeting.mediaType === "video" && preferences.cameraEnabled, {
        audioDeviceId: preferences.audioInputId || undefined,
        videoDeviceId: preferences.videoInputId || undefined
      });
      attemptStream = media.stream;
      if (roomUnmountedRef.current || attemptId !== joinAttemptRef.current) {
        media.stream.getTracks().forEach((track) => track.stop());
        if (mediaDeviceManager.getLocalStream() === media.stream) mediaDeviceManager.stopLocalMedia();
        activeMeetingIdRef.current = null;
        await studyMeetingsApi.leave(id).catch(() => undefined);
        return;
      }
      const stream = media.stream;
      stream.getAudioTracks().forEach((track) => { track.enabled = preferences.microphoneEnabled; });
      stream.getVideoTracks().forEach((track) => { track.enabled = preferences.cameraEnabled; });
      if (media.degradedToVoice && preferences.cameraEnabled) {
        addToast("Camera could not start. You joined with microphone audio; you can retry the camera in the meeting.", "warning");
      }
      const localMic = stream.getAudioTracks()[0]?.enabled ?? false;
      const localCamera = stream.getVideoTracks()[0]?.enabled ?? false;
      setMicEnabled(localMic);
      setCameraEnabled(localCamera);
      setSelectedAudioInput(stream.getAudioTracks()[0]?.getSettings().deviceId || preferences.audioInputId);
      setSelectedVideoInput(stream.getVideoTracks()[0]?.getSettings().deviceId || preferences.videoInputId);
      void mediaDeviceManager.enumerateDevices().then((availableDevices) => {
        if (!roomUnmountedRef.current && attemptId === joinAttemptRef.current) {
          setAudioInputs(availableDevices.audioInputs);
          setVideoInputs(availableDevices.videoInputs);
          setAudioOutputs(availableDevices.audioOutputs);
        }
      });
      const manager = new LiveKitGroupMediaManager();
      attemptManager = manager;
      manager.initialize([], {
        onParticipantStream: (participantId, participantStream) => setMediaByParticipant((previous) => ({ ...previous, [participantId]: { ...previous[participantId], stream: participantStream } })),
        onParticipantStreamRemoved: (participantId) => setMediaByParticipant((previous) => { const next = { ...previous }; delete next[participantId]; return next; }),
        onScreenShareChanged: (participantId, participantName, stream, local) => {
          if (stream) setScreenShareError(null);
          setScreenShares((previous) => {
            if (!stream) { const next = { ...previous }; delete next[participantId]; return next; }
            return { ...previous, [participantId]: { name: participantName, stream, local } };
          });
        },
        onScreenShareError: (_participantId, participantName) => setScreenShareError(`Could not receive ${participantName}'s shared screen. It may have ended or the connection may be interrupted.`),
        onParticipantMediaState: (participantId, audioEnabled, videoEnabled) => {
          setMediaByParticipant((previous) => ({ ...previous, [participantId]: { ...previous[participantId], audioEnabled, videoEnabled } }));
          setJoinedMeeting((previous) => previous ? ({ ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, audioEnabled, videoEnabled } : participant) }) : previous);
        },
        onParticipantConnected: (participantId, name, role) => setJoinedMeeting((previous) => {
          if (!previous) return previous;
          // A provider reconnect event cannot reopen a participation period that
          // the backend has already ended; joining again requires a fresh API authorization.
          if (previous.participants.some((participant) => participant.userId === participantId && participant.state === "LEFT")) return previous;
          if (previous.participants.some((participant) => participant.userId === participantId && participant.state === "JOINED")) {
            return { ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, name, connectionState: "CONNECTED" } : participant) };
          }
          const participant: StudyMeetingParticipant = {
            userId: participantId,
            name,
            role: role === "HOST" ? "HOST" : "PARTICIPANT",
            state: "JOINED",
            joinedAt: new Date().toISOString(),
            // The provider's publication/mute event immediately supplies the
            // actual state. Until then, never claim the microphone is live.
            audioEnabled: false,
            videoEnabled: false,
            connectionState: "CONNECTED"
          };
          return { ...previous, participants: [...previous.participants, participant] };
        }),
        // A LiveKit disconnect can be temporary. Keep the durable meeting
        // membership joined while the transport reconnects; only the explicit
        // leave flow should change the participant to LEFT.
        onParticipantDisconnected: (participantId) => {
          setActiveSpeakerIds((previous) => previous.filter((id) => id !== participantId));
          setJoinedMeeting((previous) => previous ? ({ ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, connectionState: "RECONNECTING" } : participant) }) : previous);
        },
        onActiveSpeakerChange: setActiveSpeakerIds,
        onConnectionStateChange: (state) => {
          setConnectionState(state);
          if (id === activeMeetingIdRef.current && currentUser?._id) {
            setJoinedMeeting((previous) => previous ? ({ ...previous, participants: previous.participants.map((participant) => participant.userId === currentUser._id ? { ...participant, connectionState: state === "connected" ? "CONNECTED" : state === "reconnecting" ? "RECONNECTING" : participant.connectionState } : participant) }) : previous);
          }
          if (state === "connected" || state === "reconnecting") {
            void studyMeetingsApi.connectionState(id, state === "connected" ? "CONNECTED" : "RECONNECTING").catch(() => undefined);
          }
        },
        onNetworkQualityChange: setNetworkQuality
      });
      manager.setLocalStream(stream);
      liveKitRef.current = manager;
      setEntryStage("connecting");
      await manager.connect(result.media.url, result.media.token, result.media.canPublish);
      if (roomUnmountedRef.current || attemptId !== joinAttemptRef.current) {
        manager.close();
        if (liveKitRef.current === manager) liveKitRef.current = null;
        if (mediaDeviceManager.getLocalStream() === stream) mediaDeviceManager.stopLocalMedia();
        await studyMeetingsApi.leave(id).catch(() => undefined);
        return;
      }
      const connectedMeeting = await studyMeetingsApi.connected(id);
      if (roomUnmountedRef.current || attemptId !== joinAttemptRef.current) {
        manager.close();
        if (liveKitRef.current === manager) liveKitRef.current = null;
        if (mediaDeviceManager.getLocalStream() === stream) mediaDeviceManager.stopLocalMedia();
        await studyMeetingsApi.leave(id).catch(() => undefined);
        return;
      }
      setJoinedMeeting((previous) => previous ? ({ ...previous, status: connectedMeeting.status, participants: previous.participants.map((participant) => participant.userId === currentUser?._id ? { ...participant, connectionState: "CONNECTED" } : participant) }) : connectedMeeting);
      setConnectionState("connected");
      setEntryStage("idle");
      const actualMediaState = manager.getLocalMediaState();
      setMicEnabled(actualMediaState.audioEnabled);
      setCameraEnabled(actualMediaState.videoEnabled);
      const mediaStateMeeting = await studyMeetingsApi.updateMediaState(id, actualMediaState).catch(() => null);
      if (mediaStateMeeting) setJoinedMeeting(mediaStateMeeting);
      await queryClient.invalidateQueries({ queryKey: ["study-meetings"] });
    } catch (error: any) {
      if (attemptManager) attemptManager.close();
      if (liveKitRef.current === attemptManager) liveKitRef.current = null;
      if (attemptStream && mediaDeviceManager.getLocalStream() === attemptStream) mediaDeviceManager.stopLocalMedia();
      await studyMeetingsApi.leave(id).catch(() => undefined);
      if (activeMeetingIdRef.current === id) activeMeetingIdRef.current = null;
      if (!roomUnmountedRef.current && attemptId === joinAttemptRef.current) {
        setJoinedMeeting(null);
        setConnectionState("failed");
        setEntryStage("idle");
        setJoinError(error?.response?.data?.message || error?.message || "Could not join the meeting.");
        addToast(error?.response?.data?.message || error?.message || "Could not join the meeting.", "error");
      }
    } finally {
      joiningMeetingRef.current = false;
      if (!roomUnmountedRef.current && attemptId !== joinAttemptRef.current && routeMeetingIdRef.current !== id) {
        setConnectionState("idle");
        setEntryStage("idle");
      }
    }
  };

  const stopMeetingMedia = async (leaveBackend: boolean) => {
    const meetingId = activeMeetingIdRef.current || id;
    activeMeetingIdRef.current = null;
    liveKitRef.current?.close();
    liveKitRef.current = null;
    mediaDeviceManager.stopLocalMedia();
    setMediaByParticipant({});
    setActiveSpeakerIds([]);
    setAudioPlaybackBlocked(false);
    remoteAudioElementsRef.current.clear();
    setScreenShares({});
    setScreenShareError(null);
    setChatPanelOpen(false);
    setParticipantPanelOpen(false);
    setShowDeviceSettings(false);
    setJoinedMeeting(null);
    setConnectionState("idle");
    setEntryStage("idle");
    if (leaveBackend && meetingId) await studyMeetingsApi.leave(meetingId).catch(() => undefined);
  };

  useEffect(() => {
    const latest = meetingQuery.data;
    if (!id || !joinedMeeting || !latest || !["ENDED", "CANCELLED"].includes(latest.status) || terminalRedirectRef.current === id) return;
    terminalRedirectRef.current = id;
    void stopMeetingMedia(false).finally(() => {
      addToast(latest.status === "CANCELLED" ? "This meeting was cancelled by its organizer." : "The host ended this meeting.", "warning");
      navigate("/study-meetings", { state: dashboardReturnState });
    });
  }, [id, joinedMeeting, meetingQuery.data, navigate]);

  const syncLocalMediaState = async (manager: LiveKitGroupMediaManager) => {
    const state = manager.getLocalMediaState();
    setMicEnabled(state.audioEnabled);
    setCameraEnabled(state.videoEnabled);
    if (!id) return;
    const updated = await studyMeetingsApi.updateMediaState(id, state);
    setJoinedMeeting(updated);
  };

  const toggleMicrophone = async () => {
    const manager = liveKitRef.current;
    if (!manager) return;
    try {
      await manager.setMicrophoneEnabled(!micEnabled);
      await syncLocalMediaState(manager);
    } catch (error: any) {
      const actual = manager.getLocalMediaState();
      setMicEnabled(actual.audioEnabled);
      addToast(error?.message || "Could not update microphone state.", "error");
    }
  };

  const toggleCamera = async () => {
    const manager = liveKitRef.current;
    if (!manager) return;
    try {
      if (!cameraEnabled && !mediaDeviceManager.getLocalStream()?.getVideoTracks().some((track) => track.readyState === "live")) {
        const track = await mediaDeviceManager.reacquireVideoTrack(selectedVideoInput || undefined);
        if (!track) throw new Error("Camera could not start. Check browser permission and choose another device.");
        track.enabled = true;
        await manager.replaceVideoTrack(track);
      } else {
        await manager.setCameraEnabled(!cameraEnabled);
      }
      await syncLocalMediaState(manager);
    } catch (error: any) {
      const actual = manager.getLocalMediaState();
      setCameraEnabled(actual.videoEnabled);
      addToast(error?.message || "Could not update camera state.", "error");
    }
  };

  const createMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating || title.trim().length < 2) return;
    const scheduledAt = scheduleLater ? new Date(scheduledStartLocal) : null;
    if (scheduleLater && (!scheduledStartLocal || !scheduledAt || !Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now())) {
      addToast("Choose a valid future date and time for this meeting.", "error");
      return;
    }
    setCreating(true);
    try {
      const result = await studyMeetingsApi.create({ title: title.trim(), subject: subject.trim(), description: description.trim(), access, mediaType, capacity, waitingRoomEnabled, scheduledStartAt: scheduledAt?.toISOString() || null, expectedDurationMinutes: scheduleLater ? expectedDurationMinutes : null, requestId: createRequestIdRef.current });
      createRequestIdRef.current = crypto.randomUUID();
      await queryClient.invalidateQueries({ queryKey: ["study-meetings"] });
      if (result.meeting.scheduledStartAt) {
        if (result.inviteCode) setCreatedInvitation({ meetingId: result.meeting._id, title: result.meeting.title, code: result.inviteCode });
        addToast("Meeting scheduled.", "success");
        setTitle(""); setSubject(""); setDescription(""); setScheduledStartLocal(""); setScheduleLater(false); setWaitingRoomEnabled(false);
        setListStatus("WAITING");
      } else {
        navigate(`/study-meetings/${result.meeting._id}${result.inviteCode ? `?invite=${encodeURIComponent(result.inviteCode)}` : ""}`, { state: { inviteCode: result.inviteCode, ...dashboardReturnState } });
      }
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not create the study meeting.", "error");
    } finally { setCreating(false); }
  };

  const saveMeetingEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editDraft || savingEdit) return;
    const scheduledAt = new Date(editDraft.scheduledStartAt);
    if (!editDraft.scheduledStartAt || !Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      addToast("Choose a valid future date and time.", "error"); return;
    }
    setSavingEdit(true);
    try {
      const updatedMeeting = await studyMeetingsApi.update(editDraft.id, {
        title: editDraft.title.trim(), subject: editDraft.subject.trim(), description: editDraft.description.trim(),
        scheduledStartAt: scheduledAt.toISOString(), expectedDurationMinutes: editDraft.expectedDurationMinutes,
        capacity: editDraft.capacity, access: editDraft.access, waitingRoomEnabled: editDraft.waitingRoomEnabled, expectedUpdatedAt: editDraft.updatedAt
      });
      await queryClient.invalidateQueries({ queryKey: ["study-meetings"] });
      setEditDraft(null); if(updatedMeeting.inviteCode) setCreatedInvitation({meetingId:updatedMeeting._id,title:updatedMeeting.title,code:updatedMeeting.inviteCode}); addToast("Scheduled meeting updated.", "success");
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not update the scheduled meeting.", "error");
    } finally { setSavingEdit(false); }
  };

  const cancelMeeting = async (item: StudyMeeting) => {
    if (!window.confirm(`Cancel “${item.title}”? Participants will no longer be able to join.`)) return;
    setCancellingId(item._id);
    try {
      await studyMeetingsApi.cancel(item._id);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["study-meetings"] }), queryClient.invalidateQueries({ queryKey: ["study-meeting-history"] })]);
      addToast("Meeting cancelled.", "success");
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not cancel the meeting.", "error");
      await queryClient.invalidateQueries({ queryKey: ["study-meetings"] });
    } finally { setCancellingId(null); }
  };

  const resolveInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (resolvingInvitation || !joinCodeInput.trim()) return;
    let code = joinCodeInput.trim();
    if (code.includes("/") || code.includes("://")) {
      try {
        const url = new URL(code, window.location.origin);
        code = url.searchParams.get("invite")?.trim() || "";
      } catch { code = ""; }
    }
    if (!code) { addToast("Enter an invitation code or a valid StudyConnect invitation link.", "error"); return; }
    setResolvingInvitation(true);
    try {
      const resolved = await studyMeetingsApi.resolveInvitation(code);
      setJoinCodeOpen(false);
      setJoinCodeInput("");
      navigate(`/study-meetings/${resolved.meetingId}?invite=${encodeURIComponent(code)}`, { state: dashboardReturnState });
    } catch (error: any) {
      addToast(error?.response?.data?.message || "This invitation is invalid or unavailable.", "error");
    } finally { setResolvingInvitation(false); }
  };

  const decideAdmission = async (requesterId: string, decision: "APPROVED" | "REJECTED") => {
    if (!id || admissionActionId) return;
    setAdmissionActionId(requesterId);
    try {
      await studyMeetingsApi.decideAdmission(id, requesterId, decision);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["study-meeting-admission-requests", id] }),
        queryClient.invalidateQueries({ queryKey: ["study-meeting-admission-status", id] })
      ]);
      addToast(decision === "APPROVED" ? "Participant approved. They can now join." : "Request declined.", "success");
    } catch (error: any) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["study-meeting-admission-requests", id] }),
        queryClient.invalidateQueries({ queryKey: ["study-meeting-admission-status", id] })
      ]);
      addToast(error?.response?.data?.message || "Could not update this admission request.", "error");
    } finally { setAdmissionActionId(null); }
  };

  const removeMeetingParticipant = async (participant: StudyMeetingParticipant) => {
    if (!id || !isHost || removingParticipantId || participant.userId === currentUser?._id) return;
    if (!window.confirm(`Remove ${participant.name} from this meeting? They will be blocked from rejoining.`)) return;
    setRemovingParticipantId(participant.userId);
    try {
      const updated = await studyMeetingsApi.removeParticipant(id, participant.userId);
      setJoinedMeeting(updated);
      await queryClient.invalidateQueries({ queryKey: ["study-meeting", id] });
      addToast(`${participant.name} was removed from the meeting.`, "success");
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === "PARTICIPANT_CLEANUP_PENDING") {
        const latest = await studyMeetingsApi.get(id, routeInviteCode || undefined).catch(() => null);
        if (latest) setJoinedMeeting(latest);
        addToast("Participant access was revoked, but LiveKit or chat cleanup is still pending.", "warning");
      } else {
        if (code === "PARTICIPANT_NOT_FOUND" || code === "MEETING_ENDED") {
          const latest = await studyMeetingsApi.get(id, routeInviteCode || undefined).catch(() => null);
          if (latest) setJoinedMeeting(latest);
        }
        addToast(error?.response?.data?.message || "Could not remove participant.", "error");
      }
    } finally { setRemovingParticipantId(null); }
  };

  if (id) {
    if (meetingQuery.isLoading) return <div className="flex h-full flex-1 items-center justify-center"><Loader2 className="animate-spin text-[#1E90FF]" /></div>;
    if (meetingQuery.error && !joinedMeeting) return <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-sm text-slate-600 dark:text-slate-300">{(meetingQuery.error as any)?.response?.data?.message || "This meeting is unavailable or you do not have access."}</p><Link to="/study-meetings" state={dashboardReturnState} className="text-sm text-[#1E90FF]">Back to Study Meetings</Link></div>;
    if (!meeting) return null;
    if (!joinedMeeting) {
      const organizerName = meeting.organizerName || meeting.participants.find((participant) => participant.role === "HOST")?.name || (isHost ? currentUser?.fullName : undefined) || "StudyConnect member";
      return <StudyMeetingPreJoin
        key={meeting._id}
        meeting={meeting}
        organizerName={organizerName}
        admissionStatus={admissionStatusQuery.data?.status}
        joining={entryStage !== "idle"}
        entryStage={entryStage}
        joinError={joinError}
        onBack={() => navigate("/study-meetings", { state: dashboardReturnState })}
        onJoin={(preferences) => void enterMeeting(preferences)}
        cancellingRequest={cancellingAdmission}
        onCancelRequest={() => {
          if (cancellingAdmission) return;
          setCancellingAdmission(true);
          void studyMeetingsApi.cancelAdmissionRequest(meeting._id).then(async () => {
            await admissionStatusQuery.refetch();
            addToast("Admission request cancelled.", "success");
          }).catch((error: any) => {
            addToast(error?.response?.data?.message || "Could not cancel the request.", "error");
          }).finally(() => setCancellingAdmission(false));
        }}
      />;
    }
    const remoteParticipants = participants.filter((participant) => participant.userId !== currentUser?._id);
    const localParticipant = participants.find((participant) => participant.userId === currentUser?._id);
    return (
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#080D1A]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#0B132B] sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><Link to="/study-meetings" state={dashboardReturnState} aria-label="Back to Study Meetings" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><ArrowLeft size={18} /></Link><div className="min-w-0"><h1 className="truncate text-base font-bold">{meeting.title}</h1><p className="flex items-center gap-1.5 text-xs text-slate-500"><Users size={13} /> {participants.length}/{meeting.capacity} participants · {meeting.status.toLowerCase()}{meeting.status === "WAITING" && meeting.scheduledStartAt ? ` · scheduled ${displayDateTime(meeting.scheduledStartAt)}` : ""}</p></div></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => { setParticipantPanelOpen((open) => !open); setChatPanelOpen(false); }} aria-expanded={participantPanelOpen} aria-label={participantPanelOpen ? "Close participant panel" : "Open participant panel"} title="Participants" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><Users size={16} /><span className="hidden sm:inline">{participants.length}</span></button>
            <button onClick={() => { setChatPanelOpen((open) => !open); setParticipantPanelOpen(false); }} aria-expanded={chatPanelOpen} aria-controls="study-meeting-chat" aria-label={chatPanelOpen ? "Close meeting chat" : "Open meeting chat"} title="Meeting chat" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:border-white/10 dark:hover:bg-white/5"><MessageSquareText size={16} /></button>
            <div role="status" aria-live="polite" className={`hidden items-center gap-1.5 text-xs sm:flex ${connectionState === "connected" ? "text-emerald-600" : connectionState === "failed" ? "text-rose-600" : "text-amber-600"}`}><span className="size-2 rounded-full bg-current" />{leavingMeeting ? "Leaving" : meeting.status === "ENDED" || meeting.status === "CANCELLED" ? "Meeting ended" : connectionState === "connected" ? `Connected · ${networkQuality} network` : connectionState === "reconnecting" ? "Reconnecting" : connectionState === "failed" ? "Connection failed" : connectionState === "connecting" ? "Connecting" : "Not joined"}</div>
            {connectionState === "failed" && joinedMeeting && <button onClick={async () => { const preferences = { microphoneEnabled: micEnabled, cameraEnabled, audioInputId: selectedAudioInput, videoInputId: selectedVideoInput, audioOutputId: selectedAudioOutput }; await stopMeetingMedia(true); await enterMeeting(preferences); }} className="rounded-lg bg-[#1E90FF] px-2.5 py-1.5 text-xs font-semibold text-white">Reconnect</button>}
            {isHost && inviteCode && <button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/study-meetings/${meeting._id}?invite=${encodeURIComponent(inviteCode)}`); addToast("Invitation link copied.", "success"); } catch { addToast("Could not copy the invitation link in this browser.", "error"); } }} className="hidden items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 md:inline-flex"><Copy size={13} /> Invite</button>}
          </div>
        </header>
        <div className={`relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden ${chatPanelOpen ? "xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]" : ""}`}>
          <section className="relative flex min-h-0 flex-col overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24">
            <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{meeting.subject || (meeting.mediaType === "voice" ? "Voice meeting" : "Live meeting")}</h2><p className="text-xs text-slate-500">{participants.length} participants · messages stay in this room's Stream channel</p></div></div>
                {isHost && meeting.waitingRoomEnabled && <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B132B]"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Waiting room</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-white/10">{admissionRequestsQuery.data?.length || 0} pending</span></div>{admissionRequestsQuery.isLoading ? <p className="text-xs text-slate-500">Loading requests…</p> : admissionRequestsQuery.error ? <button onClick={() => void admissionRequestsQuery.refetch()} className="text-xs text-[#1E90FF]">Could not load requests. Retry</button> : admissionRequestsQuery.data?.length ? <div className="space-y-2">{admissionRequestsQuery.data.map((request) => <div key={request.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10"><div className="flex min-w-0 items-center gap-2">{request.avatar ? <img src={request.avatar} alt="" className="size-8 rounded-full object-cover" /> : <span className="flex size-8 items-center justify-center rounded-full bg-[#1E90FF]/10 text-xs font-bold text-[#1E90FF]">{request.name.slice(0, 1).toUpperCase()}</span>}<div className="min-w-0"><p className="truncate text-sm font-medium">{request.name}</p><p className="text-[11px] text-slate-500">Requested {displayDateTime(request.requestedAt)}</p></div></div><div className="flex gap-2"><button disabled={Boolean(admissionActionId)} onClick={() => void decideAdmission(request.userId, "REJECTED")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/10">Reject</button><button disabled={Boolean(admissionActionId)} onClick={() => void decideAdmission(request.userId, "APPROVED")} className="rounded-lg bg-[#1E90FF] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{admissionActionId === request.userId ? "Saving…" : "Approve"}</button></div></div>)}</div> : <p className="text-xs text-slate-500">No pending requests.</p>}</section>}
                {hasScreenShares && <div role="group" aria-label="Meeting layout" className="mb-3 flex items-center justify-between gap-2"><p role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><MonitorUp size={15} className="shrink-0 text-[#1E90FF]" />{Object.values(screenShares).length === 1 ? `${Object.values(screenShares)[0].name} is sharing` : `${Object.values(screenShares).length} screens are being shared`}</p><div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-[#0B132B]"><button type="button" aria-pressed={meetingLayout === "shared"} onClick={() => setMeetingLayout("shared")} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] ${meetingLayout === "shared" ? "bg-[#1E90FF] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}>Shared content</button><button type="button" aria-pressed={meetingLayout === "gallery"} onClick={() => setMeetingLayout("gallery")} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] ${meetingLayout === "gallery" ? "bg-[#1E90FF] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}>Gallery</button></div></div>}
                {hasScreenShares && meetingLayout === "shared" && <div className="mb-4 space-y-3"><div className={`grid gap-3 ${Object.keys(screenShares).length > 1 ? "2xl:grid-cols-2" : "grid-cols-1"}`}>{Object.entries(screenShares).map(([participantId, share]) => <SharedScreen key={participantId} share={share} />)}</div><div aria-label="Meeting participant strip" className="flex gap-2 overflow-x-auto pb-1">{participants.map((participant) => <div key={participant.userId} className={`flex min-w-36 max-w-52 shrink-0 items-center gap-2 rounded-xl border bg-white px-3 py-2 dark:bg-[#0B132B] ${activeSpeakerIds.includes(participant.userId) ? "border-[#1E90FF] ring-1 ring-[#1E90FF]/35" : "border-slate-200 dark:border-white/10"}`}>{participant.avatar ? <img src={participant.avatar} alt="" className="size-7 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1E90FF]/10 text-xs font-bold text-[#1E90FF]">{participant.name.slice(0, 1).toUpperCase()}</span>}<span className="min-w-0 flex-1 truncate text-xs font-medium">{participant.name}{participant.userId === currentUser?._id ? " (You)" : ""}</span>{mediaByParticipant[participant.userId]?.audioEnabled === false ? <MicOff size={13} className="shrink-0 text-slate-400" /> : mediaByParticipant[participant.userId]?.audioEnabled === true ? <Mic size={13} className="shrink-0 text-emerald-600" /> : <Mic size={13} className="shrink-0 text-slate-400" />}</div>)}</div></div>}
                {screenShareError && <p role="status" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{screenShareError}</p>}
                {audioPlaybackBlocked && <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/25 dark:text-amber-200"><span>Browser audio playback needs your permission.</span><button onClick={() => void resumeRemoteAudio()} className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white hover:bg-amber-600">Enable meeting audio</button></div>}
                <div className={hasScreenShares && meetingLayout === "shared" ? "hidden" : "grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"}>
                  {localParticipant && <ParticipantMedia participant={localParticipant} media={{ stream: mediaDeviceManager.getLocalStream() || undefined, audioEnabled: liveKitRef.current?.getLocalMediaState().audioEnabled ?? micEnabled, videoEnabled: liveKitRef.current?.getLocalMediaState().videoEnabled ?? cameraEnabled }} local audioOutputId={selectedAudioOutput} speaking={activeSpeakerIds.includes(localParticipant.userId)} />}
                  {remoteParticipants.map((participant) => <ParticipantMedia key={participant.userId} participant={participant} media={mediaByParticipant[participant.userId] || { audioEnabled: participant.connectionState === "CONNECTED" ? participant.audioEnabled : undefined, videoEnabled: participant.connectionState === "CONNECTED" ? participant.videoEnabled : undefined }} audioOutputId={selectedAudioOutput} speaking={activeSpeakerIds.includes(participant.userId)} onAudioElement={registerRemoteAudioElement} onAudioPlaybackBlocked={notifyAudioPlaybackBlocked} />)}
                  {participants.length === 1 && <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400 dark:border-white/10">Waiting for others to join</div>}
                </div>
                <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex flex-wrap justify-center gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#080D1A]/95 sm:-mx-6 sm:px-6">
                  <button disabled={connectionState !== "connected" || leavingMeeting || endingMeeting} onClick={() => void toggleMicrophone()} aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"} aria-pressed={!micEnabled} title={micEnabled ? "Mute microphone" : "Unmute microphone"} className={`rounded-full p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] disabled:opacity-50 ${micEnabled ? "bg-slate-900 hover:bg-slate-700" : "bg-rose-600 hover:bg-rose-500"}`}>{micEnabled ? <Mic size={19} /> : <MicOff size={19} />}</button>
                  {meeting.mediaType === "video" && <button disabled={connectionState !== "connected" || leavingMeeting || endingMeeting} onClick={() => void toggleCamera()} aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"} aria-pressed={cameraEnabled} title={cameraEnabled ? "Turn camera off" : "Turn camera on"} className={`rounded-full p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] disabled:opacity-50 ${cameraEnabled ? "bg-slate-900 hover:bg-slate-700" : "bg-rose-600 hover:bg-rose-500"}`}>{cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}</button>}
                  {Object.values(screenShares).some((share) => share.local) ? <button disabled={leavingMeeting || endingMeeting} onClick={() => { setScreenShareError(null); void liveKitRef.current?.stopScreenShare().catch((error) => setScreenShareError(error?.message || "Could not stop screen sharing.")); }} aria-label="Stop sharing screen" title="Stop sharing screen" className="inline-flex items-center gap-2 rounded-full bg-[#1E90FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#187BCD] disabled:opacity-50"><MonitorUp size={18} /> Stop sharing</button> : <button disabled={startingScreenShare || connectionState !== "connected" || leavingMeeting || endingMeeting} onClick={async () => { setStartingScreenShare(true); setScreenShareError(null); try { await liveKitRef.current?.startScreenShare(); } catch (error: any) { const name = error?.name; setScreenShareError(name === "NotAllowedError" || name === "AbortError" ? "Screen sharing was cancelled or permission was denied." : name === "NotFoundError" ? "No screen or window is available to share." : error?.message || "Could not start screen sharing."); } finally { setStartingScreenShare(false); } }} aria-label="Share screen" title="Share screen" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-white disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"><MonitorUp size={18} /> {startingScreenShare ? "Starting…" : "Share screen"}</button>}
                  {isHost && <button disabled={endingMeeting || leavingMeeting} onClick={async () => { if (endingMeeting || !window.confirm("End this meeting for everyone?")) return; setEndingMeeting(true); try { await studyMeetingsApi.end(meeting._id); await stopMeetingMedia(false); await queryClient.invalidateQueries({ queryKey: ["study-meetings"] }); navigate("/study-meetings"); } catch (error: any) { if (error?.response?.data?.code === "MEETING_CLEANUP_PENDING") { await stopMeetingMedia(false); await queryClient.invalidateQueries({ queryKey: ["study-meetings"] }); navigate("/study-meetings"); addToast(error.response.data.message, "warning"); } else { addToast(error?.response?.data?.message || "Could not end meeting.", "error"); setEndingMeeting(false); } } }} className="rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">{endingMeeting ? "Ending…" : "End for everyone"}</button>}
                  <button disabled={leavingMeeting || endingMeeting} onClick={async () => { if (leavingMeeting || endingMeeting) return; setLeavingMeeting(true); setConnectionState("idle"); await stopMeetingMedia(true); navigate("/study-meetings", { state: dashboardReturnState }); }} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-white disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"><DoorOpen size={18} />{leavingMeeting ? "Leaving…" : "Leave"}</button>
                  <button onClick={() => setShowDeviceSettings((shown) => !shown)} aria-expanded={showDeviceSettings} aria-label="Audio and video device settings" title="Device settings" className="rounded-full border border-slate-300 p-3 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:border-white/10 dark:hover:bg-white/5"><Settings2 size={19} /></button>
                </div>
                {showDeviceSettings && <div className="mx-auto mt-4 grid w-full max-w-3xl gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2">
                  {audioInputs.length > 1 && <label className="text-xs font-medium">Microphone<select aria-label="Microphone" disabled={switchingDevice} value={selectedAudioInput} onChange={async (event) => { const deviceId = event.target.value; setSwitchingDevice(true); try { const track = await mediaDeviceManager.switchAudioInputDevice(deviceId); if (!track) throw new Error("That microphone is unavailable."); track.enabled = micEnabled; await liveKitRef.current?.replaceAudioTrack(track); if (!micEnabled) await liveKitRef.current?.setMicrophoneEnabled(false); setSelectedAudioInput(deviceId); if (liveKitRef.current) await syncLocalMediaState(liveKitRef.current); } catch (error: any) { addToast(error?.message || "Could not switch microphone.", "error"); } finally { setSwitchingDevice(false); } }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#080D1A]">{audioInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
                  {meeting.mediaType === "video" && videoInputs.length > 1 && <label className="text-xs font-medium">Camera<select aria-label="Camera" disabled={switchingDevice} value={selectedVideoInput} onChange={async (event) => { const deviceId = event.target.value; setSwitchingDevice(true); try { if (cameraEnabled) { const track = await mediaDeviceManager.switchVideoInputDevice(deviceId); if (!track) throw new Error("That camera is unavailable."); track.enabled = true; await liveKitRef.current?.replaceVideoTrack(track); if (liveKitRef.current) await syncLocalMediaState(liveKitRef.current); } setSelectedVideoInput(deviceId); } catch (error: any) { addToast(error?.message || "Could not switch camera.", "error"); } finally { setSwitchingDevice(false); } }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#080D1A]">{videoInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
                  {supportsAudioOutputSelection && audioOutputs.length > 1 && <label className="text-xs font-medium">Speaker<select aria-label="Speaker" disabled={switchingDevice} value={selectedAudioOutput} onChange={(event) => setSelectedAudioOutput(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#080D1A]">{audioOutputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
                  {audioInputs.length <= 1 && (meeting.mediaType !== "video" || videoInputs.length <= 1) && (!supportsAudioOutputSelection || audioOutputs.length <= 1) && <p className="text-xs text-slate-500">No alternate audio or video devices are available.</p>}
                </div>}
                {isHost && remoteParticipants.length > 0 && <div className="mt-5 space-y-2"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Host controls</h3>{remoteParticipants.map((participant) => <div key={participant.userId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"><span className="truncate text-sm">{participant.name}</span><button disabled={Boolean(removingParticipantId)} onClick={() => void removeMeetingParticipant(participant)} aria-label={`Remove ${participant.name} from meeting`} className="rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30">{removingParticipantId === participant.userId ? "Removing…" : "Remove"}</button></div>)}</div>}
                {participantPanelOpen && <aside role="complementary" aria-label="Meeting participants" className="absolute inset-y-0 right-0 z-20 flex w-[min(92vw,350px)] flex-col border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B132B]">
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-white/10"><div><h3 className="text-sm font-bold">Participants</h3><p className="text-[11px] text-slate-500">{participants.length} of {meeting.capacity}</p></div><button onClick={() => setParticipantPanelOpen(false)} aria-label="Close participant panel" className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:hover:bg-white/10"><X size={16} /></button></div>
                  <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">{participants.map((participant) => {
                    const media = participant.userId === currentUser?._id
                      ? liveKitRef.current?.getLocalMediaState()
                      : mediaByParticipant[participant.userId] || (participant.connectionState === "CONNECTED" ? { audioEnabled: participant.audioEnabled, videoEnabled: participant.videoEnabled } : undefined);
                    const audioEnabled = media?.audioEnabled;
                    const videoEnabled = media?.videoEnabled;
                    return <li key={participant.userId} className="flex items-center gap-3 px-4 py-3">
                      {participant.avatar ? <img src={participant.avatar} alt="" className="size-9 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1E90FF]/10 text-sm font-bold text-[#1E90FF]">{participant.name.slice(0, 1).toUpperCase()}</span>}
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{participant.name}{participant.userId === currentUser?._id ? " (You)" : ""}</p><p className="text-[11px] text-slate-500">{participant.role === "HOST" ? "Host" : participant.connectionState === "RECONNECTING" ? "Reconnecting" : participant.connectionState === "CONNECTED" ? "Connected" : "Joining"}</p></div>
                      <div className="flex items-center gap-2 text-slate-500" aria-label={`Microphone ${audioEnabled === undefined ? "status unavailable" : audioEnabled ? "on" : "off"}; camera ${videoEnabled === undefined ? "status unavailable" : videoEnabled ? "on" : "off"}`} title={`Mic ${audioEnabled === undefined ? "unknown" : audioEnabled ? "on" : "off"} · Camera ${videoEnabled === undefined ? "unknown" : videoEnabled ? "on" : "off"}`}>
                        {audioEnabled === undefined ? <span className="text-[10px]">Mic —</span> : audioEnabled ? <Mic size={14} className="text-emerald-600" /> : <MicOff size={14} />}
                        {videoEnabled === undefined ? <span className="text-[10px]">Cam —</span> : videoEnabled ? <Camera size={14} className="text-emerald-600" /> : <CameraOff size={14} />}
                      </div>
                    </li>;
                  })}</ul>
                </aside>}
            </>
          </section>
          <aside id="study-meeting-chat" aria-label="Meeting chat" className={`${chatPanelOpen ? "absolute inset-y-0 right-0 z-20 flex w-[min(92vw,380px)] shadow-xl xl:static xl:z-auto xl:w-auto xl:shadow-none" : "hidden"} min-h-0 flex-col border-l border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B132B] xl:relative`}>
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 text-sm font-semibold dark:border-white/10"><span className="flex items-center gap-2"><MessageSquareText size={16} className="text-[#1E90FF]" /> Meeting chat</span><button onClick={() => setChatPanelOpen(false)} aria-label="Close meeting chat" className="rounded-md p-1.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:hover:bg-white/10"><X size={16} /></button></div>
            {connectionStatus !== "connected" && <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-400/10 dark:bg-amber-950/20 dark:text-amber-200">Chat connection interrupted. Messages may not send until Stream Chat reconnects.</p>}
            {streamError ? <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/10 dark:bg-rose-950/20 dark:text-rose-300"><p>{streamError}</p><button disabled={connectionStatus !== "connected"} onClick={() => setChatRetryKey((value) => value + 1)} className="mt-2 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Retry</button></div> : streamChannel && client ? <Chat client={client} theme="str-chat__theme-light dark:str-chat__theme-dark"><Channel channel={streamChannel}><Window><MessageList /><MessageComposer /></Window></Channel></Chat> : <div className="flex flex-1 items-center justify-center p-5 text-center text-xs text-slate-500">{connectionStatus === "connected" ? joinedMeeting ? "Opening the meeting chat…" : "Join the meeting to open its chat." : "Connect to Stream Chat to view messages."}</div>}
          </aside>
        </div>
      </main>
    );
  }

  const dashboardMeetings = meetingsQuery.data?.items || [];
  const dashboardHistory = historyQuery.data?.items || [];
  const formatDuration = (seconds: number) => seconds ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` : "Unknown";

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50 p-5 dark:bg-[#080D1A] sm:p-8">
      <header className="mb-6"><Link to="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#1E90FF]"><ArrowLeft size={15} /> Dashboard</Link><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Study Meetings</h1><p className="mt-1 text-sm text-slate-500">Schedule, discover, and manage study sessions.</p></div><button onClick={() => setJoinCodeOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-[#0B132B] dark:hover:bg-white/5">Join with code or link</button></div></header>
      {createdInvitation && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1E90FF]/30 bg-[#1E90FF]/5 p-4"><div><p className="text-sm font-semibold">Invitation ready for {createdInvitation.title}</p><p className="mt-1 text-xs text-slate-500">Code: <span className="font-mono font-semibold">{createdInvitation.code}</span></p></div><div className="flex gap-2"><button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/study-meetings/${createdInvitation.meetingId}?invite=${encodeURIComponent(createdInvitation.code)}`); addToast("Invitation link copied.", "success"); } catch { addToast("Could not copy the invitation link.", "error"); } }} className="rounded-lg bg-[#1E90FF] px-3 py-2 text-xs font-semibold text-white">Copy invite link</button><button onClick={() => setCreatedInvitation(null)} aria-label="Dismiss invitation" className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-white/10"><X size={14}/></button></div></div>}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Meeting sections">{([["WAITING", "Upcoming"], ["ACTIVE", "Ongoing"], ["ENDED", "Past"], ["CANCELLED", "Cancelled"], ["HISTORY", "My history"]] as const).map(([key,label]) => <button key={key} role="tab" aria-selected={listStatus===key} onClick={() => {setListStatus(key);setListPage(1);setHistoryPage(1);}} className={`rounded-full border px-4 py-2 text-sm font-semibold ${listStatus===key?"border-[#1E90FF] bg-[#1E90FF] text-white":"border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#0B132B] dark:text-slate-300"}`}>{label}</button>)}</div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-3"><label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={searchInput} onChange={e=>setSearchInput(e.target.value.slice(0,100))} placeholder="Search title or subject" className={`${fieldClass} mt-0 pl-9`}/></label>{listStatus!=="HISTORY"&&<select value={listScope} onChange={e=>{setListScope(e.target.value as typeof listScope);setListPage(1)}} className={`${fieldClass} mt-0 w-auto min-w-40`}><option value="all">All I can access</option><option value="organized">Organized by me</option><option value="attending">Meetings I joined</option></select>}</div>
          {listStatus==="HISTORY" ? (historyQuery.isLoading?<div className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-[#1E90FF]"/></div>:historyQuery.error?<p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Meeting history could not be loaded.</p>:dashboardHistory.length?<div className="space-y-3">{dashboardHistory.map(({meeting:item,isOrganizer,attended,durationSeconds,attendancePeriods})=><article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B132B]"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-500">{item.subject||item.description||"Study meeting"}</p><p className="mt-1 text-xs text-slate-500">Organizer: {item.organizerName||"StudyConnect member"}{item.scheduledStartAt?` · Scheduled ${displayDateTime(item.scheduledStartAt)}`:""}</p><p className="mt-3 text-xs text-slate-500">{item.status==="CANCELLED"?"Cancelled":"Completed"} · {isOrganizer?"Organizer":attended?"Attended":"Not attended"} · {item.startedAt?`Started ${displayDateTime(item.startedAt)}`:"Actual start not recorded"}</p><p className="mt-1 text-xs text-slate-500">{item.endedAt?`Ended ${displayDateTime(item.endedAt)}`:item.cancelledAt?`Cancelled ${displayDateTime(item.cancelledAt)}`:"End time not recorded"}{attended?` · Attendance ${formatDuration(durationSeconds)}`:""}</p>{attendancePeriods.some(p=>!p.leftAt)&&<p className="mt-1 text-[11px] text-slate-400">Duration excludes attendance periods without a departure time.</p>}</div><Link state={dashboardReturnState} to={`/study-meetings/${item._id}`} className="h-fit rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-white/10">Details</Link></div></article>)}</div>:<Empty text="Your history appears here after you organize or attend a meeting."/>):meetingsQuery.isLoading?<div className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-[#1E90FF]"/></div>:meetingsQuery.error?<p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Unable to load meetings. Try again shortly.</p>:dashboardMeetings.length?<div className="space-y-3">{dashboardMeetings.map(item=>{const owns=currentUser?._id===item.createdBy;const scheduled=item.status==="WAITING"&&item.scheduledStartAt;const count=item.participants.filter(p=>p.state==="JOINED").length;return <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B132B]"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-white/10">{item.status==="WAITING"?scheduled?"UPCOMING":"WAITING":item.status}</span></div><p className="mt-1 text-xs font-medium text-[#1E90FF]">{item.subject||"Study session"}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description||"Study with classmates in a live meeting."}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span><Users size={13} className="mr-1 inline"/>{count}/{item.capacity}</span><span>{owns?(currentUser?.fullName||"You"):item.organizerName||"StudyConnect member"} · Organizer</span><span>{item.mediaType}</span><span>{item.access==="PUBLIC"?"Public":"Invitation required"}</span><span><CalendarDays size={13} className="mr-1 inline"/>{item.scheduledStartAt?`Scheduled ${displayDateTime(item.scheduledStartAt)}${item.startedAt?` · Started ${displayDateTime(item.startedAt)}`:""}`:item.startedAt?`Started ${displayDateTime(item.startedAt)}`:"Not started"}</span>{item.expectedDurationMinutes&&<span><Clock3 size={13} className="mr-1 inline"/>{item.expectedDurationMinutes} min planned</span>}</div></div><div className="flex shrink-0 flex-wrap items-start gap-2"><Link state={dashboardReturnState} to={`/study-meetings/${item._id}`} className="rounded-lg bg-[#1E90FF] px-3 py-2 text-xs font-semibold text-white">{item.status==="WAITING"&&!scheduled?"Join":"Details"}</Link>{owns&&scheduled&&<><button onClick={()=>setEditDraft({id:item._id,title:item.title,subject:item.subject||"",description:item.description||"",scheduledStartAt:dateTimeInputValue(item.scheduledStartAt),expectedDurationMinutes:item.expectedDurationMinutes??60,capacity:item.capacity,access:item.access,waitingRoomEnabled:item.waitingRoomEnabled,updatedAt:item.updatedAt})} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-white/10"><Pencil size={13}/>Edit</button><button disabled={cancellingId===item._id} onClick={()=>void cancelMeeting(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-600 disabled:opacity-50">{cancellingId===item._id?"Cancelling…":"Cancel"}</button></>}</div></div></article>})}</div>:<Empty text={listStatus==="WAITING"?"No upcoming meetings are available.":listStatus==="ACTIVE"?"There are no ongoing meetings you can access.":listStatus==="CANCELLED"?"No cancelled meetings in this section.":"No past meetings are available."}/>}
          {listStatus==="HISTORY"?historyQuery.data&&historyQuery.data.pages>1&&<Pager page={historyPage} pages={historyQuery.data.pages} setPage={setHistoryPage}/>:meetingsQuery.data&&meetingsQuery.data.pages>1&&<Pager page={listPage} pages={meetingsQuery.data.pages} setPage={setListPage}/>}
        </section>
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B132B]"><h2 className="mb-4 flex items-center gap-2 font-bold"><Plus size={18} className="text-[#1E90FF]"/> Create a study meeting</h2><form onSubmit={createMeeting} className="space-y-3"><label className="block text-xs font-semibold">Meeting title<input required minLength={2} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} className={fieldClass} placeholder="e.g. Data Structures revision"/></label><label className="block text-xs font-semibold">Subject or topic<input maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} className={fieldClass} placeholder="e.g. Algorithms"/></label><label className="block text-xs font-semibold">Description or agenda<textarea maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} className={`${fieldClass} min-h-20 resize-y`} placeholder="What are you studying?"/></label><div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-white/10"><div><p className="text-sm font-semibold">Schedule for later</p><p className="text-[11px] text-slate-500">Otherwise created now.</p></div><input type="checkbox" checked={scheduleLater} onChange={e=>setScheduleLater(e.target.checked)} aria-label="Schedule meeting for later" className="size-4 accent-[#1E90FF]"/></div>{scheduleLater&&<><label className="block text-xs font-semibold">Start date and time <span className="font-normal text-slate-500">(your local time)</span><input type="datetime-local" required min={dateTimeInputValue(new Date(Date.now()+60_000).toISOString())} value={scheduledStartLocal} onChange={e=>setScheduledStartLocal(e.target.value)} className={fieldClass}/></label><label className="block text-xs font-semibold">Expected duration<select value={expectedDurationMinutes} onChange={e=>setExpectedDurationMinutes(Number(e.target.value))} className={fieldClass}>{[30,45,60,90,120,180,240,360,480].map(d=><option key={d} value={d}>{d>=60?`${d/60} hour${d>60?"s":""}`:`${d} minutes`}</option>)}</select></label></>}<div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold">Access<select value={access} onChange={e=>setAccess(e.target.value as StudyMeeting["access"])} className={fieldClass}><option value="PUBLIC">Public</option><option value="PRIVATE">Private invite</option><option value="INVITE_ONLY">Invite only</option></select></label><label className="block text-xs font-semibold">Type<select value={mediaType} onChange={e=>setMediaType(e.target.value as StudyMeeting["mediaType"])} className={fieldClass}><option value="voice">Voice first</option><option value="video">Video</option></select></label></div><label className="block text-xs font-semibold">Participant limit<input type="number" min={2} max={100} value={capacity} onChange={e=>setCapacity(Math.max(2,Math.min(100,Number(e.target.value))))} className={fieldClass}/></label><label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold dark:border-white/10"><span><span className="block text-sm">Require host approval</span><span className="font-normal text-slate-500">Participants wait until you admit them.</span></span><input type="checkbox" checked={waitingRoomEnabled} onChange={e=>setWaitingRoomEnabled(e.target.checked)} aria-label="Require host approval" className="size-4 accent-[#1E90FF]"/></label><p className="text-[11px] leading-relaxed text-slate-500">Private meetings generate an invitation code. Media credentials are issued only when an authorized participant joins.</p><button disabled={creating||!title.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E90FF] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{creating?<Loader2 size={16} className="animate-spin"/>:scheduleLater?<CalendarDays size={16}/>:<Plus size={16} />}{creating?"Saving…":scheduleLater?"Schedule meeting":"Create meeting"}</button></form></section>
      </div>
      {joinCodeOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><section role="dialog" aria-modal="true" aria-labelledby="join-code-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0B132B]"><div className="mb-4 flex items-center justify-between"><h2 id="join-code-title" className="text-lg font-bold">Join a meeting</h2><button onClick={()=>setJoinCodeOpen(false)} aria-label="Close join dialog" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X size={17}/></button></div><form onSubmit={resolveInvitation} className="space-y-3"><label className="block text-xs font-semibold">Invitation code or link<input autoFocus value={joinCodeInput} onChange={e=>setJoinCodeInput(e.target.value.slice(0,1000))} className={fieldClass} placeholder="Paste a code or StudyConnect invite link"/></label><p className="text-xs text-slate-500">We verify the invitation before opening meeting details. A meeting ID alone does not grant access.</p><div className="flex justify-end gap-2"><button type="button" onClick={()=>setJoinCodeOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-white/10">Cancel</button><button disabled={resolvingInvitation||!joinCodeInput.trim()} className="rounded-xl bg-[#1E90FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{resolvingInvitation?"Checking…":"Continue"}</button></div></form></section></div>}      {editDraft&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><section role="dialog" aria-modal="true" aria-labelledby="edit-meeting-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0B132B]"><div className="mb-4 flex items-center justify-between"><h2 id="edit-meeting-title" className="text-lg font-bold">Edit scheduled meeting</h2><button onClick={()=>setEditDraft(null)} aria-label="Close edit meeting" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X size={17}/></button></div><form onSubmit={saveMeetingEdit} className="space-y-3"><label className="block text-xs font-semibold">Title<input required minLength={2} maxLength={120} value={editDraft.title} onChange={e=>setEditDraft({...editDraft,title:e.target.value})} className={fieldClass}/></label><label className="block text-xs font-semibold">Subject<input maxLength={120} value={editDraft.subject} onChange={e=>setEditDraft({...editDraft,subject:e.target.value})} className={fieldClass}/></label><label className="block text-xs font-semibold">Description<textarea maxLength={1000} value={editDraft.description} onChange={e=>setEditDraft({...editDraft,description:e.target.value})} className={`${fieldClass} min-h-20`}/></label><label className="block text-xs font-semibold">Scheduled start (your local time)<input type="datetime-local" required value={editDraft.scheduledStartAt} onChange={e=>setEditDraft({...editDraft,scheduledStartAt:e.target.value})} className={fieldClass}/></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold">Duration (minutes)<input type="number" min={15} max={480} value={editDraft.expectedDurationMinutes??""} onChange={e=>setEditDraft({...editDraft,expectedDurationMinutes:e.target.value?Number(e.target.value):null})} className={fieldClass}/></label><label className="block text-xs font-semibold">Capacity<input type="number" min={2} max={100} value={editDraft.capacity} onChange={e=>setEditDraft({...editDraft,capacity:Math.max(2,Math.min(100,Number(e.target.value)))})} className={fieldClass}/></label></div><label className="block text-xs font-semibold">Access<select value={editDraft.access} onChange={e=>setEditDraft({...editDraft,access:e.target.value as StudyMeeting["access"]})} className={fieldClass}><option value="PUBLIC">Public</option><option value="PRIVATE">Private invite</option><option value="INVITE_ONLY">Invite only</option></select></label><label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold dark:border-white/10"><span>Require host approval</span><input type="checkbox" checked={editDraft.waitingRoomEnabled} onChange={e=>setEditDraft({...editDraft,waitingRoomEnabled:e.target.checked})} className="size-4 accent-[#1E90FF]"/></label><div className="flex justify-end gap-2"><button type="button" onClick={()=>setEditDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-white/10">Cancel</button><button disabled={savingEdit} className="rounded-xl bg-[#1E90FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingEdit?"Saving…":"Save changes"}</button></div></form></section></div>}
    </main>
  );
}
