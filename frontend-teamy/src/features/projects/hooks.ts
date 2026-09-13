import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { TeamyProject } from "@/features/projects/api";
import { archiveProject, createProject, deleteProject, getProject, joinProject, listProjects, removeProjectIcon, updateProject, uploadProjectIcon } from "@/features/projects/api";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: listProjects,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId!),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) => createProject(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Project created.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create project.");
    },
  });
}

export function useJoinProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamyCode: string) => joinProject(teamyCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Project joined.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not join project.");
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { color_theme?: string | null; description?: string | null; icon_url?: string | null; name?: string }) => updateProject(projectId, payload),
    onSuccess: (nextProject) => {
      queryClient.setQueryData(projectKeys.detail(projectId), nextProject);
      queryClient.setQueryData<TeamyProject[]>(projectKeys.all, (old) => (old ? old.map((p) => (p.id === nextProject.id ? nextProject : p)) : old));
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Workspace updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the workspace.");
    },
  });
}

export function useUploadProjectIcon(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadProjectIcon(projectId, file),
    onSuccess: (nextProject) => {
      queryClient.setQueryData(projectKeys.detail(projectId), nextProject);
      queryClient.setQueryData<TeamyProject[]>(projectKeys.all, (old) => (old ? old.map((p) => (p.id === nextProject.id ? nextProject : p)) : old));
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Workspace icon uploaded.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not upload workspace icon.");
    },
  });
}

export function useRemoveProjectIcon(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => removeProjectIcon(projectId),
    onSuccess: (nextProject) => {
      queryClient.setQueryData(projectKeys.detail(projectId), nextProject);
      queryClient.setQueryData<TeamyProject[]>(projectKeys.all, (old) => (old ? old.map((p) => (p.id === nextProject.id ? nextProject : p)) : old));
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Workspace icon removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove workspace icon.");
    },
  });
}

export function useArchiveProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveProject(projectId),
    onSuccess: (nextProject) => {
      queryClient.setQueryData(projectKeys.detail(projectId), nextProject);
      queryClient.setQueryData<TeamyProject[]>(projectKeys.all, (old) => (old ? old.map((p) => (p.id === nextProject.id ? nextProject : p)) : old));
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Workspace archived. Project content is now read-only.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not archive the workspace.");
    },
  });
}

export function useDeleteProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (confirmName: string) => deleteProject(projectId, confirmName),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Workspace deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete the workspace.");
    },
  });
}
