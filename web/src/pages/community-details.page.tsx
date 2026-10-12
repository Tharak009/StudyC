import React from "react";
import { useParams, useOutletContext } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { communitiesApi } from "../api/communities.api";
import { communityGroupsApi } from "../api/community-groups.api";
import { LoadingScreen } from "../components/loading-screen";
import { CommunityOverviewView } from "../components/community/community-overview-view";
import type { CommunitiesWorkspaceOutletContext } from "../components/community/communities-workspace-layout";

export function CommunityDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { openCreateGroup } = useOutletContext<CommunitiesWorkspaceOutletContext>();

  const communityQuery = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });
  const groupsQuery = useQuery({
    queryKey: ["community-groups", id],
    queryFn: () => communityGroupsApi.list(id!),
    enabled: Boolean(id)
  });

  if (communityQuery.isLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
        <LoadingScreen />
      </div>
    );
  }

  if (communityQuery.isError || !communityQuery.data) {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-8 scrollbar-none">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-500/20 dark:bg-red-950/20">
          <h1 className="mb-2 text-sm font-bold text-red-600 dark:text-red-400">
            Community Not Found
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The community you requested does not exist, has been deleted, or could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <CommunityOverviewView
        community={communityQuery.data}
        groups={groupsQuery.data || []}
        onOpenCreateGroup={openCreateGroup}
      />
    </div>
  );
}
