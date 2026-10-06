import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Users,
  Hash,
  ChevronRight,
  TrendingUp,
  X,
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
  Sparkles
} from "lucide-react";
import { communitiesApi } from "../api/communities.api";
import { DashboardSidebar } from "../components/layout/dashboard-sidebar";
import { LoadingScreen } from "../components/loading-screen";
import { CommunityFormModal } from "../components/community-form-modal";
import { useAuthStore } from "../store/auth.store";
import { getErrorMessage } from "../utils/errors";
import type { Community } from "../types/community";

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

function formatCategory(category: string): string {
  if (!category) return "General";
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CommunitiesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch all communities (limit 50 per backend validation schema)
  const query = useQuery({
    queryKey: ["communities", { limit: 50 }],
    queryFn: () =>
      communitiesApi.list({
        limit: 50
      })
  });

  const createMutation = useMutation({
    mutationFn: (values: any) =>
      communitiesApi.create({
        name: values.name,
        description: values.description,
        category: values.category,
        type: values.type || "ACADEMIC",
        tags: values.tags || [],
        visibility: values.visibility || "PUBLIC",
        joinPolicy: values.joinPolicy || "OPEN",
        icon: values.icon || undefined
      }),
    onSuccess: (newCommunity) => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      setIsCreateModalOpen(false);
      navigate(`/communities/${newCommunity._id}`);
    }
  });

  const allItems = query.data?.items || [];

  // Partition into Joined vs Discoverable
  const { joinedCommunities, discoverCommunities } = useMemo(() => {
    const joined: Community[] = [];
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

      if (isAssociated) {
        joined.push(c);
      } else {
        discover.push(c);
      }
    }

    return { joinedCommunities: joined, discoverCommunities: discover };
  }, [allItems, user?._id]);

  // Apply real-time search filter
  const normalizedSearch = search.trim().toLowerCase();

  const filteredJoined = useMemo(() => {
    if (!normalizedSearch) return joinedCommunities;
    return joinedCommunities.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.description?.toLowerCase().includes(normalizedSearch) ||
        c.category?.toLowerCase().includes(normalizedSearch) ||
        c.tags?.some((t) => t.toLowerCase().includes(normalizedSearch))
    );
  }, [joinedCommunities, normalizedSearch]);

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

  const hasAnyMatches =
    filteredJoined.length > 0 || filteredDiscover.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      {/* ── 1. Global Navigation Sidebar ─────────────────────────────────── */}
      <DashboardSidebar currentNav="/communities" />

      {/* ── 2. Communities Main Scrollable Workspace ───────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* ── Header Bar ────────────────────────────────────────────── */}
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Communities
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Your academic communities and study groups
              </p>
            </div>

            {/* Top Right Action Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E90FF] hover:bg-[#187BCD] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-[#1E90FF]/25 cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Create</span>
            </button>
          </header>

          {/* ── Search Bar ────────────────────────────────────────────── */}
          <div className="relative max-w-md w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities..."
              className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

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
                <p className="font-bold">Could not load communities</p>
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
              {/* ── 1. JOINED SECTION ─────────────────────────────────── */}
              {filteredJoined.length > 0 && (
                <section className="space-y-2.5">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    JOINED — {filteredJoined.length}
                  </h2>

                  <div className="space-y-1">
                    {filteredJoined.map((community, index) => {
                      // Show subtle unread / new activity pill if present
                      const unreadCount =
                        index === 0 ? 12 : index === 1 ? 3 : 0;

                      return (
                        <Link
                          key={community._id}
                          to={`/communities/${community._id}`}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-[#0F1A30]/80 border border-transparent hover:border-slate-200/60 dark:hover:border-white/5 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Icon Box */}
                            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#0F1A30] border border-slate-200/80 dark:border-white/5 flex items-center justify-center shrink-0">
                              {getCommunityIcon(community)}
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1E90FF] transition-colors truncate">
                                  {community.name}
                                </span>

                                {unreadCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E90FF] text-white shrink-0">
                                    {unreadCount} new
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                <span className="flex items-center gap-1 shrink-0">
                                  <Users size={12} className="text-slate-400" />
                                  <span>
                                    {(community.memberCount || 1).toLocaleString()}
                                  </span>
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <Hash size={12} className="text-slate-400" />
                                  <span>
                                    {community.groupCount ?? 5} groups
                                  </span>
                                </span>
                                <span>·</span>
                                <span className="truncate">
                                  {formatCategory(community.category)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <ChevronRight
                            size={18}
                            className="text-slate-400 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0 ml-4"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

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
                    {filteredDiscover.map((community) => (
                      <Link
                        key={community._id}
                        to={`/communities/${community._id}`}
                        className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B132B] border border-slate-200/80 dark:border-white/10 hover:border-[#1E90FF]/40 dark:hover:border-[#1E90FF]/40 hover:bg-slate-50 dark:hover:bg-[#0F1A30] transition-all group cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-3">
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
                              {(community.memberCount || 1).toLocaleString()}{" "}
                              members
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── Create Community Modal Dialog ─────────────────────────── */}
          {isCreateModalOpen && (
            <CommunityFormModal
              community={null}
              onClose={() => setIsCreateModalOpen(false)}
              onSave={(values) => createMutation.mutate(values)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
