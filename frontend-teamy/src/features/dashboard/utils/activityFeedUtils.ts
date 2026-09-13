import type { LucideIcon } from "lucide-react";
import { CheckCircle2, FileText, Megaphone } from "lucide-react";
import type { TeamyAnnouncement } from "@/features/announcement/api";
import type { FileResourceSummary } from "@/features/filehub/api";
import type { TeamyTask } from "@/features/taskboard/api";
import { formatRelativeTime, normalizeApiDateTime, parseApiDateTime, toApiDate } from "@/shared/dateTime";
import { getUserDisplayName } from "@/shared/userDisplay";

export type ActivityKind = "announcement" | "task" | "file";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  targetPath: string;
};

export const activityKindLabels: Record<ActivityKind | "all", string> = {
  all: "All activity",
  announcement: "Announcements",
  task: "Tasks",
  file: "Resources",
};

export const activityKindIcons: Record<ActivityKind, LucideIcon> = {
  announcement: Megaphone,
  task: CheckCircle2,
  file: FileText,
};

export { formatRelativeTime, normalizeApiDateTime, parseApiDateTime, toApiDate };

export function formatActivityTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(toApiDate(value));
}

function timestampsDiffer(first: string, second: string) {
  return Math.abs(parseApiDateTime(first) - parseApiDateTime(second)) > 1000;
}

function formatActorList(names: string[]) {
  const uniqueNames = [...new Set(names.filter(Boolean))];
  if (uniqueNames.length === 0) {
    return "Unassigned members";
  }
  if (uniqueNames.length === 1) {
    return uniqueNames[0];
  }
  if (uniqueNames.length === 2) {
    return `${uniqueNames[0]} and ${uniqueNames[1]}`;
  }
  return `${uniqueNames.slice(0, -1).join(", ")}, and ${uniqueNames.at(-1)}`;
}

function getTaskCompletionActor(task: TeamyTask) {
  const completedAssignees = task.assignees.filter((assignee) => assignee.completed_at);
  const assignees = completedAssignees.length > 0 ? completedAssignees : task.assignees;
  return formatActorList(assignees.map((assignee) => getUserDisplayName(assignee.user)));
}

function getTaskCompletionTimestamp(task: TeamyTask) {
  const completedAtValues = task.assignees.map((assignee) => assignee.completed_at).filter((completedAt): completedAt is string => Boolean(completedAt));
  if (completedAtValues.length === 0) {
    return task.updated_at;
  }
  return completedAtValues.sort((a, b) => parseApiDateTime(b) - parseApiDateTime(a))[0];
}

export function buildActivityItems(projectId: string, announcements: TeamyAnnouncement[], tasks: TeamyTask[], files: FileResourceSummary[]) {
  const announcementItems = announcements.flatMap<ActivityItem>((announcement) => {
    const targetPath = `/projects/${projectId}/announcements`;
    const actor = getUserDisplayName(announcement.created_by);
    const items: ActivityItem[] = [
      {
        id: `announcement:${announcement.id}:created`,
        kind: "announcement",
        title: announcement.title,
        description: "posted a project announcement",
        actor,
        timestamp: announcement.created_at,
        targetPath,
      },
    ];
    if (timestampsDiffer(announcement.created_at, announcement.updated_at)) {
      items.push({
        id: `announcement:${announcement.id}:updated`,
        kind: "announcement",
        title: announcement.title,
        description: announcement.is_pinned ? "pinned or updated a project announcement" : "updated a project announcement",
        actor,
        timestamp: announcement.updated_at,
        targetPath,
      });
    }
    return items;
  });

  const taskItems = tasks.flatMap<ActivityItem>((task) => {
    const targetPath = `/projects/${projectId}/task-board`;
    const creator = getUserDisplayName(task.created_by);
    const latestActor = task.reviewed_by ? getUserDisplayName(task.reviewed_by) : creator;
    const items: ActivityItem[] = [
      {
        id: `task:${task.id}:created`,
        kind: "task",
        title: task.title,
        description: "created a task",
        actor: creator,
        timestamp: task.created_at,
        targetPath,
      },
    ];
    if (task.status === "done" && task.is_record_only) {
      items.push({
        id: `task:${task.id}:recorded`,
        kind: "task",
        title: task.title,
        description: "recorded a completed task",
        actor: creator,
        timestamp: task.updated_at,
        targetPath,
      });
      return items;
    }
    if (task.status === "done") {
      items.push({
        id: `task:${task.id}:completed`,
        kind: "task",
        title: task.title,
        description: "completed a task",
        actor: getTaskCompletionActor(task),
        timestamp: getTaskCompletionTimestamp(task),
        targetPath,
      });
      if (task.reviewed_by && task.reviewed_at) {
        items.push({
          id: `task:${task.id}:approved`,
          kind: "task",
          title: task.title,
          description: "approved a completed task",
          actor: getUserDisplayName(task.reviewed_by),
          timestamp: task.reviewed_at,
          targetPath,
        });
      }
      return items;
    }
    if (timestampsDiffer(task.created_at, task.updated_at)) {
      items.push({
        id: `task:${task.id}:updated`,
        kind: "task",
        title: task.title,
        description: task.status === "for_review" ? "moved a task to review" : "updated a task",
        actor: latestActor,
        timestamp: task.updated_at,
        targetPath,
      });
    }
    return items;
  });

  const fileItems = files.flatMap<ActivityItem>((file) => {
    const targetPath = file.kind === "doc" ? `/projects/${projectId}/file-hub/${file.id}` : `/projects/${projectId}/file-hub`;
    const actor = getUserDisplayName(file.created_by);
    const items: ActivityItem[] = [
      {
        id: `file:${file.id}:created`,
        kind: "file",
        title: file.title,
        description: file.kind === "doc" ? "created a Teamy Doc" : "shared a resource link",
        actor,
        timestamp: file.created_at,
        targetPath,
      },
    ];
    if (timestampsDiffer(file.created_at, file.updated_at)) {
      items.push({
        id: `file:${file.id}:updated`,
        kind: "file",
        title: file.title,
        description: file.kind === "doc" ? "updated a Teamy Doc" : "updated a resource link",
        actor,
        timestamp: file.updated_at,
        targetPath,
      });
    }
    return items;
  });

  return [...announcementItems, ...taskItems, ...fileItems].sort((a, b) => parseApiDateTime(b.timestamp) - parseApiDateTime(a.timestamp));
}
