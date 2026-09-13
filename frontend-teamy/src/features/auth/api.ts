import { z } from "zod";
import { apiClient, API_BASE_URL, TOKEN_STORAGE_KEY } from "@/shared/api";

// ─── Zod Schemas ────────────────────────────────────────────────────
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
  google_avatar_url: z.string().nullable(),
  last_online_at: z.string().nullable(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

const AuthResponseSchema = z.object({
  user: AuthUserSchema,
});

export type ProfileUpdatePayload = {
  full_name: string;
};

export async function logout() {
  // Clear the local token immediately — this is the effective logout.
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  // Also notify the backend (best-effort, for future server-side revocation support).
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Ignore errors — the client-side token is already cleared.
  }
}

export async function getCurrentUser() {
  const { data } = await apiClient.get("/auth/me");
  return AuthResponseSchema.parse(data).user;
}

export async function updateCurrentUser(payload: ProfileUpdatePayload) {
  const { data } = await apiClient.patch("/auth/me", payload);
  return AuthResponseSchema.parse(data).user;
}

export async function uploadCurrentUserAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post("/auth/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return AuthResponseSchema.parse(data).user;
}

export async function deleteCurrentUserAvatar() {
  const { data } = await apiClient.delete("/auth/me/avatar");
  return AuthResponseSchema.parse(data).user;
}

export async function restoreGoogleUserAvatar() {
  const { data } = await apiClient.post("/auth/me/avatar/google");
  return AuthResponseSchema.parse(data).user;
}

export function getGoogleLoginUrl() {
  return `${API_BASE_URL}/auth/google/login`;
}
