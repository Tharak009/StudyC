import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  X,
  User,
  Sparkles,
  Github,
  Linkedin,
  Globe,
  Tag,
  Check,
  Camera,
  Trash2
} from "lucide-react";
import type { StudentProfileData } from "./ProfileHeader";
import { useToastStore } from "../../store/toast.store";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfileData;
  onSave: (updated: Partial<StudentProfileData>) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onSave
}: EditProfileModalProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio);
  const [tagInput, setTagInput] = useState("");
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl || "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || "");
  const [profilePicture, setProfilePicture] = useState<string | undefined>(profile.profilePicture);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastStore();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("File size exceeds 5MB limit", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddInterest = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !interests.includes(val)) {
        setInterests([...interests, val]);
        setTagInput("");
      }
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((i) => i !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fullName,
      bio,
      interests,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
      profilePicture
    });
    addToast("Academic profile updated successfully!", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F1A30] p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1">
          Edit Academic Profile
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Update your academic interests, bio, and peer networking links.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload / Preview Card */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800">
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-2xl bg-[#1E90FF] text-white flex items-center justify-center font-bold text-xl shadow-md overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt="Avatar Preview" className="h-full w-full object-cover" />
                ) : (
                  fullName.slice(0, 2).toUpperCase() || "ST"
                )}
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Custom Profile Picture
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload a custom JPG, PNG, or WebP photo (max 5MB).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-[#1E90FF] hover:bg-[#187bcd] text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Camera size={13} />
                  <span>{profilePicture ? "Change Photo" : "Upload Photo"}</span>
                </button>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={() => setProfilePicture(undefined)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Academic Bio & Research Focus
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. 3rd-year CSE undergraduate researching distributed consensus protocols..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Research & Study Interests (Press Enter)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A]">
              {interests.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#1E90FF] bg-[#1E90FF]/10 border border-[#1E90FF]/20 px-2 py-0.5 rounded-md"
                >
                  #{tag}
                  <button type="button" onClick={() => removeInterest(tag)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add topic..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddInterest}
                className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none flex-1 min-w-[80px]"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Social / Project Links
            </label>
            
            <div className="relative">
              <Github size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
              />
            </div>

            <div className="relative">
              <Linkedin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E90FF]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187bcd] text-white text-xs font-bold shadow-md shadow-[#1E90FF]/25 cursor-pointer transition-all"
            >
              <Check size={14} />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EditProfileModal;
