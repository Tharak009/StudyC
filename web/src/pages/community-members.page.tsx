import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldPlus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { CommunityMembersList } from "../components/community-members-list";
import { FormField } from "../components/form-field";
import { LoadingScreen } from "../components/loading-screen";
import { getErrorMessage } from "../utils/errors";

export function CommunityMembersPage() {
  const { id } = useParams();
  const [moderatorId, setModeratorId] = useState("");
  const queryClient = useQueryClient();
  const community = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });
  const members = useQuery({
    queryKey: ["community-members", id],
    queryFn: () => communitiesApi.members(id!),
    enabled: Boolean(id)
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["community-members", id] });
    queryClient.invalidateQueries({ queryKey: ["community", id] });
    queryClient.invalidateQueries({ queryKey: ["communities"] });
  };

  const addModerator = useMutation({
    mutationFn: () => communitiesApi.addModerator(id!, moderatorId),
    onSuccess: () => {
      setModeratorId("");
      refresh();
    }
  });
  const removeModerator = useMutation({
    mutationFn: (userId: string) => communitiesApi.removeModerator(id!, userId),
    onSuccess: refresh
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => communitiesApi.removeMember(id!, userId),
    onSuccess: refresh
  });

  if (community.isLoading || members.isLoading) return <LoadingScreen />;
  if (community.isError || members.isError || !community.data || !members.data) {
    return <p className="text-sm text-red-500">Members could not be loaded.</p>;
  }

  const isOwner = community.data.membershipRole === "OWNER";

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <header className="border-b border-slate-200 pb-7 dark:border-white/10">
        <Link to={`/communities/${id}`} className="text-sm font-semibold text-signal-600 dark:text-signal-300">
          Back to community
        </Link>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Members</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          View members and manage moderation roles for {community.data.name}.
        </p>
      </header>

      {isOwner && (
        <form
          className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            addModerator.mutate();
          }}
        >
          <div className="flex-1">
            <FormField
              label="User ID"
              value={moderatorId}
              onChange={(event) => setModeratorId(event.target.value)}
              placeholder="Paste a member user id"
            />
          </div>
          <button className="primary-button" type="submit" disabled={!moderatorId || addModerator.isPending}>
            <ShieldPlus size={17} />
            Add moderator
          </button>
        </form>
      )}

      {(addModerator.isError || removeModerator.isError || removeMember.isError) && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {getErrorMessage(addModerator.error ?? removeModerator.error ?? removeMember.error)}
        </p>
      )}

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 dark:border-white/10 dark:bg-white/[0.04]">
        <CommunityMembersList
          members={members.data}
          viewerRole={community.data.membershipRole}
          onRemoveMember={(userId) => removeMember.mutate(userId)}
          onRemoveModerator={(userId) => removeModerator.mutate(userId)}
        />
      </section>
    </div>
  );
}
