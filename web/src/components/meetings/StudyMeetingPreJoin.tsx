import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, Clock3, Headphones, Loader2, Mic, MicOff, Settings2, Users, Video, XCircle } from "lucide-react";
import type { StudyMeeting } from "../../api/study-meetings.api";
import { mediaDeviceManager } from "../../services/media-device.service";
import type { MediaDeviceInfo } from "../../types/call.types";

type AdmissionStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED" | "INVALIDATED" | undefined;
export interface PreJoinPreferences {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
}

interface Props {
  meeting: StudyMeeting;
  organizerName: string;
  admissionStatus?: AdmissionStatus;
  joining: boolean;
  entryStage: "idle" | "checking" | "media" | "connecting";
  joinError?: string | null;
  onBack: () => void;
  onJoin: (preferences: PreJoinPreferences) => void;
  onCancelRequest: () => void;
  cancellingRequest: boolean;
}

const controlClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#0B132B] dark:hover:bg-white/5";
const selectClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:border-white/10 dark:bg-[#080D1A]";

function captureError(error: unknown, kind: "camera" | "microphone"): string {
  const name = (error as { name?: string })?.name;
  const device = kind === "camera" ? "camera" : "microphone";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return `Allow ${device} access in your browser to use it in this meeting.`;
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return kind === "camera" ? "No camera was found. You can join with audio only." : "No microphone was found. Choose another device or connect a microphone before joining.";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return `The ${device} could not start. It may be in use by another application.`;
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return `The selected ${device} is unavailable. Choose another device.`;
  return (error as Error)?.message || `Could not start the ${device}.`;
}

export function StudyMeetingPreJoin({ meeting, organizerName, admissionStatus, joining, entryStage, joinError, onBack, onJoin, onCancelRequest, cancellingRequest }: Props) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>(new MediaStream());
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devices, setDevices] = useState<{ audioInputs: MediaDeviceInfo[]; videoInputs: MediaDeviceInfo[]; audioOutputs: MediaDeviceInfo[] }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });
  const [audioInputId, setAudioInputId] = useState("");
  const [videoInputId, setVideoInputId] = useState("");
  const [audioOutputId, setAudioOutputId] = useState("");
  const [capturing, setCapturing] = useState<"microphone" | "camera" | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [hasCameraTrack, setHasCameraTrack] = useState(false);
  const [hasMicrophoneTrack, setHasMicrophoneTrack] = useState(false);
  const supportsAudioOutputSelection = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  const terminal = meeting.status === "ENDED" || meeting.status === "CANCELLED";
  const pending = admissionStatus === "PENDING";
  const rejected = admissionStatus === "REJECTED";
  const cancelled = admissionStatus === "CANCELLED";
  const requestInvalid = admissionStatus === "EXPIRED" || admissionStatus === "INVALIDATED";
  const joinedCount = meeting.participants.filter((participant) => participant.state === "JOINED").length;

  const stopKind = useCallback((kind: "audio" | "video") => {
    const stream = streamRef.current;
    (kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks()).forEach((track) => {
      track.onended = null;
      stream.removeTrack(track);
      track.stop();
    });
    if (kind === "audio") setHasMicrophoneTrack(false);
    else setHasCameraTrack(false);
    if (previewRef.current) previewRef.current.srcObject = stream.getVideoTracks().length ? stream : null;
  }, []);

  const refreshDevices = useCallback(async () => {
    const next = await mediaDeviceManager.enumerateDevices();
    if (!mountedRef.current) return;
    setDevices(next);
    setAudioInputId((current) => next.audioInputs.some((device) => device.deviceId === current) ? current : current || next.audioInputs[0]?.deviceId || "");
    setVideoInputId((current) => next.videoInputs.some((device) => device.deviceId === current) ? current : current || next.videoInputs[0]?.deviceId || "");
    setAudioOutputId((current) => next.audioOutputs.some((device) => device.deviceId === current) ? current : current || next.audioOutputs[0]?.deviceId || "");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshDevices();
    const unsubscribe = mediaDeviceManager.onDeviceChange(() => { void refreshDevices(); });
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      unsubscribe();
      streamRef.current.getTracks().forEach((track) => { track.onended = null; track.stop(); });
      streamRef.current = new MediaStream();
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = hasCameraTrack ? streamRef.current : null;
  }, [hasCameraTrack]);

  const acquireKind = async (kind: "microphone" | "camera", deviceId: string) => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      setDeviceError("This browser does not support camera or microphone access.");
      if (kind === "camera") setCameraEnabled(false); else setMicrophoneEnabled(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setCapturing(kind);
    setDeviceError(null);
    try {
      const constraints: MediaStreamConstraints = kind === "camera"
        ? { audio: false, video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } }
        : { audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true }, video: false };
      const captured = await mediaDevices.getUserMedia(constraints);
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        captured.getTracks().forEach((track) => track.stop());
        return;
      }
      const nextTrack = kind === "camera" ? captured.getVideoTracks()[0] : captured.getAudioTracks()[0];
      if (!nextTrack) throw new Error(`The selected ${kind} did not provide a media track.`);
      stopKind(kind === "camera" ? "video" : "audio");
      nextTrack.onended = () => {
        if (!mountedRef.current) return;
        if (kind === "camera") { setCameraEnabled(false); setHasCameraTrack(false); }
        else { setMicrophoneEnabled(false); setHasMicrophoneTrack(false); }
        setDeviceError(`The ${kind} disconnected. Choose another device or continue without it.`);
      };
      streamRef.current.addTrack(nextTrack);
      if (kind === "camera") { setCameraEnabled(true); setHasCameraTrack(true); }
      else { setMicrophoneEnabled(true); setHasMicrophoneTrack(true); }
      captured.getTracks().filter((track) => track !== nextTrack).forEach((track) => track.stop());
      await refreshDevices();
    } catch (error) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setDeviceError(captureError(error, kind));
        if (kind === "camera") { setCameraEnabled(false); setHasCameraTrack(false); }
        else { setMicrophoneEnabled(false); setHasMicrophoneTrack(false); }
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setCapturing(null);
    }
  };

  const toggleMicrophone = () => {
    if (microphoneEnabled) {
      setMicrophoneEnabled(false);
      streamRef.current.getAudioTracks().forEach((track) => { track.enabled = false; });
      return;
    }
    const track = streamRef.current.getAudioTracks()[0];
    if (track?.readyState === "live") {
      track.enabled = true;
      setMicrophoneEnabled(true);
      return;
    }
    void acquireKind("microphone", audioInputId);
  };

  const toggleCamera = () => {
    if (cameraEnabled) {
      setCameraEnabled(false);
      stopKind("video");
      return;
    }
    void acquireKind("camera", videoInputId);
  };

  const changeInput = async (kind: "microphone" | "camera", deviceId: string) => {
    if (kind === "microphone") setAudioInputId(deviceId); else setVideoInputId(deviceId);
    const enabled = kind === "microphone" ? microphoneEnabled : cameraEnabled;
    if (enabled) await acquireKind(kind, deviceId);
  };

  const requestJoin = () => {
    if (joining || terminal || pending || rejected) return;
    requestIdRef.current += 1;
    streamRef.current.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    streamRef.current = new MediaStream();
    setHasCameraTrack(false);
    setHasMicrophoneTrack(false);
    onJoin({ microphoneEnabled, cameraEnabled: meeting.mediaType === "video" && cameraEnabled, audioInputId, videoInputId, audioOutputId });
  };

  const status = terminal ? meeting.status === "CANCELLED" ? "This meeting was cancelled" : "This meeting has ended"
    : pending ? "Waiting for host approval"
      : rejected ? "The host declined your request"
        : requestInvalid ? "This admission request is no longer valid"
          : admissionStatus === "APPROVED" ? "You’re approved to join" : cancelled ? "Your previous request was cancelled" : meeting.status === "ACTIVE" ? "Meeting in progress" : "Ready when you are";

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50 dark:bg-[#080D1A]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#0B132B] sm:px-6">
        <button onClick={onBack} aria-label="Back to Study Meetings" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:hover:bg-white/10"><ArrowLeft size={18}/></button>
        <div className="min-w-0"><h1 className="truncate text-base font-bold">Before you join</h1><p className="truncate text-xs text-slate-500">Check your camera and microphone</p></div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.8fr)] lg:gap-8 lg:p-8">
        <section className="min-w-0">
          <div className="relative aspect-video min-h-56 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm dark:border-white/10 sm:min-h-80">
            {hasCameraTrack ? <video ref={previewRef} autoPlay playsInline muted aria-label="Camera preview" className="h-full w-full -scale-x-100 object-cover" /> : <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center text-slate-300"><div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-white"><Video size={28}/></div><p className="text-sm">{meeting.mediaType === "video" ? "Camera preview is off" : "Voice meeting · camera is not needed"}</p></div>}
            <div role="status" aria-live="polite" className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white"><span className={`size-2 rounded-full ${meeting.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-300"}`}/>{meeting.status === "ACTIVE" ? "In progress" : meeting.status === "WAITING" ? meeting.scheduledStartAt ? `Scheduled · ${new Date(meeting.scheduledStartAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}` : "Waiting to start" : meeting.status}</div>
            {hasCameraTrack && <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Camera preview · only you can see this</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button onClick={toggleMicrophone} disabled={Boolean(capturing) || joining} aria-pressed={microphoneEnabled} aria-label={microphoneEnabled ? "Mute microphone before joining" : "Enable microphone before joining"} className={`${controlClass} ${microphoneEnabled ? "" : "border-rose-200 text-rose-700 dark:border-rose-400/20 dark:text-rose-300"}`}>
              {microphoneEnabled ? <Mic size={17}/> : <MicOff size={17}/>} Microphone {microphoneEnabled ? "on" : "off"}
            </button>
            {meeting.mediaType === "video" && <button onClick={toggleCamera} disabled={Boolean(capturing) || joining} aria-pressed={cameraEnabled} aria-label={cameraEnabled ? "Turn camera off before joining" : "Turn camera on and preview"} className={`${controlClass} ${cameraEnabled ? "border-[#1E90FF]/40 text-[#1E90FF]" : ""}`}>
              {cameraEnabled ? <Camera size={17}/> : <CameraOff size={17}/>} Camera {cameraEnabled ? "on" : "off"}
            </button>}
            <button onClick={() => { setSettingsOpen((open) => !open); void refreshDevices(); }} aria-expanded={settingsOpen} className={controlClass}><Settings2 size={17}/> Device settings</button>
          </div>
          {microphoneEnabled && !hasMicrophoneTrack && <p className="mt-3 text-center text-xs text-slate-500">Microphone access is requested when you join. It is not active in this preview.</p>}
          {capturing && <p role="status" className="mt-3 text-center text-xs text-slate-500">Waiting for {capturing} permission…</p>}
          {deviceError && <p role="alert" className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/30 dark:text-amber-200">{deviceError}</p>}
          {settingsOpen && <section aria-label="Meeting device settings" className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B132B] sm:grid-cols-2">
            <label className="text-xs font-semibold">Microphone<select value={audioInputId} onChange={(event) => void changeInput("microphone", event.target.value)} className={selectClass}><option value="">System default</option>{devices.audioInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>
            {meeting.mediaType === "video" && <label className="text-xs font-semibold">Camera<select value={videoInputId} onChange={(event) => void changeInput("camera", event.target.value)} className={selectClass}><option value="">System default</option>{devices.videoInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
            <label className="text-xs font-semibold sm:col-span-2">Audio output<select disabled={!supportsAudioOutputSelection} value={audioOutputId} onChange={(event) => setAudioOutputId(event.target.value)} className={`${selectClass} disabled:opacity-50`}><option value="">System default</option>{devices.audioOutputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select><span className="mt-1 block font-normal text-slate-500">{supportsAudioOutputSelection ? "Applies to meeting audio when you join." : "Speaker selection is not available in this browser; the system output will be used."}</span></label>
            <p className="text-[11px] font-normal text-slate-500 sm:col-span-2">Device names may appear after browser permission is granted. Changing an active preview replaces and stops its previous track.</p>
          </section>}
        </section>
        <section className="flex flex-col justify-center rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B132B] sm:p-6">
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#1E90FF]/10 text-[#1E90FF]"><Headphones size={21}/></div>
          <h2 className="text-xl font-bold leading-snug">{meeting.title}</h2>
          <p className="mt-1 text-sm font-medium text-[#1E90FF]">{meeting.subject || "Study session"}</p>
          {meeting.description && <p className="mt-3 line-clamp-3 text-sm text-slate-500">{meeting.description}</p>}
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Users size={15} className="text-slate-400"/> Hosted by {organizerName}</p>
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Users size={15} className="text-slate-400"/> {joinedCount} of {meeting.capacity} participants</p>
            {meeting.scheduledStartAt && <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Clock3 size={15} className="text-slate-400"/> {new Date(meeting.scheduledStartAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>}
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className={`size-2 rounded-full ${terminal ? "bg-rose-500" : admissionStatus === "APPROVED" ? "bg-emerald-500" : "bg-amber-400"}`}/>{status}</p>
          </div>
          {pending ? <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><p>Your request is saved. This page checks for a decision every few seconds.</p><button onClick={onCancelRequest} disabled={cancellingRequest} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-800/20 px-3 text-xs font-semibold disabled:opacity-50"><XCircle size={14}/>{cancellingRequest ? "Cancelling…" : "Cancel request"}</button></div> : rejected ? <p role="status" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">The request was declined. Contact the organizer if you think this is a mistake.</p> : requestInvalid ? <p role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Request another admission if the meeting is still open.</p> : cancelled ? <p role="status" className="mt-5 rounded-xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">Your previous request was cancelled. You can submit a new one.</p> : null}
          {joinError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{joinError}</p>}
          {!terminal && !pending && !rejected && <button onClick={requestJoin} disabled={joining || Boolean(capturing)} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E90FF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#187BCD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E90FF] disabled:cursor-wait disabled:opacity-60 dark:ring-offset-[#0B132B]">
            {entryStage === "checking" ? <><Loader2 size={17} className="animate-spin"/> Checking access…</> : entryStage === "media" ? <><Loader2 size={17} className="animate-spin"/> Preparing devices…</> : entryStage === "connecting" ? <><Loader2 size={17} className="animate-spin"/> Connecting to meeting…</> : admissionStatus === "APPROVED" ? <><CheckCircle2 size={17}/> Join meeting</> : <><Video size={17}/> {meeting.waitingRoomEnabled ? "Request to join" : "Join meeting"}</>}
          </button>}
          <button onClick={onBack} disabled={joining} className="mt-2 min-h-10 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] disabled:opacity-50 dark:hover:bg-white/5">Leave this screen</button>
          <p className="mt-4 text-center text-[11px] text-slate-400">Your devices are not connected to the meeting until you choose Join.</p>
        </section>
      </div>
    </main>
  );
}
