import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { ProfileHeader, type StudentProfileData } from "../components/profile/ProfileHeader";
import { ProfileTabs, type ProfileTabType } from "../components/profile/ProfileTabs";
import { OverviewTab } from "../components/profile/OverviewTab";
import { ConnectionsTab } from "../components/profile/ConnectionsTab";
import { ContributionsTab } from "../components/profile/ContributionsTab";
import { BookmarksTab } from "../components/profile/BookmarksTab";
import { EditProfileModal } from "../components/profile/EditProfileModal";
import { useAuthStore } from "../store/auth.store";
import { usersApi } from "../api/users.api";
import { useToastStore } from "../store/toast.store";
import { AdminProfilePage } from "./admin-profile.page";
import { getStudyStreak, STREAK_EVENT } from "../utils/streak";

export interface ProfilePageProps {
  go?: (p: any) => void;
  dark?: boolean;
  tog?: () => void;
}

function getDynamicCounts() {
  let notesUploaded = 0;
  let totalDownloads = "0";
  let connectionsCount = 0;
  let bookmarksCount = 0;
  let studyStreakDays = 0;

  try {
    studyStreakDays = getStudyStreak().currentStreak;
  } catch {}

  try {
    const rawVault = localStorage.getItem("studyconnect_vault_resources");
    if (rawVault) {
      const vault = JSON.parse(rawVault);
      notesUploaded = vault.length;
      const dls = vault.reduce((sum: number, r: any) => sum + (r.downloadCount || 0), 0);
      totalDownloads = dls >= 1000 ? `${(dls / 1000).toFixed(1)}K` : `${dls}`;
    }
  } catch {}

  try {
    const rawPeers = localStorage.getItem("studyconnect_peer_directory");
    if (rawPeers) {
      const peers = JSON.parse(rawPeers);
      connectionsCount = peers.length;
    }
  } catch {}

  try {
    const rawBookmarks = localStorage.getItem("studyconnect_bookmarked_resources");
    if (rawBookmarks) {
      const bookmarks = JSON.parse(rawBookmarks);
      bookmarksCount = bookmarks.length;
    }
  } catch {}

  return { notesUploaded, totalDownloads, connectionsCount, bookmarksCount, studyStreakDays };
}

function loadStoredProfile(user: any): StudentProfileData {
  let saved: Partial<StudentProfileData> = {};
  try {
    const raw = localStorage.getItem("studyconnect_user_profile");
    if (raw) saved = JSON.parse(raw);
  } catch {}

  const dynamicCounts = getDynamicCounts();

  return {
    fullName: saved.fullName || user?.fullName || "Student User",
    email: saved.email || user?.email || "student@campus.edu",
    rollNumber: saved.rollNumber || user?.rollNumber || "STU-001",
    department: saved.department || user?.department || "Department Not Set",
    academicYear: saved.academicYear || (user?.academicYear ? `Year ${user.academicYear}` : "Academic Year Not Set"),
    bio: saved.bio ?? (user?.bio || ""),
    interests: saved.interests ?? (user?.interests || []),
    githubUrl: saved.githubUrl || "",
    linkedinUrl: saved.linkedinUrl || "",
    portfolioUrl: saved.portfolioUrl || "",
    notesUploaded: dynamicCounts.notesUploaded,
    totalDownloads: dynamicCounts.totalDownloads,
    connectionsCount: dynamicCounts.connectionsCount,
    studyStreakDays: dynamicCounts.studyStreakDays,
    isOnline: true,
    profilePicture: saved.profilePicture || user?.profilePicture
  };
}

export function ProfilePage({ go, dark, tog }: ProfilePageProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<ProfileTabType>("overview");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewAsStudent, setViewAsStudent] = useState(false);

  // If authenticated user is Admin or Moderator and hasn't toggled student preview, render AdminProfilePage
  if ((user?.role === "ADMIN" || user?.role === "MODERATOR") && !viewAsStudent) {
    return <AdminProfilePage onSwitchToStudentView={() => setViewAsStudent(true)} />;
  }

  const [counts, setCounts] = useState(getDynamicCounts);
  const [profileData, setProfileData] = useState<StudentProfileData>(() => loadStoredProfile(user));

  // Refresh counts whenever tab changes, modal closes, or streak updates
  React.useEffect(() => {
    const refreshAll = () => {
      const nextCounts = getDynamicCounts();
      setCounts(nextCounts);
      setProfileData((prev) => ({
        ...prev,
        notesUploaded: nextCounts.notesUploaded,
        totalDownloads: nextCounts.totalDownloads,
        connectionsCount: nextCounts.connectionsCount,
        studyStreakDays: nextCounts.studyStreakDays
      }));
    };

    refreshAll();

    window.addEventListener(STREAK_EVENT, refreshAll);
    window.addEventListener("storage", refreshAll);
    return () => {
      window.removeEventListener(STREAK_EVENT, refreshAll);
      window.removeEventListener("storage", refreshAll);
    };
  }, [activeTab, editModalOpen]);

  const handleUploadAvatar = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast("File size exceeds 5MB limit", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const previewUrl = reader.result as string;
      setProfileData((prev) => {
        const next = { ...prev, profilePicture: previewUrl };
        try {
          localStorage.setItem("studyconnect_user_profile", JSON.stringify(next));
        } catch {}
        return next;
      });
      if (user) {
        setUser({ ...user, profilePicture: previewUrl });
      }
      addToast("Profile picture updated successfully!", "success");

      try {
        const updated = await usersApi.uploadProfilePicture(file);
        if (updated?.profilePicture) {
          setProfileData((prev) => {
            const next = { ...prev, profilePicture: updated.profilePicture };
            try {
              localStorage.setItem("studyconnect_user_profile", JSON.stringify(next));
            } catch {}
            return next;
          });
          setUser(updated);
        }
      } catch {
        // Retain preview URL if backend is offline
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setProfileData((prev) => {
      const next = { ...prev, profilePicture: undefined };
      try {
        localStorage.setItem("studyconnect_user_profile", JSON.stringify(next));
      } catch {}
      return next;
    });
    if (user) {
      setUser({ ...user, profilePicture: undefined });
    }
    addToast("Profile picture removed", "info");
  };

  const handleSaveProfile = (updated: Partial<StudentProfileData>) => {
    setProfileData((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem("studyconnect_user_profile", JSON.stringify(next));
      } catch {}
      return next;
    });
    if (user) {
      setUser({
        ...user,
        fullName: updated.fullName ?? user.fullName,
        bio: updated.bio ?? user.bio,
        interests: updated.interests ?? user.interests,
        profilePicture: updated.profilePicture !== undefined ? updated.profilePicture : user.profilePicture
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300">
      
      {/* ── 1. Leftmost Workspace Sidebar ─────────────────────────────── */}
      <DashboardSidebar />

      {/* ── 2. Main Profile Content Stream ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
          {/* Admin Switcher Banner */}
          {(user?.role === "ADMIN" || user?.role === "MODERATOR") && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1E90FF]/10 border border-[#1E90FF]/30 text-xs font-bold text-[#1E90FF]">
              <span>Viewing Student Profile Preview Mode</span>
              <button
                type="button"
                onClick={() => setViewAsStudent(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#1E90FF] text-white hover:bg-[#187bcd] transition-all cursor-pointer shadow-sm shadow-[#1E90FF]/25"
              >
                Return to Admin Governance Profile
              </button>
            </div>
          )}

          {/* Academic Identity Header Card */}
          <ProfileHeader
            profile={profileData}
            onEditClick={() => setEditModalOpen(true)}
            onUploadAvatar={handleUploadAvatar}
            onRemoveAvatar={handleRemoveAvatar}
          />

          {/* Navigation Tabs Bar */}
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            networkCount={counts.connectionsCount}
            contributionsCount={counts.notesUploaded}
            bookmarksCount={counts.bookmarksCount}
          />

          {/* Active Tab View */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <OverviewTab />
                </motion.div>
              )}

              {activeTab === "network" && (
                <motion.div
                  key="network"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ConnectionsTab />
                </motion.div>
              )}

              {activeTab === "contributions" && (
                <motion.div
                  key="contributions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ContributionsTab />
                </motion.div>
              )}

              {activeTab === "bookmarks" && (
                <motion.div
                  key="bookmarks"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <BookmarksTab />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </main>
      </div>

      {/* ── Edit Profile Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {editModalOpen && (
          <EditProfileModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            profile={profileData}
            onSave={handleSaveProfile}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default ProfilePage;
