import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft, Camera, Check, ChevronRight, CircleUserRound, ImagePlus,
  Loader2, Pencil, Phone, Trash2, UserRound, AtSign, Smile, X
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { usersApi } from "../api/users.api";
import { EmojiPickerPopover } from "../components/chat/EmojiPickerPopover";

const ABOUT_TEMPLATES = [
  "Available", "Busy", "At school", "At the movies", "At work",
  "Battery about to die", "Can't talk, messaging only", "In a meeting",
  "At the gym", "Sleeping", "Urgent calls only"
];

const panelClass = "rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0F1A30]";
const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/15 dark:border-white/10 dark:bg-[#080D1A] dark:text-slate-100";

function countCharacters(value: string) {
  return Array.from(value).length;
}

async function cropSquareImage(file: File, zoom: number, xPosition: number, yPosition: number) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This image could not be opened"));
    });

    const size = 512;
    const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const sourceWidth = Math.min(image.naturalWidth, size / (baseScale * zoom));
    const sourceHeight = Math.min(image.naturalHeight, size / (baseScale * zoom));
    const maxX = Math.max(0, image.naturalWidth - sourceWidth);
    const maxY = Math.max(0, image.naturalHeight - sourceHeight);
    const sourceX = maxX * (xPosition / 100);
    const sourceY = maxY * (yPosition / 100);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image editing is unavailable in this browser");
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not prepare this image")), "image/jpeg", 0.9);
    });
    return new File([blob], "studyconnect-profile.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function MessagingProfileSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const view = location.pathname.split("/").filter(Boolean)[1] || "overview";
  const [name, setName] = useState(user?.fullName || "");
  const [about, setAbout] = useState(user?.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoX, setPhotoX] = useState(50);
  const [photoY, setPhotoY] = useState(50);
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState(false);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLTextAreaElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(user?.fullName || "");
    setAbout(user?.bio || "");
    setSaveError("");
    setIsEmojiOpen(false);
  }, [user?.fullName, user?.bio, view]);

  useEffect(() => () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const goTo = (section: string) => navigate(section ? `/messaging-settings/${section}` : "/messaging-settings");

  const saveMessagingProfile = async (payload: { fullName?: string; bio?: string }) => {
    setIsSaving(true);
    setSaveError("");
    try {
      const updatedUser = await usersApi.updateMessagingProfile(payload);
      setUser(updatedUser);
      addToast("Profile settings saved", "success");
      return true;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Could not save profile settings";
      setSaveError(message);
      addToast(message, "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const insertEmoji = (emoji: string, target: "name" | "about") => {
    const ref = target === "name" ? nameInputRef.current : aboutInputRef.current;
    const current = target === "name" ? name : about;
    const limit = target === "name" ? 25 : 139;
    const start = ref?.selectionStart ?? current.length;
    const end = ref?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    const value = Array.from(next).slice(0, limit).join("");
    target === "name" ? setName(value) : setAbout(value);
    setIsEmojiOpen(false);
    requestAnimationFrame(() => {
      const input = target === "name" ? nameInputRef.current : aboutInputRef.current;
      input?.focus();
      const cursor = Math.min(start + emoji.length, value.length);
      input?.setSelectionRange(cursor, cursor);
    });
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      addToast("Choose a JPEG, PNG, or WebP image", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("Profile photos must be 5 MB or smaller", "error");
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setPhotoZoom(1);
    setPhotoX(50);
    setPhotoY(50);
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    setIsPhotoBusy(true);
    try {
      const croppedFile = await cropSquareImage(photoFile, photoZoom, photoX, photoY);
      const updatedUser = await usersApi.uploadProfilePicture(croppedFile);
      setUser(updatedUser);
      setPhotoFile(null);
      setPhotoPreviewUrl("");
      addToast("Profile photo updated", "success");
      goTo("");
    } catch (error: any) {
      addToast(error?.response?.data?.message || error?.message || "Could not update profile photo", "error");
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const deletePhoto = async () => {
    setIsPhotoBusy(true);
    try {
      const updatedUser = await usersApi.deleteProfilePicture();
      setUser(updatedUser);
      setConfirmPhotoDelete(false);
      addToast("Profile photo removed", "success");
      goTo("");
    } catch (error: any) {
      addToast(error?.response?.data?.message || error?.message || "Could not remove profile photo", "error");
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const heading = view === "photo" ? "Profile photo" : view === "name" ? "Name" : view === "about" ? "About" : view === "username" ? "Username" : view === "phone" ? "Phone number" : "Profile";

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#080D1A]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#0B132B] sm:px-6">
        <button type="button" onClick={() => view === "overview" ? navigate(-1) : goTo("")} aria-label={view === "overview" ? "Back" : "Back to profile settings"} title={view === "overview" ? "Back" : "Back to profile settings"} className="flex size-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-[#1E90FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF] dark:text-slate-300 dark:hover:bg-white/5">
          <ArrowLeft size={19} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{heading}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Messaging profile and account information</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          {view === "overview" && (
            <>
              <div className="mb-6 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-white/10 dark:bg-[#0F1A30]">
                <button type="button" onClick={() => goTo("photo")} aria-label="Edit profile photo" className="group relative mb-4 size-36 overflow-hidden rounded-full bg-slate-200 text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E90FF]/30 dark:bg-slate-800">
                  {user?.profilePicture ? <img src={user.profilePicture} alt={`${user.fullName} profile`} className="size-full object-cover" /> : <UserRound className="mx-auto mt-8 size-20" strokeWidth={1.25} />}
                  <span className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-center gap-1 bg-black/55 text-xs font-medium text-white"><Pencil size={13} /> Edit photo</span>
                </button>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{user?.fullName || "StudyConnect user"}</p>
                <p className="mt-1 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">{user?.bio || "Add an About status for other StudyConnect users."}</p>
              </div>

              <section className={`${panelClass} divide-y divide-slate-100 dark:divide-white/5`} aria-label="Profile details">
                <ProfileRow icon={<UserRound size={18} />} label="Name" value={user?.fullName || "Add your name"} onClick={() => goTo("name")} />
                <ProfileRow icon={<CircleUserRound size={18} />} label="About" value={user?.bio || "Add an About status"} onClick={() => goTo("about")} />
                <ProfileRow icon={<AtSign size={18} />} label="Username" value="Not available for this account" onClick={() => goTo("username")} />
                <ProfileRow icon={<Phone size={18} />} label="Phone number" value="Not configured" onClick={() => goTo("phone")} />
              </section>
              <p className="mt-4 px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Your name and About are shared with other StudyConnect users. Your college roll number and sign-in details stay unchanged.</p>
            </>
          )}

          {view === "photo" && (
            <section className={`${panelClass} p-5 sm:p-7`}>
              <div className="flex flex-col items-center">
                <div className="relative mb-6 size-56 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  {photoPreviewUrl ? <img src={photoPreviewUrl} alt="Profile photo preview" className="size-full object-cover" style={{ objectPosition: `${photoX}% ${photoY}%`, transform: `scale(${photoZoom})` }} /> : user?.profilePicture ? <img src={user.profilePicture} alt="Current profile photo" className="size-full object-cover" /> : <UserRound className="mx-auto mt-12 size-32 text-slate-400" strokeWidth={1.1} />}
                </div>
                {photoPreviewUrl && <div className="mb-5 w-full max-w-sm space-y-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Zoom <input type="range" min="1" max="3" step="0.05" value={photoZoom} onChange={(event) => setPhotoZoom(Number(event.target.value))} className="mt-2 block w-full accent-[#1E90FF]" /></label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Horizontal position <input type="range" min="0" max="100" value={photoX} onChange={(event) => setPhotoX(Number(event.target.value))} className="mt-2 block w-full accent-[#1E90FF]" /></label>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Vertical position <input type="range" min="0" max="100" value={photoY} onChange={(event) => setPhotoY(Number(event.target.value))} className="mt-2 block w-full accent-[#1E90FF]" /></label>
                </div>}
                {!photoPreviewUrl && <p className="mb-5 text-center text-sm text-slate-500 dark:text-slate-400">Your profile photo is visible to other StudyConnect users.</p>}
                <div className="flex w-full flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><Camera size={16} /> Camera</button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><ImagePlus size={16} /> Gallery / Photos</button>
                  {user?.profilePicture && !photoPreviewUrl && <button type="button" onClick={() => setConfirmPhotoDelete(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"><Trash2 size={16} /> Delete photo</button>}
                  {photoPreviewUrl && <>
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreviewUrl(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"><X size={16} /> Cancel</button>
                    <button type="button" disabled={isPhotoBusy} onClick={savePhoto} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1E90FF] px-4 text-sm font-semibold text-white hover:bg-[#187BCD] disabled:opacity-60">{isPhotoBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save photo</button>
                  </>}
                </div>
                <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </div>
              {confirmPhotoDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-photo-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#0F1A30]"><h2 id="delete-photo-title" className="font-semibold text-slate-900 dark:text-white">Delete profile photo?</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This removes the uploaded photo from your StudyConnect profile.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmPhotoDelete(false)} className="min-h-10 rounded-lg px-3 text-sm text-slate-600 dark:text-slate-300">Cancel</button><button type="button" onClick={deletePhoto} disabled={isPhotoBusy} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white disabled:opacity-60">{isPhotoBusy ? "Removing…" : "Delete photo"}</button></div></div></div>}
            </section>
          )}

          {view === "name" && <EditorCard title="Name" description="This is the display name shown to other StudyConnect users." onCancel={() => goTo("")} onSave={() => saveMessagingProfile({ fullName: name.trim() }).then((saved) => saved && goTo(""))} isSaving={isSaving} saveError={saveError}>
            <div className="relative">
              <input ref={nameInputRef} aria-label="Display name" value={name} maxLength={50} onChange={(event) => setName(Array.from(event.target.value).slice(0, 25).join(""))} className={`${inputClass} pr-12`} />
              <button type="button" aria-label="Insert emoji" onClick={() => setIsEmojiOpen((open) => !open)} className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"><Smile size={18} /></button>
              <div className="absolute right-0 top-full z-30">{isEmojiOpen && <EmojiPickerPopover isOpen onClose={() => setIsEmojiOpen(false)} onSelectEmoji={(emoji) => insertEmoji(emoji, "name")} initialMode="emoji" align="right" />}</div>
            </div>
            <p className="text-right text-xs text-slate-500">{countCharacters(name)}/25</p>
          </EditorCard>}

          {view === "about" && <EditorCard title="About" description="Set a short status for your StudyConnect profile. You can choose a suggestion or write your own." onCancel={() => goTo("")} onSave={() => saveMessagingProfile({ bio: about.trim() }).then((saved) => saved && goTo(""))} isSaving={isSaving} saveError={saveError}>
            <textarea ref={aboutInputRef} aria-label="About status" value={about} maxLength={278} onChange={(event) => setAbout(Array.from(event.target.value).slice(0, 139).join(""))} rows={4} className={`${inputClass} resize-y`} />
            <p className="text-right text-xs text-slate-500">{countCharacters(about)}/139</p>
            <div className="pt-2"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Suggestions</h3><div className="flex flex-wrap gap-2">{ABOUT_TEMPLATES.map((template) => <button key={template} type="button" disabled={isSaving} onClick={async () => { setAbout(template); const saved = await saveMessagingProfile({ bio: template }); if (saved) goTo(""); }} className="min-h-10 rounded-full border border-slate-200 px-3 text-xs text-slate-700 transition hover:border-[#1E90FF] hover:text-[#1E90FF] disabled:opacity-50 dark:border-white/10 dark:text-slate-300">{template}</button>)}</div></div>
          </EditorCard>}

          {view === "username" && <section className={`${panelClass} p-5 sm:p-7`}><div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5"><AtSign size={20} /></div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Username</h2><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">StudyConnect accounts do not currently have a unique username field or username availability service. You can continue to be found by your existing profile details.</p><button type="button" onClick={() => goTo("")} className="mt-5 min-h-11 rounded-xl bg-[#1E90FF] px-4 text-sm font-semibold text-white hover:bg-[#187BCD]">Back to profile</button></section>}

          {view === "phone" && <section className={`${panelClass} p-5 sm:p-7`}><div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5"><Phone size={20} /></div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Phone number</h2><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">A verified phone number is not stored on your StudyConnect account. Phone changes need an account verification and migration flow, which this application does not currently provide.</p><button type="button" onClick={() => goTo("")} className="mt-5 min-h-11 rounded-xl bg-[#1E90FF] px-4 text-sm font-semibold text-white hover:bg-[#187BCD]">Back to profile</button></section>}
        </div>
      </div>
    </main>
  );
}

function ProfileRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-[76px] w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E90FF] dark:hover:bg-white/[0.03] sm:px-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span><span className="mt-1 block truncate text-sm text-slate-900 dark:text-slate-100">{value}</span></span><Pencil size={15} className="shrink-0 text-slate-400" /><ChevronRight size={16} className="text-slate-400" /></button>;
}

function EditorCard({ title, description, children, onCancel, onSave, isSaving, saveError }: { title: string; description: string; children: React.ReactNode; onCancel: () => void; onSave: () => void; isSaving: boolean; saveError: string }) {
  return <section className={`${panelClass} p-5 sm:p-7`}><h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mb-5 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p><div className="space-y-3">{children}</div>{saveError && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{saveError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button><button type="button" onClick={onSave} disabled={isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1E90FF] px-4 text-sm font-semibold text-white hover:bg-[#187BCD] disabled:opacity-60">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save</button></div></section>;
}

export default MessagingProfileSettingsPage;
