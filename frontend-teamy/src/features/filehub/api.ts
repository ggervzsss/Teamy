import type { AuthUser } from "@/features/auth/api";
import type { TaskStatus } from "@/features/taskboard/api";
import { apiClient } from "@/shared/api";

export type FileResourceKind = "doc" | "link";

export type LinkedTaskSummary = {
  id: string;
  title: string;
  status: TaskStatus;
};

export type FileResourceSummary = {
  id: string;
  project_id: string;
  title: string;
  kind: FileResourceKind;
  url: string | null;
  created_by: AuthUser;
  linked_tasks: LinkedTaskSummary[];
  created_at: string;
  updated_at: string;
};

export type FileResource = FileResourceSummary & {
  content_html: string | null;
};

export type FileResourceCreatePayload =
  | {
      kind: "doc";
      title: string;
      content_html?: string;
    }
  | {
      kind: "link";
      title: string;
      url: string;
    };

export type FileResourceUpdatePayload = {
  title?: string;
  url?: string;
  content_html?: string;
};

type FileResourceListResponse = {
  files: FileResourceSummary[];
};

// ─── API Functions ──────────────────────────────────────────────────
export async function listFileResources(projectId: string) {
  const { data } = await apiClient.get<FileResourceListResponse>(`/projects/${projectId}/files`);
  return data.files;
}

export async function createFileResource(projectId: string, payload: FileResourceCreatePayload) {
  const { data } = await apiClient.post<FileResource>(`/projects/${projectId}/files`, payload);
  return data;
}

export async function getFileResource(projectId: string, fileId: string) {
  const { data } = await apiClient.get<FileResource>(`/projects/${projectId}/files/${fileId}`);
  return data;
}

export async function updateFileResource(projectId: string, fileId: string, payload: FileResourceUpdatePayload) {
  const { data } = await apiClient.patch<FileResource>(`/projects/${projectId}/files/${fileId}`, payload);
  return data;
}

export async function deleteFileResource(projectId: string, fileId: string) {
  await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
}
