import type { TeamyAnnouncement } from "@/features/announcement/api";
import type { TeamyTask } from "@/features/taskboard/api";
import { apiClient } from "@/shared/api";
import type { ActivityItem } from "./utils/activityFeedUtils";

export type DashboardDeadlineItem = {
  id: string;
  sourceId: string;
  kind: "announcement" | "task";
  title: string;
  dueDate: string | null;
};

export type DashboardSummary = {
  recentAnnouncements: TeamyAnnouncement[];
  pendingTasks: TeamyTask[];
  tasksForReview: TeamyTask[];
  deadlineItems: DashboardDeadlineItem[];
  activityItems: ActivityItem[];
  activeTaskCount: number;
  myPendingTaskCount: number;
  tasksForReviewCount: number;
};

type DashboardSummaryResponse = {
  recent_announcements: TeamyAnnouncement[];
  pending_tasks: TeamyTask[];
  tasks_for_review: TeamyTask[];
  deadline_items: Array<{
    id: string;
    source_id: string;
    kind: "announcement" | "task";
    title: string;
    due_date: string | null;
  }>;
  activity_items: Array<{
    id: string;
    kind: "announcement" | "task" | "file";
    title: string;
    description: string;
    actor: string;
    timestamp: string;
    target_path: string;
  }>;
  active_task_count: number;
  my_pending_task_count: number;
  tasks_for_review_count: number;
};

export async function getDashboardSummary(projectId: string): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummaryResponse>(`/projects/${projectId}/dashboard`);

  return {
    recentAnnouncements: data.recent_announcements,
    pendingTasks: data.pending_tasks,
    tasksForReview: data.tasks_for_review,
    deadlineItems: data.deadline_items.map((item) => ({
      id: item.id,
      sourceId: item.source_id,
      kind: item.kind,
      title: item.title,
      dueDate: item.due_date,
    })),
    activityItems: data.activity_items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      actor: item.actor,
      timestamp: item.timestamp,
      targetPath: item.target_path,
    })),
    activeTaskCount: data.active_task_count,
    myPendingTaskCount: data.my_pending_task_count,
    tasksForReviewCount: data.tasks_for_review_count,
  };
}
