import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, FileText, Lock, MessageSquareText, Settings, UsersRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { CommunityBanner } from "../components/community-banner";
import { LoadingScreen } from "../components/loading-screen";
import { getErrorMessage } from "../utils/errors";

export function CommunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });

  const join = useMutation({
    mutationFn: () => communitiesApi.join(id!),
    onSuccess: (community) => {
      queryClient.setQueryData(["community", id], community);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    }
  });

  const leave = useMutation({
    mutationFn: () => communitiesApi.leave(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", id] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    }
  });

  const remove = useMutation({
    mutationFn: () => communitiesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      navigate("/communities");
    }
  });

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) {
    return <p className="text-sm text-red-500">Community could not be loaded.</p>;
  }

  const community = query.data;
  const isOwner = community.membershipRole === "OWNER";
  const canManage = isOwner || community.membershipRole === "MODERATOR";

  return (
    <div className="animate-fade-up">
      <CommunityBanner community={community} />

      <div className="grid gap-9 py-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="flex flex-wrap gap-2">
            {community.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-7 dark:border-white/10">
            <h2 className="text-xl font-semibold tracking-[-0.025em]">Community workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Membership, moderation, and discovery are active. Chat, resources, and notifications are reserved for later phases.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Community chat", "Resources", "Notifications"].map((item) => (
                <div key={item} className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
                  {item}
                  <span className="mt-1 block text-xs">Extension point</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Membership</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {community.membershipRole ?? "Not joined"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <UsersRound size={16} />
                {community.memberCount}
              </span>
            </div>
            <div className="mt-5 space-y-2">
              {community.isMember && (
                <>
                  <Link to={`/communities/${community._id}/chat`} className="primary-button w-full">
                    <MessageSquareText size={16} />
                    Open chat
                  </Link>
                  <Link to={`/communities/${community._id}/resources`} className="primary-button w-full">
                    <FileText size={16} />
                    Resources
                  </Link>
                </>
              )}
              {community.isMember ? (
                <button
                  className="secondary-button w-full"
                  type="button"
                  disabled={leave.isPending || isOwner}
                  onClick={() => leave.mutate()}
                >
                  Leave community
                </button>
              ) : (
                <button className="primary-button w-full" type="button" disabled={join.isPending} onClick={() => join.mutate()}>
                  Join community
                </button>
              )}
              <Link to={`/communities/${community._id}/members`} className="secondary-button w-full">
                <UsersRound size={16} />
                View members
              </Link>
            </div>
            {(join.isError || leave.isError || remove.isError) && (
              <p className="mt-3 text-xs text-red-500">
                {getErrorMessage(join.error ?? leave.error ?? remove.error)}
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Lock size={15} />
              {community.visibility}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Owned by {community.owner.fullName}
            </p>
            {canManage && (
              <Link to={`/communities/${community._id}/members`} className="secondary-button w-full">
                <Settings size={16} />
                Manage members
              </Link>
            )}
            {isOwner && (
              <>
                <Link to={`/communities/${community._id}/edit`} className="secondary-button w-full">
                  <Edit size={16} />
                  Edit community
                </Link>
                <button
                  type="button"
                  className="secondary-button w-full hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  onClick={() => {
                    if (window.confirm("Delete this community?")) remove.mutate();
                  }}
                >
                  Delete community
                </button>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
