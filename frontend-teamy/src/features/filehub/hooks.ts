import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createFileResource, deleteFileResource, getFileResource, listFileResources, updateFileResource } from "@/features/filehub/api";
import type { FileResourceCreatePayload, FileResourceUpdatePayload } from "@/features/filehub/api";

export const fileHubKeys = {
  list: (projectId: string) => ["fileHub", projectId] as const,
  detail: (projectId: string, fileId: string) => ["fileHub", projectId, fileId] as const,
};

export function useFileResources(projectId: string) {
  return useQuery({
    queryKey: fileHubKeys.list(projectId),
    queryFn: () => listFileResources(projectId),
  });
}

export function useFileResource(projectId: string, fileId: string) {
  return useQuery({
    queryKey: fileHubKeys.detail(projectId, fileId),
    queryFn: () => getFileResource(projectId, fileId),
    enabled: !!fileId,
  });
}

export function useCreateFileResource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FileResourceCreatePayload) => createFileResource(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fileHubKeys.list(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create the resource.");
    },
  });
}

export function useUpdateFileResource(projectId: string, fileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FileResourceUpdatePayload) => updateFileResource(projectId, fileId, payload),
    onSuccess: (nextResource) => {
      queryClient.setQueryData(fileHubKeys.detail(projectId, fileId), nextResource);
      void queryClient.invalidateQueries({ queryKey: fileHubKeys.list(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the resource.");
    },
  });
}

export function useDeleteFileResource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => deleteFileResource(projectId, fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fileHubKeys.list(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete the resource.");
    },
  });
}
