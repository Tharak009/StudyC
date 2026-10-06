import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { communitiesApi } from "../api/communities.api";
import { communityGroupsApi } from "../api/community-groups.api";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { CommunitySidebar } from "../components/community/community-sidebar";
import { CommunityGroupChatView } from "../components/community/community-group-chat-view";
import { CreateGroupModal } from "../components/community/create-group-modal";
import { AttachGroupModal } from "../components/community/attach-group-modal";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";

export function CommunityGroupChatPage() {
  const { communityId, groupId } = useParams<{ communityId: string; groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAttachGroupOpen, setIsAttachGroupOpen] = useState(false);

  // 1. Fetch Community Details
  const communityQuery = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => communitiesApi.details(communityId!),
    enabled: Boolean(communityId)
  });

  // 2. Fetch All Community Groups (for sidebar)
  const groupsQuery = useQuery({
    queryKey: ["community-groups", communityId],
    queryFn: () => communityGroupsApi.list(communityId!),
    enabled: Boolean(communityId)
  });

  // 3. Fetch Specific Active Group Details
  const groupQuery = useQuery({
    queryKey: ["community-group", communityId, groupId],
    queryFn: () => communityGroupsApi.get(communityId!, groupId!),
    enabled: Boolean(communityId && groupId)
  });

  const community = communityQuery.data;
  const groups = groupsQuery.data || [];
  const group = groupQuery.data;

  // Lifecycle mutations
  const archiveMutation = useMutation({
    mutationFn: () => communitiesApi.archive(communityId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["community", communityId], updated);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("Community archived", "success");
    }
  });

  const restoreMutation = useMutation({
    mutationFn: () => communitiesApi.restore(communityId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["community", communityId], updated);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("Community restored", "success");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => communitiesApi.delete(communityId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("Community deleted", "info");
      navigate("/communities");
    }
  });

  const leaveMutation = useMutation({
    mutationFn: () => communitiesApi.leave(communityId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("You have left the community", "info");
      navigate("/communities");
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isLoading = communityQuery.isLoading || groupQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden font-sans text-slate-900 dark:text-slate-100">
        <DashboardSidebar currentNav="/communities" />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Loader2 size={36} className="animate-spin text-[#1E90FF] mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Loading group conversation...
          </p>
        </div>
      </div>
    );
  }

  if (communityQuery.isError || groupQuery.isError || !community || !group) {
    return (
      <div className="flex h-screen w-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden font-sans text-slate-900 dark:text-slate-100">
        <DashboardSidebar currentNav="/communities" />
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <Link
            to={communityId ? `/communities/${communityId}` : "/communities"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
          >
            <ChevronLeft size={14} />
            <span>Back to Community</span>
          </Link>
          <div className="p-6 rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-950/20 max-w-lg">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-semibold mb-2">
              <AlertCircle size={18} />
              <span>Group Not Found</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              The group you requested could not be loaded or has been deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      {/* 1. Global Navigation Sidebar */}
      <DashboardSidebar currentNav="/communities" />

      {/* 2. Dedicated Community Navigation Sidebar (Desktop) */}
      <div className="hidden lg:flex h-full">
        <CommunitySidebar
          community={community}
          groups={groups}
          activeItemId={groupId}
          isLoadingGroups={groupsQuery.isLoading}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenAttachGroup={() => setIsAttachGroupOpen(true)}
          onArchive={() => {
            if (window.confirm("Archive this community? It will become read-only.")) {
              archiveMutation.mutate();
            }
          }}
          onRestore={() => {
            if (window.confirm("Restore this community to active status?")) {
              restoreMutation.mutate();
            }
          }}
          onDelete={() => {
            if (window.confirm("Are you sure you want to delete this community?")) {
              deleteMutation.mutate();
            }
          }}
          onLeave={() => {
            if (window.confirm("Are you sure you want to leave this community?")) {
              leaveMutation.mutate();
            }
          }}
        />
      </div>

      {/* 2B. Mobile Community Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-72 max-w-[85vw] shadow-2xl">
            <CommunitySidebar
              community={community}
              groups={groups}
              activeItemId={groupId}
              isLoadingGroups={groupsQuery.isLoading}
              onOpenCreateGroup={() => {
                setIsMobileSidebarOpen(false);
                setIsCreateGroupOpen(true);
              }}
              onOpenAttachGroup={() => {
                setIsMobileSidebarOpen(false);
                setIsAttachGroupOpen(true);
              }}
              onArchive={() => {
                setIsMobileSidebarOpen(false);
                if (window.confirm("Archive this community?")) {
                  archiveMutation.mutate();
                }
              }}
              onRestore={() => {
                setIsMobileSidebarOpen(false);
                if (window.confirm("Restore this community?")) {
                  restoreMutation.mutate();
                }
              }}
              onDelete={() => {
                setIsMobileSidebarOpen(false);
                if (window.confirm("Delete this community?")) {
                  deleteMutation.mutate();
                }
              }}
              onLeave={() => {
                setIsMobileSidebarOpen(false);
                if (window.confirm("Leave this community?")) {
                  leaveMutation.mutate();
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Realtime Group Chat View */}
      <CommunityGroupChatView
        community={community}
        group={group}
        onBackToOverview={() => navigate(`/communities/${communityId}`)}
        onToggleChannels={() => setIsMobileSidebarOpen(true)}
      />

      {/* Modals */}
      <CreateGroupModal
        communityId={community._id}
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={(newGroup) => {
          setIsCreateGroupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["community-groups", communityId] });
          navigate(`/communities/${communityId}/groups/${newGroup._id}`);
        }}
      />

      <AttachGroupModal
        communityId={community._id}
        existingGroups={groups}
        isOpen={isAttachGroupOpen}
        onClose={() => setIsAttachGroupOpen(false)}
        onSuccess={(attachedGroup) => {
          setIsAttachGroupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["community-groups", communityId] });
          navigate(`/communities/${communityId}/groups/${attachedGroup._id}`);
        }}
      />
    </div>
  );
}
