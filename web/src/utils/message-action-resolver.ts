import type { LocalMessage, Channel as StreamChannel } from "stream-chat";

export interface MessageActionPermissions {
  canReply: boolean;
  canReact: boolean;
  canCopy: boolean;
  canEdit: boolean;
  canDeleteForMe: boolean;
  canDeleteForEveryone: boolean;
  canForward: boolean;
  canStar: boolean;
  canPin: boolean;
  canReport: boolean;
  isPinned: boolean;
  isStarred: boolean;
  isMine: boolean;
}

export interface ResolveMessageActionsParams {
  message: LocalMessage;
  currentUserId: string;
  channel?: StreamChannel | null;
  isDM?: boolean;
  channelRole?: string;
  isStarred?: boolean;
}

/**
 * Centralized Message Action Resolver
 * Evaluates message state, authorship, channel type, and user permissions
 * to deterministically produce available actions for UI menus on all devices.
 */
export function resolveMessageActions({
  message,
  currentUserId,
  channel,
  isDM = false,
  channelRole = "member",
  isStarred = false
}: ResolveMessageActionsParams): MessageActionPermissions {
  const isDeleted = message.type === "deleted" || Boolean(message.deleted_at);

  const authorId = message.user?.id || (message.user as any)?._id || "";
  const isMine = Boolean(
    currentUserId &&
      (authorId === currentUserId ||
        (channel?.client?.userID && authorId === channel.client.userID))
  );

  const hasContent = Boolean(
    message.text?.trim() || (message.attachments && message.attachments.length > 0)
  );

  const isModerator =
    channelRole === "owner" ||
    channelRole === "admin" ||
    channelRole === "moderator" ||
    (channel?.state?.membership as any)?.role === "admin" ||
    (channel?.state?.membership as any)?.role === "moderator" ||
    (channel?.state?.membership as any)?.role === "owner";

  const isPinned = Boolean(message.pinned);

  if (isDeleted) {
    return {
      canReply: false,
      canReact: false,
      canCopy: false,
      canEdit: false,
      canDeleteForMe: true,
      canDeleteForEveryone: false,
      canForward: false,
      canStar: false,
      canPin: false,
      canReport: false,
      isPinned: false,
      isStarred: false,
      isMine
    };
  }

  return {
    canReply: true,
    canReact: true,
    canCopy: Boolean(message.text?.trim()),
    canEdit: isMine && Boolean(message.text),
    canDeleteForMe: true,
    canDeleteForEveryone: isMine || isModerator,
    canForward: hasContent,
    canStar: true,
    // Pinning: DMs allow either peer; Community channels require moderator/admin/owner
    canPin: isDM ? true : isModerator,
    canReport: !isMine,
    isPinned,
    isStarred,
    isMine
  };
}
