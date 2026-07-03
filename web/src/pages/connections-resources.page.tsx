import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Check, X, Search, FileText, Globe, Users, Calendar, ArrowUpRight, Download, Bookmark, Plus, Heart, UploadCloud, Trash2, FolderOpen, ArrowRightLeft, UserCheck, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router";
import { useConnectionStore, type Connection } from "../store/connection.store";
import { useEventStore } from "../store/event.store";
import { useAuthStore } from "../store/auth.store";
import { useToastStore } from "../store/toast.store";
import { usersApi } from "../api/users.api";
import { resourcesApi } from "../api/resources.api";
import { communitiesApi } from "../api/communities.api";
import { Avatar } from "../components/avatar";
import type { Resource, ResourceCategory } from "../types/resource";

const CATEGORIES = ["Notes", "PDF", "Assignments", "PPT", "Other"];

export function ConnectionsResourcesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user)!;
  const { addToast } = useToastStore();
  const { events } = useEventStore();
  
  // Connection Zustand state
  const {
    connections,
    savedPostIds,
    savedEventIds,
    savedCommunityIds,
    bookmarkedResourceIds,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    removeConnection,
    toggleSavePost,
    toggleSaveEvent,
    toggleSaveCommunity,
    toggleBookmarkResource,
    addDownloadResource
  } = useConnectionStore();

  // Navigation tabs
  const [activeMainTab, setActiveMainTab] = useState<"connections" | "resources">("connections");
  const [resourceSubTab, setResourceSubTab] = useState<"all" | "saved" | "my-uploads">("all");

  // Search queries
  const [studentSearch, setStudentSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCat, setUploadCat] = useState("Notes");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCommunityId, setUploadCommunityId] = useState("");

  // 1. FetchSuggested Students (Users search)
  const studentsQuery = useQuery({
    queryKey: ["students-search", studentSearch],
    queryFn: () => usersApi.search(studentSearch)
  });

  // 2. Fetch Global Resources
  const resourcesQuery = useQuery({
    queryKey: ["resources-list", resourceSearch, selectedCategory],
    queryFn: () =>
      resourcesApi.list({
        search: resourceSearch || undefined,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        limit: 50
      })
  });

  // 3. Fetch Student's Communities to allow uploading to a circle
  const communitiesQuery = useQuery({
    queryKey: ["my-communities-resources"],
    queryFn: () => communitiesApi.list({ limit: 50 })
  });

  const myJoinedCommunities = useMemo(() => {
    if (!communitiesQuery.data) return [];
    return communitiesQuery.data.items.filter((c) => c.isMember);
  }, [communitiesQuery.data]);

  // Set default upload community
  useEffect(() => {
    if (myJoinedCommunities.length > 0 && !uploadCommunityId) {
      setUploadCommunityId(myJoinedCommunities[0]._id);
    }
  }, [myJoinedCommunities, uploadCommunityId]);

  // Filter Suggested Students (Excludes self, already connected, or pending)
  const suggestedStudents = useMemo(() => {
    if (!studentsQuery.data) return [];
    return studentsQuery.data.filter((s) => {
      if (s._id === user._id) return false;
      return !connections.some((c) => c.userId === s._id);
    });
  }, [studentsQuery.data, connections, user._id]);

  // Extract lists from connection store status
  const pendingReceivedRequests = useMemo(() => {
    return connections.filter((c) => c.status === "PENDING_RECEIVED");
  }, [connections]);

  const pendingSentRequests = useMemo(() => {
    return connections.filter((c) => c.status === "PENDING_SENT");
  }, [connections]);

  const activeConnections = useMemo(() => {
    return connections.filter((c) => c.status === "CONNECTED");
  }, [connections]);

  // Saved events computed
  const savedEvents = useMemo(() => {
    return (events ?? []).filter((e) => savedEventIds.includes(e._id));
  }, [events, savedEventIds]);

  // Saved communities computed
  const savedCommunities = useMemo(() => {
    if (!communitiesQuery.data) return [];
    return communitiesQuery.data.items.filter((c) => savedCommunityIds.includes(c._id));
  }, [communitiesQuery.data, savedCommunityIds]);

  // Bookmarked Resources
  const bookmarkedResources = useMemo(() => {
    if (!resourcesQuery.data) return [];
    return resourcesQuery.data.items.filter((r) => bookmarkedResourceIds.includes(r._id));
  }, [resourcesQuery.data, bookmarkedResourceIds]);

  // My uploaded resources
  const myUploadedResources = useMemo(() => {
    if (!resourcesQuery.data) return [];
    return resourcesQuery.data.items.filter((r) => r.uploadedBy._id === user._id);
  }, [resourcesQuery.data, user._id]);

  // Handle Send Connection Request
  const handleSendRequest = (target: any) => {
    sendConnectionRequest({
      userId: target._id,
      fullName: target.fullName,
      department: target.department,
      academicYear: target.academicYear,
      profilePicture: target.profilePicture
    });
    addToast(`Connection request sent to ${target.fullName}!`, "success");
  };

  // Handle Accept
  const handleAcceptRequest = (target: Connection) => {
    acceptConnectionRequest(target.userId);
    addToast(`You are now connected with ${target.fullName}!`, "success");
  };

  // Handle Reject
  const handleRejectRequest = (target: Connection) => {
    rejectConnectionRequest(target.userId);
    addToast(`Connection request from ${target.fullName} declined.`, "info");
  };

  // Handle Remove
  const handleRemoveConnection = (target: Connection) => {
    if (window.confirm(`Are you sure you want to remove connection with ${target.fullName}?`)) {
      removeConnection(target.userId);
      addToast(`Connection with ${target.fullName} removed.`, "info");
    }
  };

  // Message Connection - Starts direct message chat session
  const handleMessageConnection = async (target: Connection) => {
    navigate("/direct-messages");
  };

  // Handle Resource Download
  const downloadMutation = useMutation({
    mutationFn: (resourceId: string) => resourcesApi.download(resourceId),
    onSuccess: (data) => {
      addDownloadResource(data._id);
      addToast(`Downloading ${data.title}...`, "success");
      // Simulate file download by creating anchor click
      if (data.fileUrl) {
        const link = document.createElement("a");
        link.href = data.fileUrl;
        link.target = "_blank";
        link.download = data.fileName || "resource";
        link.click();
      }
      queryClient.invalidateQueries({ queryKey: ["resources-list"] });
    },
    onError: () => {
      addToast("Could not download resource file.", "error");
    }
  });

  // Handle Resource Upload Creation
  const uploadMutation = useMutation({
    mutationFn: (payload: { communityId: string; data: any; file: File }) =>
      resourcesApi.create(payload.communityId, payload.data, payload.file),
    onSuccess: () => {
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDesc("");
      setUploadFile(null);
      addToast("Resource uploaded successfully!", "success");
      queryClient.invalidateQueries({ queryKey: ["resources-list"] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || err?.message || "An unexpected error occurred", "error");
    }
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadFile || !uploadCommunityId) {
      addToast("Please fill all required fields and choose a file.", "error");
      return;
    }
    uploadMutation.mutate({
      communityId: uploadCommunityId,
      data: {
        title: uploadTitle,
        description: uploadDesc,
        category: uploadCat,
        visibility: "PUBLIC",
        tags: []
      },
      file: uploadFile
    });
  };

  // Handle Resource Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.delete(id),
    onSuccess: () => {
      addToast("Resource deleted successfully.", "info");
      queryClient.invalidateQueries({ queryKey: ["resources-list"] });
    }
  });

  return (
    <div className="animate-fade-up space-y-8">
      {/* Header Banner */}
      <header className="flex flex-col justify-between gap-5 pb-5 md:flex-row md:items-end border-b border-slate-200 dark:border-white/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Student Network
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl">
            Resources & Network.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Grow your student network, connect with peers sharing mutual circles, and share study slides, note sheets, or assignments.
          </p>
        </div>

        {/* Global tab switches */}
        <div className="flex rounded-2xl bg-white border p-1 shadow-sm dark:border-white/5 dark:bg-ink-900">
          <button
            onClick={() => setActiveMainTab("connections")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeMainTab === "connections"
                ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                : "text-slate-550 dark:text-slate-405"
            }`}
          >
            <ArrowRightLeft size={14} />
            Connections
          </button>
          <button
            onClick={() => setActiveMainTab("resources")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeMainTab === "resources"
                ? "bg-slate-950 text-white dark:bg-white dark:text-ink-950"
                : "text-slate-550 dark:text-slate-405"
            }`}
          >
            <FolderOpen size={14} />
            Resources
          </button>
        </div>
      </header>

      {/* VIEW A: CONNECTIONS WORKSPACE */}
      {activeMainTab === "connections" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          
          {/* Main workspace panels */}
          <div className="space-y-8">
            
            {/* Suggested students search panel */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Suggested Students</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expand your network</span>
              </div>
              
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="field pl-9 text-xs py-2 bg-slate-50 border-0"
                  placeholder="Search students by name, year, or department..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {/* Grid suggestions list */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                {suggestedStudents.slice(0, 8).map((student) => {
                  const hasSent = connections.some((c) => c.userId === student._id && c.status === "PENDING_SENT");
                  const hasReceived = connections.some((c) => c.userId === student._id && c.status === "PENDING_RECEIVED");
                  const isConnected = connections.some((c) => c.userId === student._id && c.status === "CONNECTED");
                  
                  // Mutual score simulation
                  const isSameDept = student.department === user.department;
                  const mutualCount = isSameDept ? 3 : 1;

                  return (
                    <div key={student._id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:bg-black/15 dark:border-white/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={student.fullName} src={student.profilePicture} className="size-11" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate">{student.fullName}</h4>
                          <span className="block text-[10px] text-indigo-650 dark:text-indigo-400 font-semibold truncate">{student.department} · Yr {student.academicYear}</span>
                          <span className="block text-[9px] text-slate-400 font-medium">{mutualCount} mutual communit{mutualCount === 1 ? "y" : "ies"}</span>
                        </div>
                      </div>

                      {isConnected ? (
                        <span className="rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold"><UserCheck size={13} /></span>
                      ) : hasSent ? (
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
                      ) : hasReceived ? (
                        <button
                          onClick={() => handleAcceptRequest(connections.find(c => c.userId === student._id)!)}
                          className="rounded-lg bg-indigo-600 text-white p-1 hover:bg-indigo-700 cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(student)}
                          className="rounded-lg border border-slate-250 bg-white p-1 text-slate-650 hover:bg-slate-50 cursor-pointer shadow-sm dark:bg-ink-900 dark:border-white/5 dark:text-slate-300"
                          title="Connect"
                        >
                          <UserPlus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {studentsQuery.isLoading && (
                  <p className="text-xs text-slate-450 text-center py-6 sm:col-span-2">Loading students...</p>
                )}
                {suggestedStudents.length === 0 && !studentsQuery.isLoading && (
                  <p className="text-xs text-slate-400 text-center py-6 sm:col-span-2">No suggested students available.</p>
                )}
              </div>
            </div>

            {/* Network Connections */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">My Network ({activeConnections.length})</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {activeConnections.map((conn) => (
                  <div key={conn.userId} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:bg-black/15 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={conn.fullName} src={conn.profilePicture} className="size-11" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate">{conn.fullName}</h4>
                        <span className="block text-[10px] text-slate-450 dark:text-slate-400 truncate">{conn.department}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMessageConnection(conn)}
                        className="rounded-lg bg-indigo-50 border border-indigo-150 p-1 text-indigo-650 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/5 cursor-pointer"
                        title="Send Message"
                      >
                        <MessageSquare size={13} />
                      </button>
                      <button
                        onClick={() => handleRemoveConnection(conn)}
                        className="rounded-lg border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100 cursor-pointer"
                        title="Remove Connection"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {activeConnections.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6 sm:col-span-2">You haven't connected with any students yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right sidebar: connection requests lists */}
          <aside className="space-y-6">
            
            {/* Pending Requests Received */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Received Requests ({pendingReceivedRequests.length})</h4>
              
              <div className="space-y-3">
                {pendingReceivedRequests.map((req) => (
                  <div key={req.userId} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={req.fullName} src={req.profilePicture} className="size-8" />
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">{req.fullName}</span>
                        <span className="block text-[9px] text-slate-450 dark:text-slate-400 truncate mt-0.5">{req.department}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleAcceptRequest(req)} className="rounded bg-emerald-500 p-1 text-white hover:bg-emerald-600 cursor-pointer"><Check size={11} /></button>
                      <button onClick={() => handleRejectRequest(req)} className="rounded bg-rose-500 p-1 text-white hover:bg-rose-600 cursor-pointer"><X size={11} /></button>
                    </div>
                  </div>
                ))}
                {pendingReceivedRequests.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">No pending received requests.</p>
                )}
              </div>
            </div>

            {/* Pending Requests Sent */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sent Requests ({pendingSentRequests.length})</h4>
              
              <div className="space-y-3">
                {pendingSentRequests.map((req) => (
                  <div key={req.userId} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={req.fullName} src={req.profilePicture} className="size-8" />
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">{req.fullName}</span>
                        <span className="block text-[9px] text-slate-405 truncate mt-0.5">{req.department}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRejectRequest(req)} className="rounded bg-slate-100 hover:bg-slate-200 p-1 text-slate-500 cursor-pointer"><X size={11} /></button>
                  </div>
                ))}
                {pendingSentRequests.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">No pending sent requests.</p>
                )}
              </div>
            </div>

          </aside>
        </div>
      )}

      {/* VIEW B: RESOURCES LIBRARY */}
      {activeMainTab === "resources" && (
        <div className="space-y-6 animate-fade-up">
          
          {/* Subtabs bar (All, Saved Lists, My Uploads) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/5">
            <div className="flex gap-4">
              {[
                { id: "all", label: "Library Catalog" },
                { id: "saved", label: "Bookmarks & Saved" },
                { id: "my-uploads", label: "My Uploads" }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setResourceSubTab(sub.id as any)}
                  className={`text-xs font-bold uppercase tracking-wider transition cursor-pointer pb-2 -mb-3 border-b-2 ${
                    resourceSubTab === sub.id
                      ? "border-indigo-650 text-indigo-755 dark:border-indigo-500 dark:text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <button onClick={() => setUploadOpen(true)} className="primary-button text-xs py-1.5 px-4 shadow-sm flex items-center gap-1">
              <Plus size={14} /> Upload File
            </button>
          </div>

          {/* SEARCH BAR & CATEGORIES FOR LIBRARY */}
          {resourceSubTab === "all" && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="field pl-9 text-xs py-2 bg-white dark:bg-ink-900 border-slate-200 dark:border-white/5"
                  placeholder="Search resources by title, description, tags..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap gap-2">
                {["all", ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition border cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-slate-950 border-slate-950 text-white dark:bg-white dark:border-white dark:text-ink-950"
                        : "bg-white border-slate-250 text-slate-550 hover:bg-slate-50 dark:bg-ink-900 dark:border-white/5 dark:text-slate-400"
                    }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ALL RESOURCES VIEW */}
          {resourceSubTab === "all" && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {resourcesQuery.data?.items.map((res) => {
                const isBookmarked = bookmarkedResourceIds.includes(res._id);
                return (
                  <div key={res._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lg dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-48 transition duration-200">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="rounded bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-650 dark:bg-white/5 dark:text-slate-400 border border-slate-100 dark:border-white/5">
                          {res.category}
                        </span>
                        <button
                          onClick={() => toggleBookmarkResource(res._id)}
                          className={`text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 cursor-pointer ${isBookmarked ? "text-indigo-600 dark:text-indigo-400" : ""}`}
                        >
                          <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-3 truncate">{res.title}</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-8">{res.description}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={res.uploadedBy.fullName} src={res.uploadedBy.profilePicture} className="size-6" />
                        <span className="text-[10px] font-semibold text-slate-400">{res.uploadedBy.fullName}</span>
                      </div>
                      <button
                        onClick={() => downloadMutation.mutate(res._id)}
                        className="rounded-lg bg-indigo-50 hover:bg-indigo-100 p-1.5 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      >
                        <Download size={12} /> {res.downloadCount ?? 0}
                      </button>
                    </div>
                  </div>
                );
              })}

              {resourcesQuery.isLoading && (
                <p className="text-xs text-slate-450 text-center py-20 md:col-span-3">Loading resource catalog...</p>
              )}
              {resourcesQuery.data?.items.length === 0 && !resourcesQuery.isLoading && (
                <div className="py-20 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-3xl bg-white dark:bg-ink-900 md:col-span-3">
                  <FileText size={36} className="mx-auto text-slate-350 mb-3" />
                  <h3 className="text-sm font-bold text-slate-805 dark:text-slate-200">No resources found</h3>
                  <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or search terms.</p>
                </div>
              )}
            </div>
          )}

          {/* BOOKMARKS & SAVED VIEW */}
          {resourceSubTab === "saved" && (
            <div className="space-y-8">
              
              {/* Bookmarked resources */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Bookmarked Resources ({bookmarkedResources.length})</h3>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {bookmarkedResources.map((res) => (
                    <div key={res._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lg dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-48 transition duration-200">
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="rounded bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-650 dark:bg-white/5 dark:text-slate-400 border border-slate-100 dark:border-white/5">
                            {res.category}
                          </span>
                          <button onClick={() => toggleBookmarkResource(res._id)} className="text-indigo-600 dark:text-indigo-400 cursor-pointer">
                            <Bookmark size={15} fill="currentColor" />
                          </button>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-3 truncate">{res.title}</h4>
                        <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-8">{res.description}</p>
                      </div>

                      <div className="border-t border-slate-100 pt-3 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400">By {res.uploadedBy.fullName}</span>
                        <button onClick={() => downloadMutation.mutate(res._id)} className="rounded-lg bg-indigo-50 hover:bg-indigo-100 p-1.5 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400 cursor-pointer flex items-center gap-1 text-[10px] font-bold">
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                  {bookmarkedResources.length === 0 && (
                    <p className="text-xs text-slate-400 py-6 md:col-span-3 text-center">No bookmarked resources.</p>
                  )}
                </div>
              </div>

              {/* Saved Events */}
              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Saved Events ({savedEvents.length})</h3>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {savedEvents.map((evt) => (
                    <div key={evt._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-36">
                      <div>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-750 dark:bg-white/5 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/5">
                          {evt.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2 truncate">{evt.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">Venue: {evt.venue}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/5 text-[10px] font-bold text-slate-400">
                        <span>{evt.date}</span>
                        <span>{evt.time}</span>
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0 && (
                    <p className="text-xs text-slate-400 py-6 md:col-span-3 text-center">No saved events.</p>
                  )}
                </div>
              </div>

              {/* Saved Communities */}
              <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Saved Communities ({savedCommunities.length})</h3>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {savedCommunities.map((c) => (
                    <div key={c._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-36">
                      <div>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-white/5 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/5">
                          {c.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2 truncate">{c.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>
                      </div>
                    </div>
                  ))}
                  {savedCommunities.length === 0 && (
                    <p className="text-xs text-slate-400 py-6 md:col-span-3 text-center">No saved communities.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* MY UPLOADS VIEW */}
          {resourceSubTab === "my-uploads" && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {myUploadedResources.map((res) => (
                <div key={res._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-48">
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="rounded bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-650 dark:bg-white/5 dark:text-slate-400 border border-slate-100 dark:border-white/5">
                        {res.category}
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this resource?")) {
                            deleteMutation.mutate(res._id);
                          }
                        }}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-3 truncate">{res.title}</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-8">{res.description}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-405 font-bold">
                    <span>Downloads: {res.downloadCount ?? 0}</span>
                    <button onClick={() => downloadMutation.mutate(res._id)} className="text-indigo-600 dark:text-indigo-400 hover:underline">Download Link</button>
                  </div>
                </div>
              ))}
              {myUploadedResources.length === 0 && (
                <p className="text-xs text-slate-400 py-6 md:col-span-3 text-center">You haven't uploaded any study resources yet.</p>
              )}
            </div>
          )}

        </div>
      )}

      {/* UPLOAD RESOURCE DIALOG MODAL */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] p-4">
          <div className="fixed inset-0" onClick={() => setUploadOpen(false)} />
          
          <form onSubmit={handleUploadSubmit} className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 dark:bg-ink-900 dark:border-white/5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight border-b border-slate-100 pb-3 dark:border-white/5">Upload Study Resource</h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Algorithms Lecture Notes Week 2..."
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="field text-xs py-2 bg-slate-50 border-0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Explain what study topics this sheet covers..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="field text-xs py-2 bg-slate-50 border-0"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={uploadCat}
                    onChange={(e) => setUploadCat(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Select Circle</label>
                  <select
                    value={uploadCommunityId}
                    onChange={(e) => setUploadCommunityId(e.target.value)}
                    className="field text-xs py-2 bg-slate-50 border-0"
                  >
                    {myJoinedCommunities.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">File Chooser</label>
                <div className="border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition relative">
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 size-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud size={24} className="mx-auto text-indigo-650 dark:text-indigo-400 mb-2" />
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {uploadFile ? uploadFile.name : "Choose PDF, PPT, Notes, or doc file"}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-1">Maximum size 10MB</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-white/5">
              <button type="button" onClick={() => setUploadOpen(false)} className="secondary-button text-xs py-2 px-4">Cancel</button>
              <button
                type="submit"
                disabled={uploadMutation.isPending}
                className="primary-button text-xs py-2 px-6 shadow-sm"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload File"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
