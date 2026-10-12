import React, { useMemo } from "react";
import { Link, useOutletContext } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  RotateCcw,
  Coffee,
  Globe,
  Bot,
  Lock,
  Smartphone,
  Gamepad2,
  BarChart3,
  CloudLightning,
  Wrench,
  Code,
  BookOpen,
} from "lucide-react";
import { communitiesApi, listAllCommunities } from "../api/communities.api";
import { LoadingScreen } from "../components/loading-screen";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { getErrorMessage } from "../utils/errors";
import type { Community } from "../types/community";
import type { CommunitiesWorkspaceOutletContext } from "../components/community/communities-workspace-layout";

function getCommunityIcon(community: Community) {
  if (
    community.icon &&
    (community.icon.startsWith("http") ||
      community.icon.startsWith("/") ||
      community.icon.startsWith("data:"))
  ) {
    return (
      <img
        src={community.icon}
        alt={community.name}
        className="w-full h-full object-cover rounded-xl"
      />
    );
  }

  const query = `${community.name} ${community.category || ""} ${community.description || ""}`.toLowerCase();

  if (query.includes("java") || query.includes("coffee")) {
    return <Coffee className="w-5 h-5 text-amber-400" />;
  }
  if (
    query.includes("web") ||
    query.includes("frontend") ||
    query.includes("html") ||
    query.includes("css") ||
    query.includes("react")
  ) {
    return <Globe className="w-5 h-5 text-sky-400" />;
  }
  if (
    query.includes("machine learning") ||
    query.includes("ai") ||
    query.includes("artificial intelligence") ||
    query.includes("robot")
  ) {
    return <Bot className="w-5 h-5 text-purple-400" />;
  }
  if (
    query.includes("cybersecurity") ||
    query.includes("cyber security") ||
    query.includes("security") ||
    query.includes("infosec") ||
    query.includes("hacking")
  ) {
    return <Lock className="w-5 h-5 text-amber-400" />;
  }
  if (
    query.includes("mobile") ||
    query.includes("android") ||
    query.includes("ios") ||
    query.includes("flutter") ||
    query.includes("swift")
  ) {
    return <Smartphone className="w-5 h-5 text-indigo-400" />;
  }
  if (
    query.includes("game") ||
    query.includes("gaming") ||
    query.includes("unity") ||
    query.includes("unreal")
  ) {
    return <Gamepad2 className="w-5 h-5 text-pink-400" />;
  }
  if (
    query.includes("data science") ||
    query.includes("analytics") ||
    query.includes("statistics")
  ) {
    return <BarChart3 className="w-5 h-5 text-emerald-400" />;
  }
  if (
    query.includes("cloud") ||
    query.includes("aws") ||
    query.includes("azure") ||
    query.includes("devops")
  ) {
    return <CloudLightning className="w-5 h-5 text-blue-400" />;
  }
  if (
    query.includes("open source") ||
    query.includes("lab") ||
    query.includes("git") ||
    query.includes("tools")
  ) {
    return <Wrench className="w-5 h-5 text-teal-400" />;
  }
  if (
    query.includes("dsa") ||
    query.includes("algorithm") ||
    query.includes("code") ||
    query.includes("programming")
  ) {
    return <Code className="w-5 h-5 text-cyan-400" />;
  }

  return <BookOpen className="w-5 h-5 text-[#1E90FF]" />;
}

export function CommunitiesListPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { communitySearch: search, setCommunitySearch: setSearch } = useOutletContext<CommunitiesWorkspaceOutletContext>();

  // Fetch all communities (limit 50 per backend validation schema)
  const query = useQuery({
    queryKey: ["communities", { limit: 100, allPages: true }],
    queryFn: () => listAllCommunities({ limit: 100 })
  });

  const allItems = query.data?.items || [];

  const joinMutation = useMutation({
    mutationFn: (community: Community) => {
      const requiresApproval =
        community.joinPolicy === "APPLICATION" ||
        community.visibility?.toUpperCase() === "PRIVATE";
      return requiresApproval
        ? communitiesApi.requestJoin(community._id)
        : communitiesApi.join(community._id);
    },
    onSuccess: async (updatedCommunity, community) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["communities"] }),
        queryClient.invalidateQueries({ queryKey: ["community", community._id] })
      ]);
      const requested = community.joinPolicy === "APPLICATION" ||
        community.visibility?.toUpperCase() === "PRIVATE" ||
        updatedCommunity.isPending;
      addToast(requested ? "Join request sent" : "Joined community", "success");
    },
    onError: (error: any) => {
      addToast(
        error?.response?.data?.message || error?.message || "Unable to join this community",
        "error"
      );
    }
  });

  // Partition into Joined vs Discoverable
  const { discoverCommunities } = useMemo(() => {
    const discover: Community[] = [];

    for (const c of allItems) {
      if (c.status === "ARCHIVED") continue;

      const isAssociated = Boolean(
        c.isMember ||
          c.membershipRole === "OWNER" ||
          c.membershipRole === "MODERATOR" ||
          c.membershipRole === "MEMBER" ||
          (user?._id && c.ownerId === user._id) ||
          (user?._id && c.owner?._id === user._id)
      );

      if (!isAssociated) {
        discover.push(c);
      }
    }

    return { discoverCommunities: discover };
  }, [allItems, user?._id]);

  // Apply real-time search filter
  const normalizedSearch = search.trim().toLowerCase();

  const filteredDiscover = useMemo(() => {
    if (!normalizedSearch) return discoverCommunities;
    return discoverCommunities.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.description?.toLowerCase().includes(normalizedSearch) ||
        c.category?.toLowerCase().includes(normalizedSearch) ||
        c.tags?.some((t) => t.toLowerCase().includes(normalizedSearch))
    );
  }, [discoverCommunities, normalizedSearch]);

  const hasAnyMatches = filteredDiscover.length > 0;

  return (
      <div className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto scrollbar-none bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* ── Header Bar ────────────────────────────────────────────── */}
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Study Circles
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Your academic study circles and groups
              </p>
            </div>

          </header>

          {/* ── Content View ──────────────────────────────────────────── */}
          {query.isLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingScreen />
            </div>
          ) : query.isError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 max-w-md mx-auto space-y-3"
            >
              <div>
                  <p className="font-bold">Could not load study circles</p>
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {getErrorMessage(query.error) ||
                    "Please check your network connection and try refreshing."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : !hasAnyMatches && search ? (
            /* Search Not Found State */
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#0B132B]/50 p-8 max-w-md mx-auto space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400">
                <Search size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No communities found
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  No academic communities matched &quot;{search}&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1E90FF] hover:bg-[#1E90FF]/10 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset search</span>
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* ── 2. DISCOVER SECTION ───────────────────────────────── */}
              {filteredDiscover.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      size={15}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      DISCOVER
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                    {filteredDiscover.map((community) => {
                      const requiresApproval =
                        community.joinPolicy === "APPLICATION" ||
                        community.visibility?.toUpperCase() === "PRIVATE";
                      const inviteOnly = community.joinPolicy === "INVITE_ONLY" ||
                        community.visibility?.toUpperCase() === "INVITE_ONLY";
                      const joinDisabled = Boolean(
                        community.isPending || community.isBanned || community.isSuspended || inviteOnly
                      );
                      const joinLabel = community.isBanned
                        ? "Banned"
                        : community.isSuspended
                          ? "Suspended"
                          : community.isPending
                            ? "Request pending"
                            : inviteOnly
                              ? "Invite only"
                              : requiresApproval
                                ? "Request to Join"
                                : "Join";

                      return (
                        <article
                          key={community._id}
                          className="flex flex-col p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 hover:border-[#1E90FF]/40 dark:hover:border-[#1E90FF]/40 hover:bg-slate-50 dark:hover:bg-[#0F1A30] transition-all shadow-sm hover:shadow-md"
                        >
                          <Link to={`/communities/${community._id}`} className="group space-y-3">
                            {/* Card Icon */}
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#080D1A] border border-slate-200/60 dark:border-white/5 flex items-center justify-center">
                              {getCommunityIcon(community)}
                            </div>

                            {/* Card Info */}
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1E90FF] transition-colors truncate">
                                {community.name}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {(community.memberCount || 1).toLocaleString()} members
                              </p>
                            </div>
                          </Link>
                          <button
                            type="button"
                            disabled={joinDisabled || joinMutation.isPending}
                            onClick={() => joinMutation.mutate(community)}
                            className="mt-4 w-full rounded-xl bg-[#1E90FF] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#187bcd] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-400"
                          >
                            {joinMutation.isPending && joinMutation.variables?._id === community._id
                              ? "Please wait…"
                              : joinLabel}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

        </main>
      </div>
  );
}
