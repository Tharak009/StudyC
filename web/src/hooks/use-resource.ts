import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourcesApi, type ResourceListParams } from "../api/resources.api";

export function useCommunityResources(communityId: string | undefined, params: ResourceListParams) {
  return useInfiniteQuery({
    queryKey: ["community-resources", communityId, params],
    queryFn: ({ pageParam }) =>
      resourcesApi.listByCommunity(communityId!, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined),
    enabled: Boolean(communityId)
  });
}

export function useGlobalResources(params: ResourceListParams) {
  return useInfiniteQuery({
    queryKey: ["resources", params],
    queryFn: ({ pageParam }) =>
      resourcesApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined)
  });
}

export function useResource(resourceId: string | undefined) {
  return useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => resourcesApi.details(resourceId!),
    enabled: Boolean(resourceId)
  });
}

export function useCreateResource(communityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: Parameters<typeof resourcesApi.create>[1]; file: File }) =>
      resourcesApi.create(communityId!, data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-resources", communityId] });
    }
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, data, file }: { resourceId: string; data: Partial<Parameters<typeof resourcesApi.create>[1]>; file?: File }) =>
      resourcesApi.update(resourceId, data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
      queryClient.invalidateQueries({ queryKey: ["community-resources"] });
    }
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => resourcesApi.delete(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-resources"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    }
  });
}

export function useDownloadResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => resourcesApi.download(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
    }
  });
}
