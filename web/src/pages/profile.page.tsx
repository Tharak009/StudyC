import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, KeyRound, LoaderCircle, Plus, X, User, GraduationCap, Award, Shield, FileText, Globe, Users, Calendar, ArrowUpRight, ShieldCheck, Mail, Lock, Settings, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usersApi } from "../api/users.api";
import { authApi } from "../api/auth.api";
import { communitiesApi } from "../api/communities.api";
import { useEventStore } from "../store/event.store";
import { Avatar } from "../components/avatar";
import { FormField } from "../components/form-field";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { getErrorMessage } from "../utils/errors";

const schema = z.object({
  fullName: z.string().min(2).max(100),
  department: z.string().min(2).max(100),
  academicYear: z.coerce.number().int().min(1).max(8),
  bio: z.string().max(500),
  interestsText: z.string()
});
type ProfileForm = z.infer<typeof schema>;

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  link: string;
}

interface AchievementItem {
  id: string;
  title: string;
  date: string;
  organization: string;
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { events } = useEventStore();
  
  const fileInput = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "skills" | "projects" | "communities" | "events" | "achievements" | "security">("personal");

  // React Hook Form for profile base data
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user.fullName ?? "",
      department: user.department ?? "",
      academicYear: user.academicYear ?? 1,
      bio: user.bio ?? "",
      interestsText: (user.interests ?? []).join(", ")
    }
  });

  // Local storage extended states
  const storageKey = `studyconnect-profile-ext-${user._id}`;
  const [coverPhoto, setCoverPhoto] = useState("bg-[linear-gradient(135deg,#4f46e5,#7c3aed,#ec4899)]");
  const [languages, setLanguages] = useState("English, Hindi");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [achievementsList, setAchievementsList] = useState<AchievementItem[]>([]);
  const [socials, setSocials] = useState({ github: "", linkedin: "", portfolio: "" });
  const [privacySettings, setPrivacySettings] = useState({ profileVisibility: "PUBLIC", showEmail: false, showCommunities: true });
  const [notificationPrefs, setNotificationPrefs] = useState({ emailAlerts: true, messageAlerts: true, eventAlerts: true });

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.coverPhoto) setCoverPhoto(data.coverPhoto);
        if (data.languages) setLanguages(data.languages);
        if (data.skills) setSkillsList(data.skills);
        if (data.projects) setProjectsList(data.projects);
        if (data.achievements) setAchievementsList(data.achievements);
        if (data.socials) setSocials(data.socials);
        if (data.privacy) setPrivacySettings(data.privacy);
        if (data.notifications) setNotificationPrefs(data.notifications);
      }
    } catch (e) {
      console.error(e);
    }
  }, [storageKey]);

  // Save extended states helper
  const saveExtendedData = (updatedFields: any) => {
    try {
      const stored = localStorage.getItem(storageKey);
      const current = stored ? JSON.parse(stored) : {};
      const merged = { ...current, ...updatedFields };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch (e) {
      console.error(e);
    }
  };

  // Profile picture upload
  const upload = useMutation({
    mutationFn: usersApi.uploadProfilePicture,
    onSuccess: (nextUser) => {
      setUser(nextUser);
      addToast("Profile picture uploaded successfully!", "success");
    }
  });

  const onFile = (file?: File) => {
    if (!file) return;
    upload.mutate(file);
  };

  // Base profile update
  const update = useMutation({
    mutationFn: (values: ProfileForm) =>
      usersApi.updateProfile({
        fullName: values.fullName,
        department: values.department,
        academicYear: values.academicYear,
        bio: values.bio,
        interests: values.interestsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      }),
    onSuccess: (nextUser) => {
      setUser(nextUser);
      queryClient.setQueryData(["profile"], nextUser);
      reset({
        fullName: nextUser.fullName ?? "",
        department: nextUser.department ?? "",
        academicYear: nextUser.academicYear ?? 1,
        bio: nextUser.bio ?? "",
        interestsText: (nextUser.interests ?? []).join(", ")
      });
      addToast("Profile updated successfully!", "success");
    }
  });

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePass = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast("Password changed successfully!", "success");
    },
    onError: (err) => {
      addToast(getErrorMessage(err), "error");
    }
  });

  // Dynamic lists from store/queries
  const joinedCommunities = useQuery({
    queryKey: ["communities-profile"],
    queryFn: () => communitiesApi.list({ limit: 50 })
  });

  const memberCommunities = useMemo(() => {
    if (!joinedCommunities.data || !joinedCommunities.data.items) return [];
    return joinedCommunities.data.items.filter((c) => c.isMember);
  }, [joinedCommunities.data]);

  const registeredEvents = useMemo(() => {
    return (events ?? []).filter((e) => e.registeredUsers?.some((u) => u.rollNumber === user.rollNumber));
  }, [events, user.rollNumber]);

  // Skill tag additions
  const [newSkill, setNewSkill] = useState("");
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim() || skillsList.includes(newSkill.trim())) return;
    const updated = [...skillsList, newSkill.trim()];
    setSkillsList(updated);
    saveExtendedData({ skills: updated });
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    const updated = skillsList.filter((s) => s !== skill);
    setSkillsList(updated);
    saveExtendedData({ skills: updated });
  };

  // Projects Addition
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectLink, setProjectLink] = useState("");

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: projectTitle,
      description: projectDesc,
      link: projectLink
    };
    const updated = [...projectsList, newProj];
    setProjectsList(updated);
    saveExtendedData({ projects: updated });
    setProjectTitle("");
    setProjectDesc("");
    setProjectLink("");
    addToast("Project added!", "success");
  };

  const handleRemoveProject = (id: string) => {
    const updated = projectsList.filter((p) => p.id !== id);
    setProjectsList(updated);
    saveExtendedData({ projects: updated });
  };

  // Achievements Addition
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementDate, setAchievementDate] = useState("");
  const [achievementOrg, setAchievementOrg] = useState("");

  const handleAddAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achievementTitle.trim()) return;
    const newAch: AchievementItem = {
      id: `ach-${Date.now()}`,
      title: achievementTitle,
      date: achievementDate,
      organization: achievementOrg
    };
    const updated = [...achievementsList, newAch];
    setAchievementsList(updated);
    saveExtendedData({ achievements: updated });
    setAchievementTitle("");
    setAchievementDate("");
    setAchievementOrg("");
    addToast("Achievement added!", "success");
  };

  const handleRemoveAchievement = (id: string) => {
    const updated = achievementsList.filter((a) => a.id !== id);
    setAchievementsList(updated);
    saveExtendedData({ achievements: updated });
  };

  return (
    <div className="animate-fade-up space-y-8">
      {/* 1. Header Banner & Identity Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-ink-900">
        {/* Cover Photo Slot */}
        <div className={`h-40 ${coverPhoto} relative w-full`} />
        
        {/* Profile Identity details */}
        <div className="relative p-6 pt-0 flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
            <div className="relative">
              <Avatar name={user.fullName} src={user.profilePicture} className="size-24 ring-4 ring-white dark:ring-ink-900" />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-slate-950 p-2 text-white border border-white hover:bg-slate-850 dark:border-ink-900 cursor-pointer shadow-md"
                title="Change Avatar"
              >
                <Camera size={12} />
              </button>
            </div>
            
            <div className="space-y-1.5 pb-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{user.fullName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="inline-flex items-center gap-1 text-indigo-650 dark:text-indigo-400 font-bold">
                  <GraduationCap size={14} /> {user.department}
                </span>
                <span>• Year {user.academicYear} Student</span>
              </p>
              {user.bio && (
                <p className="text-xs text-slate-550 dark:text-slate-400 max-w-lg leading-relaxed">{user.bio}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/5 pb-px overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: "personal", label: "Personal", icon: User },
          { id: "academic", label: "Academic", icon: GraduationCap },
          { id: "skills", label: "Skills & Interests", icon: Award },
          { id: "projects", label: "Projects", icon: FileText },
          { id: "communities", label: "Communities", icon: Users },
          { id: "events", label: "Events", icon: Calendar },
          { id: "achievements", label: "Achievements", icon: Award },
          { id: "security", label: "Security & Prefs", icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 border-b-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-655"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Active Tab View Contents */}
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        
        {/* Left main settings block */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900 min-h-[350px]">
          
          {/* TAB 1: Personal Info */}
          {activeTab === "personal" && (
            <form onSubmit={handleSubmit((values) => update.mutate(values))} className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Personal Information</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Full Name" error={errors.fullName?.message}>
                  <input className="field text-xs py-2 bg-slate-50 border-0" required {...register("fullName")} />
                </FormField>
                <FormField label="Languages Spoken">
                  <input
                    className="field text-xs py-2 bg-slate-50 border-0"
                    placeholder="e.g. English, Spanish"
                    value={languages}
                    onChange={(e) => {
                      setLanguages(e.target.value);
                      saveExtendedData({ languages: e.target.value });
                    }}
                  />
                </FormField>
              </div>

              <FormField label="Bio / Professional Summary" error={errors.bio?.message}>
                <textarea className="field text-xs py-2 bg-slate-50 border-0" rows={4} {...register("bio")} />
              </FormField>

              <div className="grid gap-5 sm:grid-cols-3 pt-2">
                <FormField label="GitHub URL">
                  <input
                    className="field text-xs py-2 bg-slate-50 border-0"
                    value={socials.github}
                    onChange={(e) => {
                      const updated = { ...socials, github: e.target.value };
                      setSocials(updated);
                      saveExtendedData({ socials: updated });
                    }}
                  />
                </FormField>
                <FormField label="LinkedIn URL">
                  <input
                    className="field text-xs py-2 bg-slate-50 border-0"
                    value={socials.linkedin}
                    onChange={(e) => {
                      const updated = { ...socials, linkedin: e.target.value };
                      setSocials(updated);
                      saveExtendedData({ socials: updated });
                    }}
                  />
                </FormField>
                <FormField label="Portfolio Link">
                  <input
                    className="field text-xs py-2 bg-slate-50 border-0"
                    value={socials.portfolio}
                    onChange={(e) => {
                      const updated = { ...socials, portfolio: e.target.value };
                      setSocials(updated);
                      saveExtendedData({ socials: updated });
                    }}
                  />
                </FormField>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-white/5">
                <button type="submit" disabled={update.isPending} className="primary-button text-xs py-2 px-6 shadow-sm">
                  {update.isPending ? "Saving..." : "Save Personal Info"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Academic Info */}
          {activeTab === "academic" && (
            <form onSubmit={handleSubmit((values) => update.mutate(values))} className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Academic Identity</h3>
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField label="Roll Number (Read-only)">
                  <input className="field text-xs py-2 bg-slate-100 border-0 cursor-not-allowed opacity-75" disabled value={user.rollNumber} />
                </FormField>
                <FormField label="Department" error={errors.department?.message}>
                  <input className="field text-xs py-2 bg-slate-50 border-0" required {...register("department")} />
                </FormField>
                <FormField label="Academic Year" error={errors.academicYear?.message}>
                  <select className="field text-xs py-2 bg-slate-50 border-0" required {...register("academicYear")}>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-white/5">
                <button type="submit" disabled={update.isPending} className="primary-button text-xs py-2 px-6 shadow-sm">
                  Save Academic Identity
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Skills & Interests */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Skills & Academic Interests</h3>
              
              {/* Skills section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Programming Skills & Tools</label>
                <form onSubmit={handleAddSkill} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add skill (e.g. Kotlin, Docker)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0 flex-1"
                  />
                  <button type="submit" className="primary-button text-xs py-1.5 px-4 shadow-sm">Add</button>
                </form>
                <div className="flex flex-wrap gap-2 pt-2">
                  {skillsList.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-750 dark:bg-white/5 dark:text-indigo-400">
                      {skill}
                      <button onClick={() => handleRemoveSkill(skill)} className="text-indigo-400 hover:text-indigo-650 ml-1"><X size={12} /></button>
                    </span>
                  ))}
                  {skillsList.length === 0 && (
                    <p className="text-xs text-slate-400">No skills added yet.</p>
                  )}
                </div>
              </div>

              {/* Interests tag editor */}
              <form onSubmit={handleSubmit((values) => update.mutate(values))} className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <FormField label="Campus / Academic Interests (Comma Separated)" error={errors.interestsText?.message}>
                  <input className="field text-xs py-2 bg-slate-50 border-0" required {...register("interestsText")} />
                </FormField>
                <div className="flex justify-end">
                  <button type="submit" disabled={update.isPending} className="primary-button text-xs py-2 px-6 shadow-sm">Save Interests</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Projects */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Projects Showcase</h3>
              
              {/* List existing projects */}
              <div className="space-y-4">
                {projectsList.map((proj) => (
                  <div key={proj.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-black/15 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{proj.title}</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">{proj.description}</p>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5 mt-1 hover:underline">
                          View Code/Live <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                    <button onClick={() => handleRemoveProject(proj.id)} className="text-rose-500 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                ))}
                {projectsList.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No personal projects showcase yet.</p>
                )}
              </div>

              {/* Add Project Form */}
              <form onSubmit={handleAddProject} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-ink-950 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Add New Project</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Project Title..."
                    required
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0"
                  />
                  <input
                    type="text"
                    placeholder="Project Link (GitHub/Portfolio)..."
                    value={projectLink}
                    onChange={(e) => setProjectLink(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0"
                  />
                </div>
                <textarea
                  placeholder="Project Description..."
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="field text-xs py-2 bg-slate-50 border-0 w-full"
                />
                <div className="flex justify-end">
                  <button type="submit" className="primary-button text-xs py-1.5 px-4 shadow-sm">+ Add Project</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: Communities */}
          {activeTab === "communities" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Joined Communities ({memberCommunities.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {memberCommunities.map((c) => (
                  <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-black/15 flex flex-col justify-between h-32">
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-slate-650 dark:bg-white/5 dark:text-slate-400 mb-1.5">
                        {c.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{c.name}</h4>
                      <p className="mt-1 text-[10px] text-slate-550 dark:text-slate-400 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>
                  </div>
                ))}
                {memberCommunities.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 sm:col-span-2">You haven't joined any communities yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Events */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Your Registered Events ({registeredEvents.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {registeredEvents.map((evt) => (
                  <div key={evt._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-black/15 flex flex-col justify-between h-32">
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-indigo-750 dark:bg-white/5 dark:text-indigo-400 mb-1.5">
                        {evt.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{evt.title}</h4>
                      <p className="mt-1 text-[10px] text-slate-550 dark:text-slate-400 truncate">Venue: {evt.venue}</p>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase pt-2">
                      <span>{evt.date}</span>
                      <span>{evt.time}</span>
                    </div>
                  </div>
                ))}
                {registeredEvents.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 sm:col-span-2">You haven't registered for any events yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: Achievements */}
          {activeTab === "achievements" && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Achievements & Honors</h3>
              
              {/* List achievements */}
              <div className="space-y-4">
                {achievementsList.map((ach) => (
                  <div key={ach.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-black/15 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ach.title}</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400">Issuer/Organization: <span className="font-semibold">{ach.organization}</span></p>
                      <span className="block text-[10px] text-slate-400">{ach.date}</span>
                    </div>
                    <button onClick={() => handleRemoveAchievement(ach.id)} className="text-rose-500 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                ))}
                {achievementsList.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No achievements logged yet.</p>
                )}
              </div>

              {/* Add Achievement Form */}
              <form onSubmit={handleAddAchievement} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-ink-950 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wider">Add Achievement</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Award/Honor Title..."
                    required
                    value={achievementTitle}
                    onChange={(e) => setAchievementTitle(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0 flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Issuer Organization..."
                    value={achievementOrg}
                    onChange={(e) => setAchievementOrg(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0 flex-1"
                  />
                  <input
                    type="date"
                    value={achievementDate}
                    onChange={(e) => setAchievementDate(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0 flex-1"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="primary-button text-xs py-1.5 px-4 shadow-sm">+ Add Achievement</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: Security & Preferences */}
          {activeTab === "security" && (
            <div className="space-y-8">
              
              {/* Change password */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Change Account Password</h3>
                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField label="Current Password">
                    <input
                      type="password"
                      className="field text-xs py-2 bg-slate-50 border-0"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </FormField>
                  <FormField label="New Password">
                    <input
                      type="password"
                      className="field text-xs py-2 bg-slate-50 border-0"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Confirm New Password">
                    <input
                      type="password"
                      className="field text-xs py-2 bg-slate-50 border-0"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!currentPassword || !newPassword) return;
                      if (newPassword !== confirmPassword) {
                        addToast("New passwords do not match.", "error");
                        return;
                      }
                      changePass.mutate();
                    }}
                    disabled={changePass.isPending}
                    className="primary-button text-xs py-2 px-6 shadow-sm"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Notification Preferences</h3>
                <div className="space-y-3">
                  {[
                    { key: "emailAlerts", label: "Email Alerts", desc: "Receive updates regarding campus events and notices via email." },
                    { key: "messageAlerts", label: "Direct Message Notifications", desc: "Show active alerts when peers direct message you." },
                    { key: "eventAlerts", label: "Registered Event Updates", desc: "Get notifications about schedule modifications for registered events." }
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={(notificationPrefs as any)[pref.key]}
                        onChange={(e) => {
                          const updated = { ...notificationPrefs, [pref.key]: e.target.checked };
                          setNotificationPrefs(updated);
                          saveExtendedData({ notifications: updated });
                          addToast("Preferences updated!", "success");
                        }}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-205">{pref.label}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{pref.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Privacy settings */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">Privacy & Profile Visibility</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Profile Visibility">
                    <select
                      value={privacySettings.profileVisibility}
                      onChange={(e) => {
                        const updated = { ...privacySettings, profileVisibility: e.target.value };
                        setPrivacySettings(updated);
                        saveExtendedData({ privacy: updated });
                        addToast("Privacy updated!", "success");
                      }}
                      className="field text-xs py-2 bg-slate-50 border-0"
                    >
                      <option value="PUBLIC">Public (All student users)</option>
                      <option value="CONNECTIONS">Connections Only</option>
                      <option value="PRIVATE">Private (Only moderators/admins)</option>
                    </select>
                  </FormField>

                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={privacySettings.showEmail}
                        onChange={(e) => {
                          const updated = { ...privacySettings, showEmail: e.target.checked };
                          setPrivacySettings(updated);
                          saveExtendedData({ privacy: updated });
                          addToast("Privacy updated!", "success");
                        }}
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show email publicly on profile card</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={privacySettings.showCommunities}
                        onChange={(e) => {
                          const updated = { ...privacySettings, showCommunities: e.target.checked };
                          setPrivacySettings(updated);
                          saveExtendedData({ privacy: updated });
                          addToast("Privacy updated!", "success");
                        }}
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show joined communities lists on profile</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Sidebar: Profile preview card */}
        <aside className="space-y-6">
          
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/5 dark:bg-ink-900">
            {/* Minimal banner preview */}
            <div className={`h-20 ${coverPhoto} w-full`} />
            
            <div className="p-5 flex flex-col items-center text-center -mt-8 space-y-4">
              <Avatar name={user.fullName} src={user.profilePicture} className="size-16 ring-4 ring-white dark:ring-ink-900" />
              
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.fullName}</h4>
                <span className="block text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">{user.department}</span>
                <span className="block text-[9px] text-slate-400">Year {user.academicYear} Student</span>
              </div>
              
              {user.bio && (
                <p className="text-[10px] text-slate-500 leading-relaxed dark:text-slate-400 italic line-clamp-3">"{user.bio}"</p>
              )}
            </div>

            {/* Social media footer */}
            {(socials.github || socials.linkedin || socials.portfolio) && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-ink-950 flex justify-center gap-4 text-xs font-bold text-indigo-650 dark:text-indigo-400">
                {socials.github && (
                  <a href={socials.github} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
                )}
                {socials.linkedin && (
                  <a href={socials.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>
                )}
                {socials.portfolio && (
                  <a href={socials.portfolio} target="_blank" rel="noreferrer" className="hover:underline">Portfolio</a>
                )}
              </div>
            )}
          </div>

          {/* Core metadata stats */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Summary</h4>
            <div className="space-y-2.5 text-xs font-bold text-slate-700 dark:text-slate-350">
              <div className="flex justify-between">
                <span>Joined circles</span>
                <span className="text-slate-900 dark:text-white">{memberCommunities.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Registered events</span>
                <span className="text-slate-900 dark:text-white">{registeredEvents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Project showcase</span>
                <span className="text-slate-900 dark:text-white">{projectsList.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Achievements logged</span>
                <span className="text-slate-900 dark:text-white">{achievementsList.length}</span>
              </div>
            </div>
          </div>

        </aside>
      </div>

      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </div>
  );
}
