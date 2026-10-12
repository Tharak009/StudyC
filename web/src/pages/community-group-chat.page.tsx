import React from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { communitiesApi } from "../api/communities.api";
import { communityGroupsApi } from "../api/community-groups.api";
import { CommunityGroupChatView } from "../components/community/community-group-chat-view";

export function CommunityGroupChatPage() {
  const { communityId, groupId } = useParams<{ communityId: string; groupId: string }>();
  const navigate = useNavigate();

  const communityQuery = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => communitiesApi.details(communityId!),
    enabled: Boolean(communityId)
  });
  const groupQuery = useQuery({
    queryKey: ["community-group", communityId, groupId],
    queryFn: () => communityGroupsApi.get(communityId!, groupId!),
    enabled: Boolean(communityId && groupId)
  });

  if (communityQuery.isLoading || groupQuery.isLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-6">
        <Loader2 size={32} className="mb-3 animate-spin text-[#1E90FF]" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loading group conversation...
        </p>
      </div>
    );
  }

  if (communityQuery.isError || groupQuery.isError || !communityQuery.data || !groupQuery.data) {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-8 scrollbar-none">
        <Link
          to={communityId ? `/communities/${communityId}` : "/communities"}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ChevronLeft size={14} />
          <span>Back to Community</span>
        </Link>
        <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-500/20 dark:bg-red-950/20">
          <h1 className="mb-2 text-sm font-bold text-red-600 dark:text-red-400">Group Not Found</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The group you requested could not be loaded or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <CommunityGroupChatView
        community={communityQuery.data}
        group={groupQuery.data}
        onBackToOverview={() => navigate(`/communities/${communityId}`)}
        onToggleChannels={() => navigate(`/communities/${communityId}`)}
      />
    </div>
  );
}
