import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Mail,
  Hash,
  GraduationCap,
  Github,
  Linkedin,
  Globe,
  Pencil,
  Flame,
  FileText,
  Download,
  Users,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  Eye
} from "lucide-react";
import type { User as AuthUser } from "../../types/auth";
import { ImageViewerModal } from "../chat/media/ImageViewerModal";

export interface StudentProfileData {
  fullName: string;
  email: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  bio: string;
  interests: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  notesUploaded: number;
  totalDownloads: string;
  connectionsCount: number;
  studyStreakDays: number;
  isOnline: boolean;
  profilePicture?: string;
}

interface ProfileHeaderProps {
  profile: StudentProfileData;
  onEditClick: () => void;
  onUploadAvatar?: (file: File) => void;
  onRemoveAvatar?: () => void;
}

export function ProfileHeader({
  profile,
  onEditClick,
  onUploadAvatar,
  onRemoveAvatar
}: ProfileHeaderProps) {
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0F1A30]/85 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
      
      {/* Ambient Gradient Background Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#1E90FF]/15 dark:bg-[#1E90FF]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-[#1E90FF]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* ── Avatar & Student Identity ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          
          {/* Avatar with Status Ring & Upload Overlay */}
          <div className="relative shrink-0 group">
            <div
              onClick={() => {
                if (profile.profilePicture && !onUploadAvatar) {
                  setIsPhotoViewerOpen(true);
                }
              }}
              className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-[#1E90FF] text-white font-extrabold text-2xl sm:text-3xl shadow-lg shadow-[#1E90FF]/30 overflow-hidden ${
                profile.profilePicture && !onUploadAvatar ? "cursor-pointer" : ""
              }`}
            >
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(profile.fullName)
              )}

              {/* Upload Overlay for Owner, or View Overlay for Viewer */}
              {onUploadAvatar ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change custom profile picture"
                  className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                >
                  <Camera size={22} />
                  <span className="text-[10px] font-bold mt-1">Upload</span>
                </button>
              ) : profile.profilePicture ? (
                <button
                  type="button"
                  onClick={() => setIsPhotoViewerOpen(true)}
                  title="View profile photo"
                  className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                >
                  <Eye size={22} />
                  <span className="text-[10px] font-bold mt-1">View</span>
                </button>
              ) : null}
            </div>

            {/* Quick Change Badge on Corner for Owner Only */}
            {onUploadAvatar && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload custom photo"
                className="absolute -top-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1E90FF] hover:bg-[#187bcd] text-white shadow-md border-2 border-white dark:border-[#0F1A30] transition-transform hover:scale-110 cursor-pointer"
              >
                <Camera size={13} />
              </button>
            )}

            {onUploadAvatar && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadAvatar?.(file);
                  }
                }}
              />
            )}

            {/* Verified .EDU Badge */}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1E90FF] text-white shadow-md border-2 border-white dark:border-[#0F1A30]" title="Verified Institutional Student">
              <ShieldCheck size={16} />
            </div>

            {/* Online Status Beacon */}
            <span
              className={`absolute top-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-[#0F1A30] ${
                profile.isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </div>

          {/* Student Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {profile.fullName}
              </h1>
              <span className="tabular-nums text-xs font-bold text-[#1E90FF] bg-[#1E90FF]/10 px-2 py-0.5 rounded-lg border border-[#1E90FF]/20">
                {profile.rollNumber}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <GraduationCap size={15} className="text-[#1E90FF] shrink-0" />
              <span>{profile.department} • {profile.academicYear}</span>
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span>{profile.email}</span>
              </p>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                {profile.profilePicture && (
                  <button
                    type="button"
                    onClick={() => setIsPhotoViewerOpen(true)}
                    className="text-slate-600 dark:text-slate-300 hover:text-[#1E90FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>View photo</span>
                  </button>
                )}
                {onUploadAvatar && (
                  <>
                    {profile.profilePicture && <span className="text-slate-400">•</span>}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#1E90FF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload size={12} />
                      <span>{profile.profilePicture ? "Change photo" : "Upload photo"}</span>
                    </button>
                  </>
                )}
                {onRemoveAvatar && profile.profilePicture && (
                  <>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={onRemoveAvatar}
                      className="text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Academic Bio */}
            {profile.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed pt-1">
                {profile.bio}
              </p>
            )}

            {/* Interest Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#162544] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800"
                >
                  #{interest}
                </span>
              ))}
            </div>

            {/* Social / Portfolio Links */}
            <div className="flex items-center gap-2 pt-1 text-slate-400">
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="GitHub Profile"
                >
                  <Github size={15} />
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={15} />
                </a>
              )}
              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Portfolio Website"
                >
                  <Globe size={15} />
                </a>
              )}
            </div>

          </div>

        </div>

        {/* ── Right Actions & KPI Metrics ──────────────────────────────── */}
        <div className="flex flex-col sm:items-end justify-between gap-4 shrink-0">
          
          {/* Edit Profile Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEditClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1E90FF]/50 hover:text-[#1E90FF] shadow-sm transition-all cursor-pointer"
          >
            <Pencil size={13} />
            <span>Edit Profile</span>
          </motion.button>

          {/* Quick KPI Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            <div className="p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-[#080D1A]/60 text-center">
              <span className="text-[10px] text-slate-400">Uploads</span>
              <div className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                {profile.notesUploaded}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-[#080D1A]/60 text-center">
              <span className="text-[10px] text-slate-400">Downloads</span>
              <div className="text-sm font-extrabold tabular-nums text-[#1E90FF]">
                {profile.totalDownloads}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-[#080D1A]/60 text-center">
              <span className="text-[10px] text-slate-400">Peers</span>
              <div className="text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                {profile.connectionsCount}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-[#080D1A]/60 text-center">
              <span className="text-[10px] text-slate-400">Streak</span>
              <div className="text-sm font-extrabold tabular-nums text-amber-500">
                {profile.studyStreakDays}d 🔥
              </div>
            </div>
          </div>

        </div>
      </div>

      {profile.profilePicture && (
        <ImageViewerModal
          isOpen={isPhotoViewerOpen}
          images={[
            {
              url: profile.profilePicture,
              originalName: `${profile.fullName}'s Profile Photo`,
              caption: `${profile.fullName} (${profile.rollNumber} • ${profile.department})`
            }
          ]}
          onClose={() => setIsPhotoViewerOpen(false)}
        />
      )}
    </div>
  );
}

export default ProfileHeader;
