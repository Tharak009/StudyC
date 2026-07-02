import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Comment {
  id: string;
  authorName: string;
  authorPicture?: string;
  content: string;
  timestamp: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  userVotedIndex?: number;
}

export interface Post {
  id: string;
  authorName: string;
  authorPicture?: string;
  content: string;
  timestamp: string;
  likesCount: number;
  hasLiked?: boolean;
  comments: Comment[];
  poll?: Poll;
  attachment?: {
    name: string;
    size: string;
    type: string;
  };
}

interface CommunityFeedState {
  posts: Record<string, Post[]>;
  addPost: (communityId: string, content: string, pollQuestion?: string, pollOptions?: string[], attachment?: { name: string; size: string; type: string }) => void;
  likePost: (communityId: string, postId: string) => void;
  addComment: (communityId: string, postId: string, authorName: string, content: string) => void;
  votePoll: (communityId: string, postId: string, optionIndex: number) => void;
}

export const useCommunityFeedStore = create<CommunityFeedState>()(
  persist(
    (set) => ({
      posts: {},
      addPost: (communityId, content, pollQuestion, pollOptions, attachment) => {
        set((state) => {
          const communityPosts = state.posts[communityId] ?? [];
          const newPost: Post = {
            id: `post-${Date.now()}`,
            authorName: "You",
            content,
            timestamp: "Just now",
            likesCount: 0,
            hasLiked: false,
            comments: [],
            poll: pollQuestion && pollOptions && pollOptions.length > 0
              ? {
                  question: pollQuestion,
                  options: pollOptions.map((o) => ({ text: o, votes: 0 }))
                }
              : undefined,
            attachment
          };
          return {
            posts: {
              ...state.posts,
              [communityId]: [newPost, ...communityPosts]
            }
          };
        });
      },
      likePost: (communityId, postId) => {
        set((state) => {
          const communityPosts = state.posts[communityId] ?? [];
          const updated = communityPosts.map((p) => {
            if (p.id !== postId) return p;
            const hasLiked = !p.hasLiked;
            return {
              ...p,
              hasLiked,
              likesCount: p.likesCount + (hasLiked ? 1 : -1)
            };
          });
          return {
            posts: {
              ...state.posts,
              [communityId]: updated
            }
          };
        });
      },
      addComment: (communityId, postId, authorName, content) => {
        set((state) => {
          const communityPosts = state.posts[communityId] ?? [];
          const updated = communityPosts.map((p) => {
            if (p.id !== postId) return p;
            const newComment: Comment = {
              id: `comm-${Date.now()}`,
              authorName,
              content,
              timestamp: "Just now"
            };
            return {
              ...p,
              comments: [...p.comments, newComment]
            };
          });
          return {
            posts: {
              ...state.posts,
              [communityId]: updated
            }
          };
        });
      },
      votePoll: (communityId, postId, optionIndex) => {
        set((state) => {
          const communityPosts = state.posts[communityId] ?? [];
          const updated = communityPosts.map((p) => {
            if (p.id !== postId || !p.poll) return p;
            const poll = p.poll;
            if (poll.userVotedIndex !== undefined) return p; // prevent double voting
            const options = poll.options.map((opt, idx) => {
              if (idx === optionIndex) {
                return { ...opt, votes: opt.votes + 1 };
              }
              return opt;
            });
            return {
              ...p,
              poll: {
                ...poll,
                options,
                userVotedIndex: optionIndex
              }
            };
          });
          return {
            posts: {
              ...state.posts,
              [communityId]: updated
            }
          };
        });
      }
    }),
    {
      name: "studyconnect-community-feed"
    }
  )
);
