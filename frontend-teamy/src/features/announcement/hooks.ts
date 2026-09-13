import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createAnnouncement, listAnnouncements, markAnnouncementRead, updateAnnouncement, updateAnnouncementPin } from "@/features/announcement/api";
import type { AnnouncementCreatePayload, AnnouncementUpdatePayload } from "@/features/announcement/api";

export const announcementKeys = {
  list: (projectId: string) => ["announcements", projectId] as const,
};

export function useAnnouncements(projectId: string) {
  return useQuery({
    queryKey: announcementKeys.list(projectId),
    queryFn: () => listAnnouncements(projectId),
  });
}

export function useCreateAnnouncement(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementCreatePayload) => createAnnouncement(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.list(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create the announcement.");
    },
  });
}

export function useUpdateAnnouncement(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, payload }: { announcementId: string; payload: AnnouncementUpdatePayload }) => updateAnnouncement(projectId, announcementId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.list(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the announcement.");
    },
  });
}

export function useMarkAnnouncementRead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => markAnnouncementRead(projectId, announcementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.list(projectId) });
    },
  });
}

export function useUpdateAnnouncementPin(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, isPinned }: { announcementId: string; isPinned: boolean }) => updateAnnouncementPin(projectId, announcementId, isPinned),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.list(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update pin status.");
    },
  });
}
