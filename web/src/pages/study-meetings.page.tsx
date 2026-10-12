import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, CameraOff, Copy, DoorOpen, Loader2, LockKeyhole, MessageSquareText, Mic, MicOff, MonitorUp, Plus, Radio, Settings2, Users, Video, X } from "lucide-react";
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

type MediaUi = { stream?: MediaStream; audioEnabled?: boolean; videoEnabled?: boolean };
type ScreenShareUi = { name: string; stream: MediaStream; local: boolean };

function SharedScreen({ share }: { share: ScreenShareUi }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = share.stream;
    return () => { if (videoRef.current) videoRef.current.srcObject = null; };
  }, [share.stream]);
  return (
    <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-white/10 sm:min-h-[360px]">
      <video ref={videoRef} autoPlay playsInline muted className="max-h-[min(68vh,760px)] w-full object-contain" />
      <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">{share.name}{share.local ? " (You)" : ""} is sharing</div>
    </div>
  );
}

function ParticipantMedia({ participant, media, local, audioOutputId }: { participant: StudyMeetingParticipant; media?: MediaUi; local?: boolean; audioOutputId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasVideo = Boolean(media?.videoEnabled && media.stream?.getVideoTracks().length);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = media?.stream || null;
    if (audioRef.current) audioRef.current.srcObject = media?.stream || null;
  }, [media?.stream, hasVideo]);
  useEffect(() => {
    if (!local && audioRef.current && audioOutputId) {
      void mediaDeviceManager.switchAudioOutputDevice(audioRef.current, audioOutputId);
    }
  }, [audioOutputId, local]);
  return (
    <div className="relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#0B132B]">
      {hasVideo ? <video ref={videoRef} autoPlay playsInline muted className={`h-full min-h-44 w-full object-cover ${local ? "-scale-x-100" : ""}`} /> : (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          {participant.avatar ? <img src={participant.avatar} alt="" className="size-16 rounded-full object-cover" /> : <div className="flex size-16 items-center justify-center rounded-full bg-[#1E90FF]/15 text-xl font-bold text-[#1E90FF]">{participant.name.slice(0, 1).toUpperCase()}</div>}
          <span className="max-w-full truncate text-sm font-semibold">{participant.name}{local ? " (You)" : ""}</span>
        </div>
      )}
      {!local && <audio ref={audioRef} autoPlay className="hidden" />}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
        {media?.audioEnabled === false ? <MicOff size={13} /> : <Mic size={13} />}
        <span>{participant.name}{local ? " (You)" : ""}</span>
      </div>
      {participant.role === "HOST" && <span className="absolute right-2 top-2 rounded-full bg-amber-400/90 px-2 py-1 text-[10px] font-bold text-slate-950">Host</span>}
    </div>
  );
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState<StudyMeeting["access"]>("PUBLIC");
  const [mediaType, setMediaType] = useState<StudyMeeting["mediaType"]>("voice");
  const [capacity, setCapacity] = useState(12);
  const [creating, setCreating] = useState(false);
  const [joinedMeeting, setJoinedMeeting] = useState<StudyMeeting | null>(null);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "failed">("idle");
  const [networkQuality, setNetworkQuality] = useState<string>("good");
  const [mediaByParticipant, setMediaByParticipant] = useState<Record<string, MediaUi>>({});
  const [screenShares, setScreenShares] = useState<Record<string, ScreenShareUi>>({});
  const [startingScreenShare, setStartingScreenShare] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
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
  const activeMeetingIdRef = useRef<string | null>(null);
  const roomUnmountedRef = useRef(false);
  const autoJoinStartedRef = useRef(false);
  const joiningMeetingRef = useRef(false);

  const meetingsQuery = useQuery({ queryKey: ["study-meetings"], queryFn: studyMeetingsApi.list, enabled: !id });
  const meetingQuery = useQuery({ queryKey: ["study-meeting", id, routeInviteCode], queryFn: () => studyMeetingsApi.get(id!, routeInviteCode || undefined), enabled: Boolean(id) });
  const inviteCode = routeInviteCode || meetingQuery.data?.inviteCode;
  const meeting = joinedMeeting || meetingQuery.data || null;
  const isHost = Boolean(meeting && currentUser?._id === meeting.createdBy);
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
    roomUnmountedRef.current = false;
    return () => {
      roomUnmountedRef.current = true;
      const meetingId = activeMeetingIdRef.current;
      activeMeetingIdRef.current = null;
      liveKitRef.current?.close();
      liveKitRef.current = null;
      mediaDeviceManager.stopLocalMedia();
      if (meetingId) void studyMeetingsApi.leave(meetingId).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!id || !meeting?.streamChannelId || !client || connectionStatus !== "connected") return;
    let mounted = true;
    const load = async () => {
      try {
        const channel = client.channel("messaging", meeting.streamChannelId);
        await channel.watch();
        if (mounted) { setStreamChannel(channel); setStreamError(null); }
      } catch (error: any) {
        if (mounted) setStreamError(error?.message || "Meeting chat could not be opened.");
      }
    };
    void load();
    return () => { mounted = false; };
  }, [id, meeting?.streamChannelId, client, connectionStatus]);

  const enterMeeting = async () => {
    if (!id) return;
    if (joiningMeetingRef.current || (joinedMeeting && connectionState !== "failed")) return;
    if (callStatus !== "IDLE") { addToast("Leave your current call before joining a study meeting.", "warning"); return; }
    joiningMeetingRef.current = true;
    setConnectionState("connecting");
    try {
      const result = await studyMeetingsApi.join(id, inviteCode || undefined);
      if (roomUnmountedRef.current) {
        await studyMeetingsApi.leave(id).catch(() => undefined);
        return;
      }
      activeMeetingIdRef.current = id;
      setJoinedMeeting(result.meeting);
      const media = await mediaDeviceManager.acquireMedia(true, result.meeting.mediaType === "video");
      if (roomUnmountedRef.current) {
        media.stream.getTracks().forEach((track) => track.stop());
        activeMeetingIdRef.current = null;
        await studyMeetingsApi.leave(id).catch(() => undefined);
        return;
      }
      const stream = media.stream;
      const localMic = stream.getAudioTracks()[0]?.enabled ?? false;
      const localCamera = stream.getVideoTracks()[0]?.enabled ?? false;
      setMicEnabled(localMic);
      setCameraEnabled(localCamera);
      const manager = new LiveKitGroupMediaManager();
      manager.initialize([], {
        onParticipantStream: (participantId, participantStream) => setMediaByParticipant((previous) => ({ ...previous, [participantId]: { ...previous[participantId], stream: participantStream } })),
        onParticipantStreamRemoved: (participantId) => setMediaByParticipant((previous) => { const next = { ...previous }; delete next[participantId]; return next; }),
        onScreenShareChanged: (participantId, participantName, stream, local) => setScreenShares((previous) => {
          if (!stream) { const next = { ...previous }; delete next[participantId]; return next; }
          return { ...previous, [participantId]: { name: participantName, stream, local } };
        }),
        onParticipantMediaState: (participantId, audioEnabled, videoEnabled) => {
          setMediaByParticipant((previous) => ({ ...previous, [participantId]: { ...previous[participantId], audioEnabled, videoEnabled } }));
          setJoinedMeeting((previous) => previous ? ({ ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, audioEnabled, videoEnabled } : participant) }) : previous);
        },
        onParticipantConnected: (participantId, name, role) => setJoinedMeeting((previous) => {
          if (!previous) return previous;
          if (previous.participants.some((participant) => participant.userId === participantId && participant.state === "JOINED")) {
            return { ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, name, connectionState: "CONNECTED" } : participant) };
          }
          if (previous.participants.some((participant) => participant.userId === participantId && participant.state === "LEFT")) {
            return { ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, name, state: "JOINED", leftAt: null, connectionState: "CONNECTED" } : participant) };
          }
          const participant: StudyMeetingParticipant = {
            userId: participantId,
            name,
            role: role === "HOST" ? "HOST" : "PARTICIPANT",
            state: "JOINED",
            joinedAt: new Date().toISOString(),
            audioEnabled: true,
            videoEnabled: false,
            connectionState: "CONNECTED"
          };
          return { ...previous, participants: [...previous.participants, participant] };
        }),
        onParticipantDisconnected: (participantId) => setJoinedMeeting((previous) => previous ? ({ ...previous, participants: previous.participants.map((participant) => participant.userId === participantId ? { ...participant, state: "LEFT", leftAt: new Date().toISOString(), connectionState: "RECONNECTING" } : participant) }) : previous),
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
      await manager.connect(result.media.url, result.media.token, result.media.canPublish);
      if (roomUnmountedRef.current) { manager.close(); mediaDeviceManager.stopLocalMedia(); return; }
      const connectedMeeting = await studyMeetingsApi.connected(id);
      setJoinedMeeting((previous) => previous ? ({ ...previous, status: connectedMeeting.status, participants: previous.participants.map((participant) => participant.userId === currentUser?._id ? { ...participant, connectionState: "CONNECTED" } : participant) }) : connectedMeeting);
      setConnectionState("connected");
      await queryClient.invalidateQueries({ queryKey: ["study-meetings"] });
    } catch (error: any) {
      liveKitRef.current?.close();
      liveKitRef.current = null;
      mediaDeviceManager.stopLocalMedia();
      await studyMeetingsApi.leave(id).catch(() => undefined);
      activeMeetingIdRef.current = null;
      if (!roomUnmountedRef.current) {
        setConnectionState("failed");
        addToast(error?.response?.data?.message || error?.message || "Could not join the meeting.", "error");
      }
    } finally {
      joiningMeetingRef.current = false;
    }
  };

  useEffect(() => {
    if (id && (location.state as any)?.autoJoin && !autoJoinStartedRef.current && meetingQuery.data) {
      autoJoinStartedRef.current = true;
      void enterMeeting();
    }
  }, [id, meetingQuery.data]);

  const stopMeetingMedia = async (leaveBackend: boolean) => {
    const meetingId = activeMeetingIdRef.current || id;
    activeMeetingIdRef.current = null;
    liveKitRef.current?.close();
    liveKitRef.current = null;
    mediaDeviceManager.stopLocalMedia();
    setMediaByParticipant({});
    setScreenShares({});
    setScreenShareError(null);
    setChatPanelOpen(false);
    setShowDeviceSettings(false);
    setJoinedMeeting(null);
    setConnectionState("idle");
    if (leaveBackend && meetingId) await studyMeetingsApi.leave(meetingId).catch(() => undefined);
  };

  const createMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating || title.trim().length < 2) return;
    setCreating(true);
    try {
      const result = await studyMeetingsApi.create({ title: title.trim(), description: description.trim(), access, mediaType, capacity });
      await queryClient.invalidateQueries({ queryKey: ["study-meetings"] });
      navigate(`/study-meetings/${result.meeting._id}${result.inviteCode ? `?invite=${encodeURIComponent(result.inviteCode)}` : ""}`, { state: { autoJoin: true, inviteCode: result.inviteCode } });
    } catch (error: any) {
      addToast(error?.response?.data?.message || "Could not create the study meeting.", "error");
    } finally { setCreating(false); }
  };

  if (id) {
    if (meetingQuery.isLoading) return <div className="flex h-full flex-1 items-center justify-center"><Loader2 className="animate-spin text-[#1E90FF]" /></div>;
    if (meetingQuery.error && !joinedMeeting) return <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-sm text-slate-600 dark:text-slate-300">{(meetingQuery.error as any)?.response?.data?.message || "This meeting is unavailable or you do not have access."}</p><Link to="/study-meetings" className="text-sm text-[#1E90FF]">Back to Study Meetings</Link></div>;
    if (!meeting) return null;
    const remoteParticipants = participants.filter((participant) => participant.userId !== currentUser?._id);
    const localParticipant = participants.find((participant) => participant.userId === currentUser?._id);
    return (
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#080D1A]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#0B132B] sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><Link to="/study-meetings" aria-label="Back to Study Meetings" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><ArrowLeft size={18} /></Link><div className="min-w-0"><h1 className="truncate text-base font-bold">{meeting.title}</h1><p className="flex items-center gap-1.5 text-xs text-slate-500"><Users size={13} /> {participants.length}/{meeting.capacity} participants · {meeting.status.toLowerCase()}</p></div></div>
          <div className="flex items-center gap-2 sm:gap-3"><button onClick={() => setChatPanelOpen((open) => !open)} aria-label={chatPanelOpen ? "Close meeting chat" : "Open meeting chat"} title="Meeting chat" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 xl:hidden"><MessageSquareText size={16} /></button><div role="status" aria-live="polite" className={`flex items-center gap-1.5 text-xs ${connectionState === "connected" ? "text-emerald-600" : connectionState === "failed" ? "text-rose-600" : "text-amber-600"}`}><span className="size-2 rounded-full bg-current" />{connectionState === "connected" ? `Connected · ${networkQuality} network` : connectionState === "reconnecting" ? "Reconnecting" : connectionState === "failed" ? "Connection failed" : connectionState === "connecting" ? "Connecting" : "Not joined"}</div>{connectionState === "failed" && joinedMeeting && <button onClick={async () => { await stopMeetingMedia(true); await enterMeeting(); }} className="rounded-lg bg-[#1E90FF] px-2.5 py-1.5 text-xs font-semibold text-white">Reconnect</button>}{isHost && inviteCode && <button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); addToast("Invitation link copied.", "success"); } catch { addToast("Could not copy the invitation link in this browser.", "error"); } }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><Copy size={13} /> Invite</button>}</div>
        </header>
        <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <section className="flex min-h-0 flex-col overflow-y-auto p-4 sm:p-6">
            {!joinedMeeting ? <div className="m-auto max-w-md text-center"><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF]"><Video size={28} /></div><h2 className="text-xl font-bold">{meeting.status === "ENDED" ? "This meeting has ended" : "Join this study meeting"}</h2><p className="mt-2 text-sm text-slate-500">{meeting.description || "Connect with your classmates using live audio and video."}</p>{meeting.status !== "ENDED" && <button onClick={() => void enterMeeting()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1E90FF] px-5 py-3 text-sm font-semibold text-white hover:bg-[#187BCD]"><Radio size={17} /> Join meeting</button>}</div> : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Participants</h2><p className="text-xs text-slate-500">{meeting.mediaType === "voice" ? "Voice meeting" : "Audio and video meeting"} · messages stay in this room's Stream channel</p></div><button onClick={() => void stopMeetingMedia(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-white dark:border-white/10 dark:hover:bg-white/5"><DoorOpen size={16} /> Leave</button></div>
                {Object.entries(screenShares).length > 0 && <div className="mb-4 space-y-3"><div className="flex items-center gap-2 text-sm font-semibold"><MonitorUp size={16} className="text-[#1E90FF]" /> Shared screen{Object.keys(screenShares).length > 1 ? "s" : ""}</div><div className="grid gap-3 2xl:grid-cols-2">{Object.entries(screenShares).map(([participantId, share]) => <SharedScreen key={participantId} share={share} />)}</div></div>}
                {screenShareError && <p role="status" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{screenShareError}</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {localParticipant && <ParticipantMedia participant={localParticipant} media={{ stream: mediaDeviceManager.getLocalStream() || undefined, audioEnabled: micEnabled, videoEnabled: cameraEnabled }} local audioOutputId={selectedAudioOutput} />}
                  {remoteParticipants.map((participant) => <ParticipantMedia key={participant.userId} participant={participant} media={mediaByParticipant[participant.userId] || { audioEnabled: participant.audioEnabled, videoEnabled: participant.videoEnabled }} audioOutputId={selectedAudioOutput} />)}
                  {participants.length === 1 && <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400 dark:border-white/10">Waiting for others to join</div>}
                </div>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button onClick={() => { const next = !micEnabled; void liveKitRef.current?.setMicrophoneEnabled(next).then(() => setMicEnabled(next)).catch((error) => addToast(error?.message || "Could not update microphone.", "error")); }} aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"} className="rounded-full bg-slate-900 p-3 text-white hover:bg-slate-700">{micEnabled ? <Mic size={19} /> : <MicOff size={19} />}</button>
                  {meeting.mediaType === "video" && mediaDeviceManager.getLocalStream()?.getVideoTracks().length ? <button onClick={() => { const next = !cameraEnabled; void liveKitRef.current?.setCameraEnabled(next).then(() => setCameraEnabled(next)).catch((error) => addToast(error?.message || "Could not update camera.", "error")); }} aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"} className="rounded-full bg-slate-900 p-3 text-white hover:bg-slate-700">{cameraEnabled ? <Camera size={19} /> : <CameraOff size={19} />}</button> : null}
                  {Object.values(screenShares).some((share) => share.local) ? <button onClick={() => { setScreenShareError(null); void liveKitRef.current?.stopScreenShare().catch((error) => setScreenShareError(error?.message || "Could not stop screen sharing.")); }} aria-label="Stop sharing screen" title="Stop sharing screen" className="inline-flex items-center gap-2 rounded-full bg-[#1E90FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#187BCD]"><MonitorUp size={18} /> Stop sharing</button> : <button disabled={startingScreenShare} onClick={async () => { setStartingScreenShare(true); setScreenShareError(null); try { await liveKitRef.current?.startScreenShare(); } catch (error: any) { const name = error?.name; setScreenShareError(name === "NotAllowedError" || name === "AbortError" ? "Screen sharing was cancelled or permission was denied." : name === "NotFoundError" ? "No screen or window is available to share." : error?.message || "Could not start screen sharing."); } finally { setStartingScreenShare(false); } }} aria-label="Share screen" title="Share screen" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-white disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"><MonitorUp size={18} /> {startingScreenShare ? "Starting…" : "Share screen"}</button>}
                  {isHost && <button onClick={async () => { if (!window.confirm("End this meeting for everyone?")) return; try { await studyMeetingsApi.end(meeting._id); await stopMeetingMedia(false); await queryClient.invalidateQueries({ queryKey: ["study-meetings"] }); navigate("/study-meetings"); } catch (error: any) { addToast(error?.response?.data?.message || "Could not end meeting.", "error"); } }} className="rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500">End for everyone</button>}
                  <button onClick={() => setShowDeviceSettings((shown) => !shown)} aria-expanded={showDeviceSettings} aria-label="Audio and video device settings" title="Device settings" className="rounded-full border border-slate-300 p-3 hover:bg-white dark:border-white/10 dark:hover:bg-white/5"><Settings2 size={19} /></button>
                </div>
                {showDeviceSettings && <div className="mx-auto mt-4 grid w-full max-w-3xl gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2">
                  {audioInputs.length > 1 && <label className="text-xs font-medium">Microphone<select aria-label="Microphone" disabled={switchingDevice} value={selectedAudioInput} onChange={async (event) => { const deviceId = event.target.value; setSwitchingDevice(true); try { const track = await mediaDeviceManager.switchAudioInputDevice(deviceId); if (!track) throw new Error("That microphone is unavailable."); track.enabled = micEnabled; await liveKitRef.current?.replaceAudioTrack(track); if (!micEnabled) await liveKitRef.current?.setMicrophoneEnabled(false); setSelectedAudioInput(deviceId); } catch (error: any) { addToast(error?.message || "Could not switch microphone.", "error"); } finally { setSwitchingDevice(false); } }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#080D1A]">{audioInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
                  {meeting.mediaType === "video" && videoInputs.length > 1 && <label className="text-xs font-medium">Camera<select aria-label="Camera" disabled={switchingDevice} value={selectedVideoInput} onChange={async (event) => { const deviceId = event.target.value; setSwitchingDevice(true); try { const track = await mediaDeviceManager.switchVideoInputDevice(deviceId); if (!track) throw new Error("That camera is unavailable."); track.enabled = cameraEnabled; await liveKitRef.current?.replaceVideoTrack(track); if (!cameraEnabled) await liveKitRef.current?.setCameraEnabled(false); setSelectedVideoInput(deviceId); } catch (error: any) { addToast(error?.message || "Could not switch camera.", "error"); } finally { setSwitchingDevice(false); } }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#080D1A]">{videoInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
                  {supportsAudioOutputSelection && audioOutputs.length > 1 && <label className="text-xs font-medium">Speaker<select aria-label="Speaker" disabled={switchingDevice} value={selectedAudioOutput} onChange={(event) => setSelectedAudioOutput(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#080D1A]">{audioOutputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
                  {audioInputs.length <= 1 && (meeting.mediaType !== "video" || videoInputs.length <= 1) && (!supportsAudioOutputSelection || audioOutputs.length <= 1) && <p className="text-xs text-slate-500">No alternate audio or video devices are available.</p>}
                </div>}
                {isHost && remoteParticipants.length > 0 && <div className="mt-5 space-y-2"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Host controls</h3>{remoteParticipants.map((participant) => <div key={participant.userId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"><span className="truncate text-sm">{participant.name}</span><button onClick={async () => { try { const updated = await studyMeetingsApi.removeParticipant(meeting._id, participant.userId); setJoinedMeeting(updated); } catch (error: any) { addToast(error?.response?.data?.message || "Could not remove participant.", "error"); } }} className="rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Remove</button></div>)}</div>}
              </>
            )}
          </section>
          <aside className={`${chatPanelOpen ? "absolute inset-y-0 right-0 z-20 flex w-[min(92vw,380px)] shadow-xl xl:static xl:z-auto xl:w-auto xl:shadow-none" : "hidden xl:flex"} min-h-0 flex-col border-l border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B132B] xl:relative`}>
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 text-sm font-semibold dark:border-white/10"><span className="flex items-center gap-2"><Users size={16} className="text-[#1E90FF]" /> Meeting chat</span><button onClick={() => setChatPanelOpen(false)} aria-label="Close meeting chat" className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 xl:hidden"><X size={16} /></button></div>
            {streamError ? <div className="p-4 text-sm text-rose-600">{streamError}</div> : streamChannel && client ? <Chat client={client} theme="str-chat__theme-light dark:str-chat__theme-dark"><Channel channel={streamChannel}><Window><MessageList /><MessageComposer /></Window></Channel></Chat> : <div className="flex flex-1 items-center justify-center p-5 text-center text-xs text-slate-500">{connectionStatus === "connected" ? "Opening the meeting chat…" : "Connect to Stream Chat to view messages."}</div>}
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50 p-5 dark:bg-[#080D1A] sm:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><Link to="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#1E90FF]"><ArrowLeft size={15} /> Dashboard</Link><h1 className="text-2xl font-bold">Study Meetings</h1><p className="mt-1 text-sm text-slate-500">Create or join a live study room with audio, video, and Stream Chat.</p></div></header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section><h2 className="mb-3 text-sm font-bold">Discover meetings</h2>{meetingsQuery.isLoading ? <Loader2 className="animate-spin text-[#1E90FF]" /> : meetingsQuery.error ? <p className="text-sm text-rose-600">Unable to load study meetings.</p> : meetingsQuery.data?.length ? <div className="space-y-3">{meetingsQuery.data.map((item) => <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B132B]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{item.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || "Study with classmates in a live meeting."}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><Users size={13} /> {item.participants.filter((p) => p.state === "JOINED").length}/{item.capacity}</span><span className="flex items-center gap-1"><Video size={13} /> {item.mediaType}</span><span className="flex items-center gap-1">{item.access === "PUBLIC" ? "Public" : <><LockKeyhole size={12} /> Invite required</>}</span></div></div><Link to={`/study-meetings/${item._id}`} className="shrink-0 rounded-lg bg-[#1E90FF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#187BCD]">Open</Link></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">No public study meetings are active. Create one to get started.</div>}</section>
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B132B]"><h2 className="mb-4 flex items-center gap-2 font-bold"><Plus size={18} className="text-[#1E90FF]" /> Create a study meeting</h2><form onSubmit={createMeeting} className="space-y-3"><label className="block text-xs font-semibold">Meeting title<input required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#1E90FF] dark:border-white/10 dark:bg-[#080D1A]" placeholder="e.g. Data Structures revision" /></label><label className="block text-xs font-semibold">Description<textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#1E90FF] dark:border-white/10 dark:bg-[#080D1A]" placeholder="What are you studying?" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold">Access<select value={access} onChange={(e) => setAccess(e.target.value as StudyMeeting["access"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-[#080D1A]"><option value="PUBLIC">Public</option><option value="PRIVATE">Private invite</option><option value="INVITE_ONLY">Invite only</option></select></label><label className="block text-xs font-semibold">Type<select value={mediaType} onChange={(e) => setMediaType(e.target.value as StudyMeeting["mediaType"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-[#080D1A]"><option value="voice">Voice first</option><option value="video">Video</option></select></label></div><label className="block text-xs font-semibold">Participant limit<input type="number" min={2} max={100} value={capacity} onChange={(e) => setCapacity(Math.max(2, Math.min(100, Number(e.target.value))))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-[#080D1A]" /></label><p className="text-[11px] leading-relaxed text-slate-500">Private meetings generate an invitation code. Video subscriptions are bounded by the shared LiveKit group media layer.</p><button disabled={creating || !title.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E90FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#187BCD] disabled:opacity-50">{creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create meeting</button></form></section>
      </div>
    </main>
  );
}
