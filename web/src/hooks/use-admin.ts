import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminListParams } from "../api/admin.api";
import type { ReportStatus } from "../types/admin";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminApi.dashboard()
  });
}

export function useAdminUsers(params: AdminListParams) {
  return useInfiniteQuery({
    queryKey: ["admin", "users", params],
    queryFn: ({ pageParam }) => adminApi.listUsers({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined)
  });
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: Boolean(userId)
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.banUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.unbanUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.activateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.suspendUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
  });
}

export function useAdminCommunities(params: AdminListParams) {
  return useInfiniteQuery({
    queryKey: ["admin", "communities", params],
    queryFn: ({ pageParam }) => adminApi.listCommunities({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined)
  });
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) => adminApi.deleteCommunity(communityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "communities"] })
  });
}

export function useAdminResources(params: AdminListParams) {
  return useInfiniteQuery({
    queryKey: ["admin", "resources", params],
    queryFn: ({ pageParam }) => adminApi.listResources({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined)
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => adminApi.deleteResource(resourceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "resources"] })
  });
}

export function useAdminReports(params: AdminListParams) {
  return useInfiniteQuery({
    queryKey: ["admin", "reports", params],
    queryFn: ({ pageParam }) => adminApi.listReports({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined)
  });
}

export function useReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: ReportStatus }) =>
      adminApi.reviewReport(reportId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
  });
}
