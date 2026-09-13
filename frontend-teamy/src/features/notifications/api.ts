import { API_BASE_URL, apiClient } from "@/shared/api";

export type TeamyNotification = {
  id: string;
  project_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  target_path: string | null;
  is_email_backed: boolean;
  read_at: string | null;
  created_at: string;
};

type NotificationListResponse = {
  notifications: TeamyNotification[];
  unread_count: number;
};

type NotificationSocketTicketResponse = {
  ticket: string;
};

export type NotificationSocketEvent =
  | {
      event: "notification.created";
      notification: TeamyNotification;
    }
  | {
      event: "notification.read";
      notification: TeamyNotification;
    }
  | {
      event: "notification.read_all";
    };

export async function listNotifications(limit = 50) {
  const { data } = await apiClient.get<NotificationListResponse>("/notifications", { params: { limit } });
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { data } = await apiClient.patch<TeamyNotification>(`/notifications/${notificationId}/read`, {});
  return data;
}

export async function markAllNotificationsRead() {
  await apiClient.post("/notifications/read-all", {});
}

export async function getNotificationSocketTicket() {
  const { data } = await apiClient.get<NotificationSocketTicketResponse>("/notifications/ws-ticket");
  return data.ticket;
}

export function getNotificationSocketUrl(ticket?: string) {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/notifications/ws";
  url.search = "";
  if (ticket) {
    url.searchParams.set("ticket", ticket);
  }
  return url.toString();
}
