import { z } from "zod";
import { apiClient } from "@/shared/api";

// ─── Zod Schemas ────────────────────────────────────────────────────
export type ProjectRole = "leader" | "co_leader" | "member";

export const TeamyProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon_url: z.string().nullable().optional(),
  color_theme: z.string().nullable().optional(),
  teamy_code: z.string(),
  role: z.enum(["leader", "co_leader", "member"]),
  member_count: z.number(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TeamyProject = z.infer<typeof TeamyProjectSchema>;

const ProjectListResponseSchema = z.object({
  projects: z.array(TeamyProjectSchema),
});

// ─── API Functions ──────────────────────────────────────────────────
export async function listProjects() {
  const { data } = await apiClient.get("/projects");
  return ProjectListResponseSchema.parse(data).projects;
}

export async function getProject(projectId: string) {
  const { data } = await apiClient.get(`/projects/${projectId}`);
  return TeamyProjectSchema.parse(data);
}

export async function getProjectBySlug(slug: string) {
  const { data } = await apiClient.get(`/projects/by-slug/${slug}`);
  return TeamyProjectSchema.parse(data);
}

export async function createProject(payload: { name: string; description?: string }) {
  const { data } = await apiClient.post("/projects", payload);
  return TeamyProjectSchema.parse(data);
}

export async function joinProject(teamyCode: string) {
  const { data } = await apiClient.post("/projects/join", { teamy_code: teamyCode });
  return TeamyProjectSchema.parse(data);
}

export async function importProjectBackup(file: File) {
  const formData = new FormData();
  formData.append("backup", file);
  const { data } = await apiClient.post("/projects/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return TeamyProjectSchema.parse(data);
}

export async function updateProject(projectId: string, payload: { color_theme?: string | null; description?: string | null; icon_url?: string | null; name?: string }) {
  const { data } = await apiClient.patch(`/projects/${projectId}`, payload);
  return TeamyProjectSchema.parse(data);
}

export async function uploadProjectIcon(projectId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post(`/projects/${projectId}/icon`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return TeamyProjectSchema.parse(data);
}

export async function removeProjectIcon(projectId: string) {
  const { data } = await apiClient.delete(`/projects/${projectId}/icon`);
  return TeamyProjectSchema.parse(data);
}

export async function archiveProject(projectId: string) {
  const { data } = await apiClient.post(`/projects/${projectId}/archive`, { confirm_archive: true });
  return TeamyProjectSchema.parse(data);
}

function buildBackupFilename(projectName: string) {
  const safeName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `teamy-${safeName || "workspace"}-backup.json`;
}

function getContentDispositionFilename(contentDisposition: string | undefined) {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1];
}

export async function downloadProjectBackup(projectId: string, projectName: string) {
  const response = await apiClient.get<Blob>(`/projects/${projectId}/export`, { responseType: "blob" });
  const blob = response.data;
  const filename = getContentDispositionFilename(response.headers["content-disposition"]) ?? buildBackupFilename(projectName);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteProject(projectId: string, confirmName: string) {
  await apiClient.delete(`/projects/${projectId}`, { data: { confirm_name: confirmName } });
}
