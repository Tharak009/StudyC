import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { directMessagesApi } from "../api/direct-messages.api";

export function useConversations(search?: string) {
  return useInfiniteQuery({
    queryKey: ["direct-messages", "conversations", search],
    queryFn: ({ pageParam }) =>
      directMessagesApi.listConversations({ page: pageParam, limit: 20, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined)
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["direct-messages", "conversation", conversationId],
    queryFn: () => directMessagesApi.getConversation(conversationId!),
    enabled: Boolean(conversationId)
  });
}

export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["direct-messages", "messages", conversationId],
    queryFn: ({ pageParam }) =>
      directMessagesApi.getMessages(conversationId!, { page: pageParam, limit: 30, order: "latest" }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
    enabled: Boolean(conversationId)
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["direct-messages", "unread"],
    queryFn: () => directMessagesApi.unreadCount(),
    refetchInterval: 30_000
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receiverId: string) => directMessagesApi.startConversation(receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "conversations"] });
    }
  });
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      content,
      replyTo,
      attachments
    }: {
      content: string;
      replyTo?: string;
      attachments?: File[];
    }) => directMessagesApi.sendMessage(conversationId!, { content, replyTo, attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "conversations"] });
    }
  });
}

export function useEditMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      directMessagesApi.editMessage(messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "messages", conversationId] });
    }
  });
}

export function useDeleteMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => directMessagesApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "messages", conversationId] });
    }
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => directMessagesApi.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", "unread"] });
    }
  });
}
