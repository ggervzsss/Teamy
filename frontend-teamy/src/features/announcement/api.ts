import type { AuthUser } from "@/features/auth/api";
import { apiClient, API_BASE_URL } from "@/shared/api";

export type TeamyAnnouncement = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  deadline_date: string | null;
  deadline_done_at: string | null;
  is_record_only: boolean;
  is_read: boolean;
  created_by: AuthUser;
  created_at: string;
  updated_at: string;
};

export type AnnouncementCreatePayload = {
  title: string;
  body: string;
  is_pinned?: boolean;
  deadline_date?: string | null;
  is_record_only?: boolean;
};

export type AnnouncementUpdatePayload = {
  title?: string;
  body?: string;
  is_pinned?: boolean;
  deadline_date?: string | null;
  is_record_only?: boolean;
};

export type AnnouncementSocketEvent =
  | { event: "announcement.created" | "announcement.updated"; announcement: TeamyAnnouncement }
  | { event: "announcement.read"; announcement_id: string; user_id: string; read_at: string }
  | { event: "announcement.deleted"; announcement_id: string };

type AnnouncementListResponse = { announcements: TeamyAnnouncement[] };
type AnnouncementSocketTicketResponse = { ticket: string };

export async function listAnnouncements(projectId: string) {
  const { data } = await apiClient.get<AnnouncementListResponse>(`/projects/${projectId}/announcements`);
  return data.announcements;
}

export async function createAnnouncement(projectId: string, payload: AnnouncementCreatePayload) {
  const { data } = await apiClient.post<TeamyAnnouncement>(`/projects/${projectId}/announcements`, payload);
  return data;
}

export async function updateAnnouncement(projectId: string, announcementId: string, payload: AnnouncementUpdatePayload) {
  const { data } = await apiClient.patch<TeamyAnnouncement>(`/projects/${projectId}/announcements/${announcementId}`, payload);
  return data;
}

export async function getAnnouncement(projectId: string, announcementId: string) {
  const { data } = await apiClient.get<TeamyAnnouncement>(`/projects/${projectId}/announcements/${announcementId}`);
  return data;
}

export async function deleteAnnouncement(projectId: string, announcementId: string) {
  await apiClient.delete(`/projects/${projectId}/announcements/${announcementId}`);
}

export async function markAnnouncementRead(projectId: string, announcementId: string) {
  const { data } = await apiClient.patch<TeamyAnnouncement>(`/projects/${projectId}/announcements/${announcementId}/read`);
  return data;
}

export async function updateAnnouncementPin(projectId: string, announcementId: string, isPinned: boolean) {
  const { data } = await apiClient.patch<TeamyAnnouncement>(`/projects/${projectId}/announcements/${announcementId}/pin`, { is_pinned: isPinned });
  return data;
}

export async function markAnnouncementDeadlineDone(projectId: string, announcementId: string) {
  const { data } = await apiClient.patch<TeamyAnnouncement>(`/projects/${projectId}/announcements/${announcementId}/deadline-done`);
  return data;
}

export async function notifyAnnouncement(projectId: string, announcementId: string) {
  await apiClient.post(`/projects/${projectId}/announcements/${announcementId}/notify`);
}

export async function getAnnouncementSocketTicket(projectId: string) {
  const { data } = await apiClient.get<AnnouncementSocketTicketResponse>(`/projects/${projectId}/announcements/ws-ticket`);
  return data.ticket;
}

export function getAnnouncementSocketUrl(projectId: string, ticket?: string) {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/projects/${projectId}/announcements/ws`;
  url.search = "";
  if (ticket) {
    url.searchParams.set("ticket", ticket);
  }
  return url.toString();
}
