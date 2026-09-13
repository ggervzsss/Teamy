import type { AuthUser } from "@/features/auth/api";
import type { FileResourceSummary } from "@/features/filehub/api";
import { apiClient, API_BASE_URL } from "@/shared/api";

export type TaskStatus = "todo" | "in_progress" | "for_review" | "done";

export type AssigneeStatus = "todo" | "in_progress" | "ready_for_review";
export type PersonalTaskKind = "task" | "ticket";
export type MyTaskStatusUpdate = "todo" | "in_progress" | "ready_for_review" | "done";

export type ProjectMember = {
  id: string;
  user: AuthUser;
  role: "leader" | "co_leader" | "member";
  nickname: string | null;
  joined_at: string;
};

export type TaskAssignee = {
  id: string;
  user: AuthUser;
  status: AssigneeStatus;
  completed_at: string | null;
};

export type TaskImage = {
  id: string;
  task_id: string;
  uploaded_by: AuthUser;
  url: string;
  ticket_item_id: string | null;
  created_at: string;
};

export type TeamyTask = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  start_date: string;
  due_date: string | null;
  status: TaskStatus;
  is_record_only: boolean;
  is_private: boolean;
  personal_kind: PersonalTaskKind;
  created_by: AuthUser;
  reviewed_by: AuthUser | null;
  reviewed_at: string | null;
  review_remarks: string | null;
  assignees: TaskAssignee[];
  linked_files: FileResourceSummary[];
  images: TaskImage[];
  created_at: string;
  updated_at: string;
};

export type TaskLinkedFileCreatePayload =
  | {
      mode: "doc";
      title?: string;
    }
  | {
      mode: "link";
      title?: string;
      url: string;
    };

export type TaskCreatePayload = {
  title: string;
  description?: string;
  assignee_ids: string[];
  start_date?: string;
  due_date?: string;
  initial_status: Extract<TaskStatus, "todo" | "in_progress" | "done">;
  linked_file?: TaskLinkedFileCreatePayload;
  is_record_only?: boolean;
  is_private?: boolean;
  personal_kind?: PersonalTaskKind;
};

export type TaskUpdatePayload = {
  title?: string;
  description?: string | null;
  assignee_ids?: string[];
  start_date?: string | null;
  due_date?: string | null;
};

type ProjectMemberListResponse = {
  members: ProjectMember[];
};

type TaskListResponse = {
  tasks: TeamyTask[];
};

type TaskSocketTicketResponse = {
  ticket: string;
};

export type TaskSocketEvent = {
  event: "task.created" | "task.updated" | "task.submitted" | "task.reviewed" | "task.deleted";
  task: TeamyTask;
};

// ─── API Functions ──────────────────────────────────────────────────
export async function listProjectMembers(projectId: string) {
  const { data } = await apiClient.get<ProjectMemberListResponse>(`/projects/${projectId}/members`);
  return data.members;
}

export async function listTasks(projectId: string) {
  const { data } = await apiClient.get<TaskListResponse>(`/projects/${projectId}/tasks`);
  return data.tasks;
}

export async function listMyTasks(projectId: string) {
  const { data } = await apiClient.get<TaskListResponse>(`/projects/${projectId}/tasks/me`);
  return data.tasks;
}

export async function getTaskSocketTicket(projectId: string) {
  const { data } = await apiClient.get<TaskSocketTicketResponse>(`/projects/${projectId}/tasks/ws-ticket`);
  return data.ticket;
}

export async function createTask(projectId: string, payload: TaskCreatePayload) {
  const { data } = await apiClient.post<TeamyTask>(`/projects/${projectId}/tasks`, payload);
  return data;
}

export async function updateTask(projectId: string, taskId: string, payload: TaskUpdatePayload) {
  const { data } = await apiClient.patch<TeamyTask>(`/projects/${projectId}/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(projectId: string, taskId: string) {
  await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
}

export async function linkTaskFile(projectId: string, taskId: string, payload: TaskLinkedFileCreatePayload) {
  const { data } = await apiClient.post<TeamyTask>(`/projects/${projectId}/tasks/${taskId}/linked-files`, payload);
  return data;
}

export async function linkExistingTaskFile(projectId: string, taskId: string, fileId: string) {
  const { data } = await apiClient.post<TeamyTask>(`/projects/${projectId}/tasks/${taskId}/linked-files/existing`, { file_id: fileId });
  return data;
}

export async function updateMyTaskStatus(projectId: string, taskId: string, status: MyTaskStatusUpdate) {
  const { data } = await apiClient.patch<TeamyTask>(`/projects/${projectId}/tasks/${taskId}/assignees/me`, { status });
  return data;
}

export async function submitTaskForReview(projectId: string, taskId: string) {
  const { data } = await apiClient.post<TeamyTask>(`/projects/${projectId}/tasks/${taskId}/submit-review`, {});
  return data;
}

export async function reviewTask(projectId: string, taskId: string, action: "approve" | "request_changes", remarks?: string) {
  const { data } = await apiClient.post<TeamyTask>(`/projects/${projectId}/tasks/${taskId}/review`, { action, remarks });
  return data;
}

export function getTaskSocketUrl(projectId: string, ticket?: string) {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/projects/${projectId}/tasks/ws`;
  url.search = "";
  if (ticket) {
    url.searchParams.set("ticket", ticket);
  }
  return url.toString();
}

// ─── Task Image API ──────────────────────────────────────────────────────────
export async function listTaskImages(projectId: string, taskId: string): Promise<TaskImage[]> {
  const { data } = await apiClient.get<TaskImage[]>(`/projects/${projectId}/tasks/${taskId}/images`);
  return data;
}

export async function uploadTaskImage(projectId: string, taskId: string, file: File, ticketItemId?: string): Promise<TaskImage> {
  const formData = new FormData();
  formData.append("file", file);
  if (ticketItemId) {
    formData.append("ticket_item_id", ticketItemId);
  }
  const { data } = await apiClient.post<TaskImage>(`/projects/${projectId}/tasks/${taskId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteTaskImage(projectId: string, taskId: string, imageId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/tasks/${taskId}/images/${imageId}`);
}
