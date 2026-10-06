import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { communitiesApi } from "../api/communities.api";
import { communityGroupsApi } from "../api/community-groups.api";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { CommunitySidebar } from "../components/community/community-sidebar";
import { CommunityMembersView } from "../components/community/community-members-view";
import { CreateGroupModal } from "../components/community/create-group-modal";
import { AttachGroupModal } from "../components/community/attach-group-modal";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";

export function CommunityMembersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAttachGroupOpen, setIsAttachGroupOpen] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 1. Fetch Community Details
  const communityQuery = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });

  // 2. Fetch All Community Groups (for sidebar)
  const groupsQuery = useQuery({
    queryKey: ["community-groups", id],
    queryFn: () => communityGroupsApi.list(id!),
    enabled: Boolean(id)
  });

  const community = communityQuery.data;
  const groups = groupsQuery.data || [];

  // Lifecycle mutations
  const archiveMutation = useMutation({
    mutationFn: () => communitiesApi.archive(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["community", id], updated);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("Community archived", "success");
    }
  });

  const restoreMutation = useMutation({
    mutationFn: () => communitiesApi.restore(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["community", id], updated);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("Community restored", "success");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => communitiesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("Community deleted", "info");
      navigate("/communities");
    }
  });

  const leaveMutation = useMutation({
    mutationFn: () => communitiesApi.leave(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      addToast("You have left the community", "info");
      navigate("/communities");
    }
  });

  if (communityQuery.isLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden font-sans text-slate-900 dark:text-slate-100">
        <DashboardSidebar currentNav="/communities" />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Loader2 size={36} className="animate-spin text-[#1E90FF] mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Loading community members...
          </p>
        </div>
      </div>
    );
  }

  if (communityQuery.isError || !community) {
    return (
      <div className="flex h-screen w-full bg-slate-100 dark:bg-[#080D1A] overflow-hidden font-sans text-slate-900 dark:text-slate-100">
        <DashboardSidebar currentNav="/communities" />
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <Link
            to={`/communities/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
          >
            <ChevronLeft size={14} />
            <span>Back to Community</span>
          </Link>
          <div className="p-6 rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-950/20 max-w-lg">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-semibold mb-2">
              <AlertCircle size={18} />
              <span>Community Not Found</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              The community you requested does not exist or has been deleted.
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
          activeItemId="members"
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
              activeItemId="members"
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

      {/* 3. Main Workspace: Modern Members View */}
      <CommunityMembersView
        community={community}
        onBackToOverview={() => navigate(`/communities/${id}`)}
      />

      {/* Modals */}
      <CreateGroupModal
        communityId={community._id}
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={() => {
          setIsCreateGroupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["community-groups", id] });
        }}
      />

      <AttachGroupModal
        communityId={community._id}
        existingGroups={groups}
        isOpen={isAttachGroupOpen}
        onClose={() => setIsAttachGroupOpen(false)}
        onSuccess={() => {
          setIsAttachGroupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["community-groups", id] });
        }}
      />
    </div>
  );
}
