import type { AuthUser } from "@/features/auth/api";
import { apiClient, API_BASE_URL } from "@/shared/api";

export type ProjectMemberRole = "leader" | "co_leader" | "member";

export type TeamMember = {
  id: string;
  user: AuthUser;
  role: ProjectMemberRole;
  nickname: string | null;
  joined_at: string;
};

export type TeamPresenceMember = TeamMember & {
  is_online: boolean;
  last_online_at: string | null;
};

export type TeamSocketEvent =
  | {
      event: "team.member_joined";
      member: TeamMember;
    }
  | {
      event: "team.member_updated";
      member: TeamMember;
    }
  | {
      event: "team.presence";
      members: TeamPresenceMember[];
    };

type ProjectMemberListResponse = {
  members: TeamMember[];
};

type ProjectPresenceResponse = {
  members: TeamPresenceMember[];
};

type TeamSocketTicketResponse = {
  ticket: string;
};

// ─── API Functions ──────────────────────────────────────────────────
export async function listTeamMembers(projectId: string) {
  const { data } = await apiClient.get<ProjectMemberListResponse>(`/projects/${projectId}/members`);
  return data.members;
}

export async function listTeamPresence(projectId: string) {
  const { data } = await apiClient.get<ProjectPresenceResponse>(`/projects/${projectId}/members/presence`);
  return data.members;
}

export async function updateTeamMemberNickname(projectId: string, memberId: string, nickname: string | null) {
  const { data } = await apiClient.patch<TeamMember>(`/projects/${projectId}/members/${memberId}/nickname`, { nickname });
  return data;
}

export async function updateTeamMemberRole(projectId: string, memberId: string, role: "co_leader" | "member") {
  const { data } = await apiClient.patch<TeamMember>(`/projects/${projectId}/members/${memberId}/role`, { role });
  return data;
}

export async function getTeamSocketTicket(projectId: string) {
  const { data } = await apiClient.get<TeamSocketTicketResponse>(`/projects/${projectId}/members/ws-ticket`);
  return data.ticket;
}

export function getTeamSocketUrl(projectId: string, ticket?: string) {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/projects/${projectId}/members/ws`;
  url.search = "";
  if (ticket) {
    url.searchParams.set("ticket", ticket);
  }
  return url.toString();
}
