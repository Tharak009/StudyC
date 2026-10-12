import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    profilePicture: user?.profilePicture || saved.profilePicture
  };
}

export function ProfilePage({ go, dark, tog }: ProfilePageProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<ProfileTabType>("overview");
  const [editModalOpen, setEditModalOpen] = useState(false);

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

  const persistProfilePicture = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds 5MB limit");
    }

    const updatedUser = await usersApi.uploadProfilePicture(file);
    if (!updatedUser?.profilePicture) throw new Error("The server did not return the saved profile photo");
    setUser(updatedUser);
    setProfileData((prev) => {
      const next = { ...prev, profilePicture: updatedUser.profilePicture };
      try {
        localStorage.setItem("studyconnect_user_profile", JSON.stringify(next));
      } catch {}
      return next;
    });
    return updatedUser.profilePicture;
  };

  const handleUploadAvatar = async (file: File) => {
    try {
      await persistProfilePicture(file);
      addToast("Profile photo saved and synced across StudyConnect.", "success");
    } catch (error: any) {
      addToast(error?.response?.data?.message || error?.message || "Could not upload profile photo", "error");
    }
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

  const handleSaveProfile = async (updated: Partial<StudentProfileData>) => {
    let profilePicture = updated.profilePicture;
    if (profilePicture?.startsWith("data:")) {
      const blob = await (await fetch(profilePicture)).blob();
      const extension = blob.type.split("/")[1] || "jpg";
      const uploaded = await usersApi.uploadProfilePicture(
        new File([blob], `profile-picture.${extension}`, { type: blob.type || "image/jpeg" })
      );
      profilePicture = uploaded.profilePicture;
      if (!profilePicture) throw new Error("The server did not return the saved profile photo");
      setUser(uploaded);
    }

    setProfileData((prev) => {
      const next = { ...prev, ...updated, profilePicture };
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
        profilePicture: profilePicture !== undefined ? profilePicture : user.profilePicture
      });
    }
  };

  // Administrators use their own profile experience rather than a student preview mode.
  if (user?.role === "ADMIN" || user?.role === "MODERATOR") {
    return <AdminProfilePage />;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto bg-slate-50 font-sans antialiased text-slate-900 transition-colors duration-300 dark:bg-[#080D1A] dark:text-slate-50">
        <main className="p-4 sm:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
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
