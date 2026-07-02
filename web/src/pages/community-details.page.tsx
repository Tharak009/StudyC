import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, FileText, Lock, MessageSquareText, Settings, UsersRound, Heart, Smile, Send, Trash, Download, BarChart2, Paperclip, AlertOctagon, BookOpen, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { communitiesApi } from "../api/communities.api";
import { resourcesApi } from "../api/resources.api";
import { CommunityBanner } from "../components/community-banner";
import { LoadingScreen } from "../components/loading-screen";
import { Avatar } from "../components/avatar";
import { getErrorMessage } from "../utils/errors";
import { useCommunityFeedStore } from "../store/community-feed.store";
import type { ResourceCategory } from "../types/resource";

const RULES = [
  "Be respectful and collaborative in all posts and comments.",
  "Share only verified academic resources. No plagiarism allowed.",
  "Keep discussions relevant to the community's primary domain.",
  "Do not share confidential exam papers or platform keys.",
  "Report any spam or offensive material to moderators immediately."
];

export function CommunityDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"feed" | "resources" | "members" | "rules">("feed");

  // Create post states
  const [postContent, setPostContent] = useState("");
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [attachment, setAttachment] = useState<{ name: string; size: string; type: string } | undefined>(undefined);

  // Comments state
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");

  // Resource Upload states
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");
  const [resourceCat, setResourceCat] = useState<ResourceCategory>("NOTES");
  const [resourceFile, setResourceFile] = useState<File | null>(null);

  // Zustand feed store
  const { posts, addPost, likePost, addComment, votePoll } = useCommunityFeedStore();
  const communityPosts = posts[id!] ?? [];

  // React Query calls
  const query = useQuery({
    queryKey: ["community", id],
    queryFn: () => communitiesApi.details(id!),
    enabled: Boolean(id)
  });

  const membersQuery = useQuery({
    queryKey: ["community-members", id],
    queryFn: () => communitiesApi.members(id!),
    enabled: Boolean(id)
  });

  const resourcesQuery = useQuery({
    queryKey: ["community-resources", id],
    queryFn: () => resourcesApi.listByCommunity(id!, { page: 1, limit: 20 }),
    enabled: Boolean(id)
  });

  const join = useMutation({
    mutationFn: () => communitiesApi.join(id!),
    onSuccess: (community) => {
      queryClient.setQueryData(["community", id], community);
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-members", id] });
    }
  });

  const leave = useMutation({
    mutationFn: () => communitiesApi.leave(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", id] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-members", id] });
    }
  });

  const remove = useMutation({
    mutationFn: () => communitiesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      navigate("/communities");
    }
  });

  const uploadResource = useMutation({
    mutationFn: () => resourcesApi.create(id!, {
      title: resourceTitle,
      description: resourceDesc,
      category: resourceCat,
      tags: ["Academic"],
      visibility: "PUBLIC"
    }, resourceFile!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-resources", id] });
      setResourceTitle("");
      setResourceDesc("");
      setResourceFile(null);
      setShowUploadForm(false);
    }
  });

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError || !query.data) {
    return <p className="text-sm text-red-500">Community could not be loaded.</p>;
  }

  const community = query.data;
  const isOwner = community.membershipRole === "OWNER";
  const canManage = isOwner || community.membershipRole === "MODERATOR";

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !attachment && !pollQuestion.trim()) return;

    addPost(
      id!,
      postContent,
      showPollEditor ? pollQuestion : undefined,
      showPollEditor ? pollOptions.filter(o => o.trim() !== "") : undefined,
      attachment
    );

    setPostContent("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowPollEditor(false);
    setAttachment(undefined);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handleVote = (postId: string, optionIndex: number) => {
    votePoll(id!, postId, optionIndex);
  };

  const handleAddComment = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    addComment(id!, postId, "You", commentContent);
    setCommentContent("");
  };

  const handleAttachMockFile = () => {
    setAttachment({
      name: "Lecture Notes Revision 1.pdf",
      size: "2.4 MB",
      type: "PDF"
    });
  };

  const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResourceFile(e.target.files[0]);
    }
  };

  const handleUploadResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle || !resourceFile) return;
    uploadResource.mutate();
  };

  return (
    <div className="animate-fade-up">
      <CommunityBanner community={community} />

      <div className="grid gap-8 py-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left Workspace Panel */}
        <section className="space-y-6">
          
          {/* Workspace Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/5 pb-px">
            <button
              onClick={() => setActiveWorkspaceTab("feed")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeWorkspaceTab === "feed"
                  ? "border-indigo-650 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-305"
              }`}
            >
              <MessageSquareText size={14} />
              Feed & Discussions
            </button>
            <button
              onClick={() => setActiveWorkspaceTab("resources")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeWorkspaceTab === "resources"
                  ? "border-indigo-650 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-305"
              }`}
            >
              <FileText size={14} />
              Resources
            </button>
            <button
              onClick={() => setActiveWorkspaceTab("members")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeWorkspaceTab === "members"
                  ? "border-indigo-650 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-305"
              }`}
            >
              <UsersRound size={14} />
              Members
            </button>
            <button
              onClick={() => setActiveWorkspaceTab("rules")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeWorkspaceTab === "rules"
                  ? "border-indigo-650 text-indigo-750 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-305"
              }`}
            >
              <Lock size={14} />
              Rules & Guidelines
            </button>
          </div>

          {/* TAB 1: Community Discussions Feed */}
          {activeWorkspaceTab === "feed" && (
            <div className="space-y-6">
              
              {/* Create Post Panel */}
              {community.isMember ? (
                <form onSubmit={handleCreatePost} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
                  <div className="flex gap-4">
                    <Avatar name="You" className="size-9 ring-2 ring-indigo-50 dark:ring-indigo-950/20" />
                    <textarea
                      placeholder={`Share something with ${community.name}...`}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="flex-1 resize-none border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      rows={3}
                    />
                  </div>

                  {/* Poll Editor Section */}
                  {showPollEditor && (
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-black/15 border border-slate-100 dark:border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-550 uppercase tracking-wider">Create Poll</label>
                        <button type="button" onClick={() => setShowPollEditor(false)} className="text-slate-400 hover:text-slate-650 text-[10px] font-bold">Remove</button>
                      </div>
                      <input
                        type="text"
                        placeholder="Poll Question..."
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-950 dark:text-white"
                      />
                      <div className="space-y-2">
                        {pollOptions.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Option ${idx + 1}...`}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...pollOptions];
                              updated[idx] = e.target.value;
                              setPollOptions(updated);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-950 dark:text-white"
                          />
                        ))}
                      </div>
                      {pollOptions.length < 5 && (
                        <button type="button" onClick={handleAddPollOption} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 mt-1">
                          + Add Option
                        </button>
                      )}
                    </div>
                  )}

                  {/* Staged File Details */}
                  {attachment && (
                    <div className="rounded-2xl bg-slate-50 border p-3 flex items-center justify-between dark:bg-black/15 dark:border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={15} className="text-indigo-650" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">{attachment.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">({attachment.size})</span>
                      </div>
                      <button type="button" onClick={() => setAttachment(undefined)} className="text-rose-500 hover:text-rose-600"><Trash size={14} /></button>
                    </div>
                  )}

                  {/* Panel Toolbar Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPollEditor(!showPollEditor)}
                        title="Add Poll"
                        className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-50 text-slate-450 hover:text-indigo-600 dark:hover:bg-white/[0.02] dark:hover:text-indigo-400 cursor-pointer"
                      >
                        <BarChart2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleAttachMockFile}
                        title="Attach File"
                        className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-50 text-slate-450 hover:text-indigo-600 dark:hover:bg-white/[0.02] dark:hover:text-indigo-400 cursor-pointer"
                      >
                        <Paperclip size={16} />
                      </button>
                    </div>
                    <button type="submit" className="primary-button text-xs py-1.5 px-4">
                      Post Update
                      <Send size={12} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-3xl border border-amber-250 bg-amber-50/40 p-4 text-center dark:border-amber-900/30 dark:bg-amber-950/15">
                  <AlertOctagon size={24} className="mx-auto text-amber-500 mb-2" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">Join this community to post updates, participate in polls, and share resources.</p>
                </div>
              )}

              {/* Feed Posts */}
              <div className="space-y-4">
                {communityPosts.map((post) => {
                  const hasVoted = post.poll?.userVotedIndex !== undefined;
                  const totalVotes = post.poll?.options.reduce((sum, o) => sum + o.votes, 0) ?? 0;

                  return (
                    <div key={post.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
                      
                      {/* Post Header */}
                      <div className="flex items-center gap-3">
                        <Avatar name={post.authorName} src={post.authorPicture} className="size-9 ring-2 ring-indigo-50 dark:ring-indigo-950/20" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{post.authorName}</h4>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{post.timestamp}</span>
                        </div>
                      </div>

                      {/* Post content */}
                      <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350">{post.content}</p>

                      {/* Post Poll */}
                      {post.poll && (
                        <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 bg-slate-50/30 dark:bg-black/5 space-y-3">
                          <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200">{post.poll.question}</h5>
                          <div className="space-y-2">
                            {post.poll.options.map((opt, idx) => {
                              const votePercentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleVote(post.id, idx)}
                                  disabled={hasVoted || !community.isMember}
                                  className="relative w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs outline-none dark:border-white/5 dark:bg-ink-950 overflow-hidden cursor-pointer"
                                >
                                  {hasVoted && (
                                    <div
                                      className="absolute inset-y-0 left-0 bg-indigo-500/10 dark:bg-indigo-500/15 transition-all duration-500"
                                      style={{ width: `${votePercentage}%` }}
                                    />
                                  )}
                                  <div className="relative flex justify-between font-semibold">
                                    <span>{opt.text}</span>
                                    {hasVoted && <span>{votePercentage}% ({opt.votes})</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Post attachment */}
                      {post.attachment && (
                        <div className="rounded-2xl bg-slate-50 border p-3 flex items-center justify-between dark:bg-black/15 dark:border-white/5">
                          <div className="flex items-center gap-2 min-w-0">
                            <BookOpen size={14} className="text-indigo-650" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">{post.attachment.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">({post.attachment.size})</span>
                          </div>
                          <button className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-550 hover:bg-slate-100 cursor-pointer">
                            <Download size={13} />
                          </button>
                        </div>
                      )}

                      {/* Post Footer Actions */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
                        <button
                          onClick={() => likePost(id!, post.id)}
                          disabled={!community.isMember}
                          className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                            post.hasLiked
                              ? "text-rose-500"
                              : "text-slate-450 hover:text-rose-500 dark:hover:text-rose-400"
                          }`}
                        >
                          <Heart size={15} fill={post.hasLiked ? "currentColor" : "transparent"} />
                          <span>{post.likesCount} Likes</span>
                        </button>
                        <button
                          onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          <MessageSquareText size={15} />
                          <span>{post.comments.length} Comments</span>
                        </button>
                      </div>

                      {/* Comments Drawer / Section */}
                      {activeCommentPostId === post.id && (
                        <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-white/5">
                          <div className="space-y-3">
                            {post.comments.map((comm) => (
                              <div key={comm.id} className="flex gap-3">
                                <Avatar name={comm.authorName} src={comm.authorPicture} className="size-7 text-[8px]" />
                                <div className="flex-1 rounded-2xl bg-slate-50 p-3 dark:bg-black/15">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-250">{comm.authorName}</span>
                                    <span className="text-[9px] text-slate-400">{comm.timestamp}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed">{comm.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {community.isMember && (
                            <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-950 dark:text-white"
                              />
                              <button type="submit" className="primary-button text-xs p-2 size-8 flex items-center justify-center shrink-0">
                                <Send size={13} />
                              </button>
                            </form>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}

                {communityPosts.length === 0 && (
                  <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-3xl bg-white dark:bg-ink-900">
                    <MessageSquareText size={32} className="mx-auto text-slate-350 dark:text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No posts yet</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Be the first to share an update with the community!</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: Academic Resources */}
          {activeWorkspaceTab === "resources" && (
            <div className="space-y-6">
              
              {/* Upload Resource Button */}
              {community.isMember && (
                <div className="flex justify-end">
                  <button onClick={() => setShowUploadForm(!showUploadForm)} className="primary-button text-xs py-1.5 px-4 shadow-sm">
                    <Plus size={15} />
                    Upload Resource
                  </button>
                </div>
              )}

              {/* Upload Resource Form */}
              {showUploadForm && (
                <form onSubmit={handleUploadResourceSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Share Academic File</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. Unit 3 Revision Notes)..."
                      required
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-950 dark:text-white"
                    />
                    <select
                      value={resourceCat}
                      onChange={(e) => setResourceCat(e.target.value as ResourceCategory)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-950 dark:text-white"
                    >
                      <option value="NOTES">Notes</option>
                      <option value="ASSIGNMENTS">Assignment</option>
                      <option value="PPTS">PPT Slide</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Short description..."
                    value={resourceDesc}
                    onChange={(e) => setResourceDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-ink-950 dark:text-white"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Select File</label>
                    <input type="file" required onChange={handleResourceFileChange} className="text-xs" />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                    <button type="button" onClick={() => setShowUploadForm(false)} className="secondary-button text-xs py-1.5 px-4">Cancel</button>
                    <button type="submit" disabled={uploadResource.isPending} className="primary-button text-xs py-1.5 px-4">Upload File</button>
                  </div>
                </form>
              )}

              {/* Resources List */}
              {resourcesQuery.isLoading ? (
                <LoadingScreen />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {resourcesQuery.data?.items.map((res) => (
                    <div key={res._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col justify-between h-36">
                      <div className="min-w-0">
                        <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider text-indigo-750 dark:bg-white/5 dark:text-indigo-400 mb-2">
                          {res.category}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{res.title}</h4>
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{res.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2 dark:border-white/5">
                        <span className="text-[9px] text-slate-450 font-bold uppercase">Size: 1.8 MB</span>
                        <button className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/5 text-slate-550 hover:bg-slate-100 cursor-pointer">
                          <Download size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!resourcesQuery.data || resourcesQuery.data.items.length === 0) && (
                    <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-3xl bg-white dark:bg-ink-900 sm:col-span-2">
                      <FileText size={32} className="mx-auto text-slate-350 dark:text-slate-600 mb-3" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No resources shared</h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Share lecture files, revision PDFs, or homework sheets.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: Members & Moderation */}
          {activeWorkspaceTab === "members" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 pb-3 mb-2 dark:border-white/5">
                Community Members List
              </h3>
              {membersQuery.isLoading ? (
                <LoadingScreen />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {membersQuery.data?.map((mem) => (
                    <div key={mem._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-ink-900">
                      <div className="flex items-center gap-3">
                        <Avatar name={mem.userId.fullName} src={mem.userId.profilePicture} className="size-8 text-[10px] ring-2 ring-indigo-50 dark:ring-indigo-950/20" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{mem.userId.fullName}</h4>
                          <span className="block text-[9px] text-slate-400 mt-0.5">{mem.role}</span>
                        </div>
                      </div>
                      {canManage && mem.userId._id !== community.owner._id && (
                        <button className="text-[10px] font-bold text-rose-500 hover:text-rose-600">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Rules & Guidelines */}
          {activeWorkspaceTab === "rules" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-ink-900 space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 pb-3 dark:border-white/5">
                Community Guidelines
              </h3>
              <ul className="space-y-4">
                {RULES.map((rule, idx) => (
                  <li key={idx} className="flex gap-3 text-xs leading-relaxed text-slate-650 dark:text-slate-350">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {idx + 1}
                    </span>
                    <p className="flex-1">{rule}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </section>

        {/* Right Sidebar pane */}
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Membership Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {community.membershipRole ?? "Not joined"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <UsersRound size={15} />
                {community.memberCount} members
              </span>
            </div>
            
            <div className="mt-5 space-y-2">
              {community.isMember && (
                <Link to={`/communities/${community._id}/chat`} className="primary-button w-full text-xs">
                  <MessageSquareText size={15} />
                  Open chatroom
                </Link>
              )}
              {community.isMember ? (
                <button
                  className="secondary-button w-full text-xs"
                  type="button"
                  disabled={leave.isPending || isOwner}
                  onClick={() => leave.mutate()}
                >
                  Leave community
                </button>
              ) : (
                <button className="primary-button w-full text-xs" type="button" disabled={join.isPending} onClick={() => join.mutate()}>
                  Join community
                </button>
              )}
            </div>
            {(join.isError || leave.isError || remove.isError) && (
              <p className="mt-3 text-xs text-red-500">
                {getErrorMessage(join.error ?? leave.error ?? remove.error)}
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Lock size={14} />
              <span className="capitalize">{community.visibility} Community</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Owned by {community.owner.fullName}
            </p>
            {isOwner && (
              <>
                <Link to={`/communities/${community._id}/edit`} className="secondary-button w-full text-xs">
                  <Edit size={14} />
                  Edit community
                </Link>
                <button
                  type="button"
                  className="secondary-button w-full hover:border-red-200 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-500/10 dark:hover:text-red-300 text-xs"
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
