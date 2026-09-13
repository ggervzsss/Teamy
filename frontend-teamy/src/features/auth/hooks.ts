import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteCurrentUserAvatar, getCurrentUser, logout, restoreGoogleUserAvatar, updateCurrentUser, uploadCurrentUserAvatar } from "@/features/auth/api";
import type { ProfileUpdatePayload } from "@/features/auth/api";
import { useAuthStore } from "@/shared/stores/authStore";

export const authKeys = {
  currentUser: ["auth", "currentUser"] as const,
};

export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: getCurrentUser,
    retry: false,
    meta: { onSettled: true },
    select: (data) => {
      setUser(data);
      return data;
    },
  });
}

export function useLogout() {
  const clearUser = useAuthStore((state) => state.clearUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      queryClient.removeQueries({ queryKey: authKeys.currentUser });
      queryClient.clear();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Logout failed.");
    },
  });
}

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => updateCurrentUser(payload),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authKeys.currentUser, user);
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update your profile.");
    },
  });
}

export function useUploadAvatar() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadCurrentUserAvatar(file),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authKeys.currentUser, user);
      toast.success("Profile photo updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not upload your profile photo.");
    },
  });
}

export function useDeleteAvatar() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCurrentUserAvatar,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authKeys.currentUser, user);
      toast.success("Profile photo restored to default.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not restore the default profile photo.");
    },
  });
}

export function useRestoreGoogleAvatar() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreGoogleUserAvatar,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authKeys.currentUser, user);
      toast.success("Google profile photo restored.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not restore your Google profile photo.");
    },
  });
}
