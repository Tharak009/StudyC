import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { communitiesApi, listAllCommunities } from "../../api/communities.api";
import { communityGroupsApi } from "../../api/community-groups.api";
import { CommunityDirectorySidebar } from "./community-directory-sidebar";
import { CreateGroupModal } from "./create-group-modal";
import { AttachGroupModal } from "./attach-group-modal";
import { useAuthStore } from "../../store/auth.store";
import type { CommunityGroup } from "../../types/community-group";

const MIN_COMMUNITY_SIDEBAR_WIDTH = 300;
const MAX_COMMUNITY_SIDEBAR_WIDTH = 560;
const MIN_COMMUNITY_CONTENT_WIDTH = 360;
const COMMUNITY_RESIZE_HANDLE_WIDTH = 8;

export interface CommunitiesWorkspaceOutletContext {
  openSidebar: () => void;
  openCreateGroup: () => void;
  openAttachGroup: () => void;
  communitySearch: string;
  setCommunitySearch: (value: string) => void;
}

export function CommunitiesWorkspaceLayout() {
  const { id, communityId, groupId } = useParams<{ id?: string; communityId?: string; groupId?: string }>();
  const selectedCommunityId = id || communityId;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [maxSidebarWidth, setMaxSidebarWidth] = useState(MAX_COMMUNITY_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const resizePointerId = useRef<number | null>(null);
  const resizePointerOffset = useRef(0);
  const pendingSidebarWidth = useRef<number | null>(null);
  const resizeFrame = useRef<number | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const [expandedCommunityId, setExpandedCommunityId] = useState<string | undefined>(selectedCommunityId);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAttachGroupOpen, setIsAttachGroupOpen] = useState(false);

  const communitiesQuery = useQuery({
    queryKey: ["communities", { limit: 100, allPages: true }],
    queryFn: () => listAllCommunities({ limit: 100 })
  });
  const communityQuery = useQuery({
    queryKey: ["community", selectedCommunityId],
    queryFn: () => communitiesApi.details(selectedCommunityId!),
    enabled: Boolean(selectedCommunityId)
  });
  const groupsQuery = useQuery({
    queryKey: ["community-groups", selectedCommunityId],
    queryFn: () => communityGroupsApi.list(selectedCommunityId!),
    enabled: Boolean(selectedCommunityId)
  });

  const joinedCommunities = useMemo(() =>
    (communitiesQuery.data?.items || []).filter((community) => {
      if (community.status === "ARCHIVED") return false;
      return Boolean(
        community.isMember ||
          community.membershipRole === "OWNER" ||
          community.membershipRole === "MODERATOR" ||
          community.membershipRole === "MEMBER" ||
          (currentUser?._id && community.ownerId === currentUser._id) ||
          (currentUser?._id && community.owner?._id === currentUser._id)
      );
    }),
    [communitiesQuery.data, currentUser?._id]
  );

  const community = communityQuery.data;
  const groups = groupsQuery.data || [];
  const activeGroups = useMemo(
    () => groups
      .filter((group: CommunityGroup) => group.status === "ACTIVE" && !group.isDeleted)
      .sort((a: CommunityGroup, b: CommunityGroup) => a.sortOrder - b.sortOrder),
    [groups]
  );

  const getSidebarMaxWidth = useCallback(() => {
    const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    return Math.max(
      MIN_COMMUNITY_SIDEBAR_WIDTH,
      Math.min(
        MAX_COMMUNITY_SIDEBAR_WIDTH,
        workspaceWidth - MIN_COMMUNITY_CONTENT_WIDTH - COMMUNITY_RESIZE_HANDLE_WIDTH
      )
    );
  }, []);

  const flushPendingSidebarWidth = useCallback(() => {
    if (resizeFrame.current !== null) {
      cancelAnimationFrame(resizeFrame.current);
      resizeFrame.current = null;
    }
    if (pendingSidebarWidth.current !== null) {
      setSidebarWidth(pendingSidebarWidth.current);
      pendingSidebarWidth.current = null;
    }
  }, []);

  useEffect(() => {
    const updateWidthConstraints = () => {
      const nextMaxWidth = getSidebarMaxWidth();
      setMaxSidebarWidth(nextMaxWidth);
      setSidebarWidth((currentWidth) => Math.min(currentWidth, nextMaxWidth));
    };

    updateWidthConstraints();
    window.addEventListener("resize", updateWidthConstraints);
    return () => window.removeEventListener("resize", updateWidthConstraints);
  }, [getSidebarMaxWidth]);

  useEffect(() => () => {
    if (resizeFrame.current !== null) cancelAnimationFrame(resizeFrame.current);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;
    const stopResizing = () => {
      flushPendingSidebarWidth();
      const pointerId = resizePointerId.current;
      if (pointerId !== null && resizeHandleRef.current?.hasPointerCapture(pointerId)) {
        resizeHandleRef.current.releasePointerCapture(pointerId);
      }
      resizePointerId.current = null;
      setIsResizingSidebar(false);
    };
    window.addEventListener("blur", stopResizing);
    return () => window.removeEventListener("blur", stopResizing);
  }, [flushPendingSidebarWidth, isResizingSidebar]);

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizePointerId.current = event.pointerId;
    const workspaceLeft = workspaceRef.current?.getBoundingClientRect().left ?? 0;
    resizePointerOffset.current = event.clientX - workspaceLeft - sidebarWidth;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingSidebar(true);
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerId.current !== event.pointerId || !workspaceRef.current) return;
    const workspaceLeft = workspaceRef.current.getBoundingClientRect().left;
    pendingSidebarWidth.current = Math.max(
      MIN_COMMUNITY_SIDEBAR_WIDTH,
      Math.min(getSidebarMaxWidth(), event.clientX - workspaceLeft - resizePointerOffset.current)
    );
    if (resizeFrame.current === null) {
      resizeFrame.current = requestAnimationFrame(() => {
        resizeFrame.current = null;
        if (pendingSidebarWidth.current !== null) {
          setSidebarWidth(pendingSidebarWidth.current);
          pendingSidebarWidth.current = null;
        }
      });
    }
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerId.current !== event.pointerId) return;
    flushPendingSidebarWidth();
    resizePointerId.current = null;
    setIsResizingSidebar(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleLostResizePointerCapture = () => {
    flushPendingSidebarWidth();
    resizePointerId.current = null;
    setIsResizingSidebar(false);
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSidebarWidth((width) => Math.max(MIN_COMMUNITY_SIDEBAR_WIDTH, width - 16));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSidebarWidth((width) => Math.min(maxSidebarWidth, width + 16));
    } else if (event.key === "Home") {
      event.preventDefault();
      setSidebarWidth(MIN_COMMUNITY_SIDEBAR_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setSidebarWidth(maxSidebarWidth);
    }
  };

  useEffect(() => setIsMobileSidebarOpen(false), [location.pathname]);
  useEffect(() => setExpandedCommunityId(selectedCommunityId), [selectedCommunityId]);

  const openSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const openCreateGroup = useCallback(() => setIsCreateGroupOpen(true), []);
  const openAttachGroup = useCallback(() => setIsAttachGroupOpen(true), []);
  const outletContext = useMemo(
    () => ({ openSidebar, openCreateGroup, openAttachGroup, communitySearch, setCommunitySearch }),
    [openSidebar, openCreateGroup, openAttachGroup, communitySearch]
  );
  const renderSidebar = () => (
    <CommunityDirectorySidebar
      communities={joinedCommunities}
      activeCommunityId={selectedCommunityId}
      loading={communitiesQuery.isLoading}
      search={communitySearch}
      onSearchChange={setCommunitySearch}
      onCreateCommunity={() => navigate("/communities/new")}
      sidebarWidth={sidebarWidth}
      expandedCommunityId={expandedCommunityId}
      groups={expandedCommunityId === selectedCommunityId ? activeGroups : []}
      groupsLoading={expandedCommunityId === selectedCommunityId && groupsQuery.isLoading}
      groupsError={expandedCommunityId === selectedCommunityId && groupsQuery.isError}
      selectedGroupId={groupId}
      onSelectCommunity={(id) => {
        setExpandedCommunityId((current) => current === id ? undefined : id);
        if (id !== selectedCommunityId) navigate(`/communities/${id}`);
      }}
      onSelectGroup={(id, selectedGroupId) => navigate(`/communities/${id}/groups/${selectedGroupId}`)}
    />
  );
  const viewHasSelectedCommunity = Boolean(selectedCommunityId);

  return (
    <div ref={workspaceRef} className={`flex h-full min-h-0 min-w-0 flex-1 overflow-hidden${isResizingSidebar ? " cursor-col-resize select-none" : ""}`}>
      <div className="hidden h-full lg:flex">{renderSidebar()}</div>
      <div
        ref={resizeHandleRef}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Study Circles sidebar"
        aria-valuemin={MIN_COMMUNITY_SIDEBAR_WIDTH}
        aria-valuemax={maxSidebarWidth}
        aria-valuenow={Math.round(sidebarWidth)}
        aria-valuetext={`${Math.round(sidebarWidth)} pixels`}
        tabIndex={0}
        className="group relative z-10 hidden w-2 shrink-0 cursor-col-resize touch-none select-none items-stretch justify-center rounded-sm outline-none lg:flex"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onLostPointerCapture={handleLostResizePointerCapture}
        onKeyDown={handleResizeKeyDown}
      >
        <span className="h-full w-px rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#0B132B] lg:hidden">
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Open Study Circles list"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <Menu size={17} className="text-[#1E90FF]" />
            <span className="truncate">{community?.name || "Study Circles"}</span>
          </button>
          {viewHasSelectedCommunity && <span className="truncate text-xs text-slate-500 dark:text-slate-400">Community</span>}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <Outlet context={outletContext} />
        </div>
      </main>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close Study Circles list"
          />
          <div className="relative z-10 h-full w-[min(360px,90vw)] shadow-2xl">
            {renderSidebar()}
          </div>
        </div>
      )}

      {community && (
        <>
          <CreateGroupModal
            communityId={community._id}
            isOpen={isCreateGroupOpen}
            onClose={() => setIsCreateGroupOpen(false)}
            onSuccess={(createdGroup) => {
              setIsCreateGroupOpen(false);
              queryClient.invalidateQueries({ queryKey: ["community-groups", selectedCommunityId] });
              queryClient.invalidateQueries({ queryKey: ["community", selectedCommunityId] });
              navigate(`/communities/${community._id}/groups/${createdGroup._id}`);
            }}
          />
          <AttachGroupModal
            communityId={community._id}
            existingGroups={groups}
            isOpen={isAttachGroupOpen}
            onClose={() => setIsAttachGroupOpen(false)}
            onSuccess={(attachedGroup) => {
              setIsAttachGroupOpen(false);
              queryClient.invalidateQueries({ queryKey: ["community-groups", selectedCommunityId] });
              queryClient.invalidateQueries({ queryKey: ["community", selectedCommunityId] });
              navigate(`/communities/${community._id}/groups/${attachedGroup._id}`);
            }}
          />
        </>
      )}
    </div>
  );
}
