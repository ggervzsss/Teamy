import type { TeamyTask, TaskStatus } from "@/features/taskboard/api";
import { toLocalDate } from "@/shared/dateTime";

// ─── Types ──────────────────────────────────────────────────────────
export type EffectiveStatus = TaskStatus | "overdue" | "resolved";

export type TimelineTask = TeamyTask & {
  effectiveStatus: EffectiveStatus;
};

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

// ─── Status Configuration ───────────────────────────────────────────
export const statusConfig: Record<EffectiveStatus, { label: string; color: string; bg: string; border: string }> = {
  todo: { label: "To Do", color: "#9ca3af", bg: "rgba(156,163,175,0.12)", border: "rgba(156,163,175,0.25)" },
  in_progress: { label: "In Progress", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.25)" },
  for_review: { label: "For Review", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
  done: { label: "Done", color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.25)" },
  overdue: { label: "Overdue", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" },
  resolved: { label: "Resolved", color: "#2dd4bf", bg: "rgba(45,212,191,0.12)", border: "rgba(45,212,191,0.25)" },
};

export const effectiveStatusOrder: EffectiveStatus[] = ["todo", "in_progress", "for_review", "done", "overdue", "resolved"];

// ─── Status Logic ───────────────────────────────────────────────────
export function getEffectiveStatus(task: TeamyTask, resolvedTaskIds: Set<string>): EffectiveStatus {
  if (resolvedTaskIds.has(task.id)) {
    return "resolved";
  }
  if (task.status === "done") {
    return "done";
  }
  if (task.due_date) {
    const dueDate = toLocalDate(task.due_date);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dueDate < startOfToday) {
      return "overdue";
    }
  }
  return task.status;
}

// ─── Date Utilities ─────────────────────────────────────────────────
export function getDaysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

export function dayIndex(base: Date, target: Date): number {
  return Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getGanttRange(tasks: TimelineTask[] = [], fallbackDate: Date = new Date()) {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const task of tasks) {
    if (!task.start_date) continue;
    const taskStart = toLocalDate(task.start_date).getTime();
    const taskEnd = task.due_date ? toLocalDate(task.due_date).getTime() : taskStart;
    if (taskStart < minTime) minTime = taskStart;
    if (taskEnd > maxTime) maxTime = taskEnd;
  }

  if (minTime === Infinity || maxTime === -Infinity) {
    const start = new Date(fallbackDate.getFullYear(), fallbackDate.getMonth() - 1, 1);
    const end = new Date(fallbackDate.getFullYear(), fallbackDate.getMonth() + 2, 0);
    return { start, end };
  }

  const minDate = new Date(minTime);
  const maxDate = new Date(maxTime);

  // Pad 1 month before earliest task start date and 1 month after latest task due date
  const start = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);

  return { start, end };
}

export function buildMonthHeaders(dates: Date[]) {
  const headers: Array<{ label: string; startIndex: number; days: number }> = [];
  let currentMonth = -1;
  let currentYear = -1;

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
      currentMonth = date.getMonth();
      currentYear = date.getFullYear();
      headers.push({
        label: new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date),
        startIndex: i,
        days: 1,
      });
    } else {
      headers[headers.length - 1].days++;
    }
  }

  return headers;
}

// ─── Grouping ───────────────────────────────────────────────────────
export function groupTasksByMonth(
  tasks: TimelineTask[],
  sortOrder: "newest" | "oldest" = "newest"
): Array<{ label: string; yearMonth: string; tasks: TimelineTask[] }> {
  const groups = new Map<string, { label: string; yearMonth: string; tasks: TimelineTask[] }>();
  const noDateTasks: TimelineTask[] = [];

  for (const task of tasks) {
    if (!task.start_date) {
      noDateTasks.push(task);
      continue;
    }
    const date = toLocalDate(task.start_date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);

    if (!groups.has(yearMonth)) {
      groups.set(yearMonth, { label, yearMonth, tasks: [] });
    }
    groups.get(yearMonth)!.tasks.push(task);
  }

  const isNewest = sortOrder === "newest";

  // Sort tasks within each group by start date according to sortOrder
  for (const group of groups.values()) {
    group.tasks.sort((a, b) => {
      const aDate = a.start_date ? toLocalDate(a.start_date).getTime() : 0;
      const bDate = b.start_date ? toLocalDate(b.start_date).getTime() : 0;
      return isNewest ? bDate - aDate : aDate - bDate;
    });
  }

  const sorted = Array.from(groups.values()).sort((a, b) =>
    isNewest ? b.yearMonth.localeCompare(a.yearMonth) : a.yearMonth.localeCompare(b.yearMonth)
  );

  if (noDateTasks.length > 0) {
    if (isNewest) {
      sorted.push({ label: "No Start Date", yearMonth: "0000-00", tasks: noDateTasks });
    } else {
      sorted.push({ label: "No Start Date", yearMonth: "9999-99", tasks: noDateTasks });
    }
  }

  return sorted;
}

// ─── Lane Packing (Track Allocation) ────────────────────────────────
export function packTasksIntoLanes(tasks: TimelineTask[]): TimelineTask[][] {
  if (tasks.length === 0) return [];

  const sorted = [...tasks].sort((a, b) => {
    const aStart = toLocalDate(a.start_date).getTime();
    const bStart = toLocalDate(b.start_date).getTime();
    return aStart - bStart;
  });

  const lanes: TimelineTask[][] = [];

  for (const task of sorted) {
    const taskStart = toLocalDate(task.start_date).getTime();
    let placed = false;

    for (const lane of lanes) {
      const lastTask = lane[lane.length - 1];
      const lastTaskEnd = (lastTask.due_date ? toLocalDate(lastTask.due_date) : toLocalDate(lastTask.start_date)).getTime();

      if (taskStart >= lastTaskEnd) {
        lane.push(task);
        placed = true;
        break;
      }
    }

    if (!placed) {
      lanes.push([task]);
    }
  }

  return lanes;
}

// ─── Persistence ────────────────────────────────────────────────────
export function loadResolvedIds(projectId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`teamy:timeline:resolved:${projectId}`);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveResolvedIds(projectId: string, ids: Set<string>): void {
  localStorage.setItem(`teamy:timeline:resolved:${projectId}`, JSON.stringify([...ids]));
}
