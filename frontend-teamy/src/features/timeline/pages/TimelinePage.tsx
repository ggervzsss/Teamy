import { ArrowUpDown, BarChart3, List } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getTaskSocketTicket, getTaskSocketUrl, listTasks } from "@/features/taskboard/api";
import type { TaskSocketEvent, TeamyTask } from "@/features/taskboard/api";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { Skeleton } from "@/shared/components/Skeleton";
import { parseApiDateTime } from "@/shared/dateTime";
import {
  effectiveStatusOrder,
  getEffectiveStatus,
  loadResolvedIds,
  saveResolvedIds,
  statusConfig,
} from "../utils/timelineUtils";
import type { EffectiveStatus, TimelineTask } from "../utils/timelineUtils";
import { TimelineGanttView } from "../components/TimelineGanttView";
import { TimelineListView } from "../components/TimelineListView";
import { TaskDetailTimelineModal } from "../components/TaskDetailTimelineModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const timelineViewStorageKey = "teamy:timeline:view-mode";
const timelineSortOrderStorageKey = "teamy:timeline:sort-order";

function readStoredTimelineViewMode(): "gantt" | "list" {
  if (typeof window === "undefined") {
    return "list";
  }
  try {
    const stored = window.localStorage.getItem(timelineViewStorageKey);
    return stored === "gantt" || stored === "list" ? stored : "list";
  } catch {
    return "list";
  }
}

function readStoredTimelineSortOrder(): "newest" | "oldest" {
  if (typeof window === "undefined") {
    return "newest";
  }
  try {
    const stored = window.localStorage.getItem(timelineSortOrderStorageKey);
    return stored === "newest" || stored === "oldest" ? stored : "newest";
  } catch {
    return "newest";
  }
}

function TimelinePage() {
  const { project } = useProjectContext();
  const [tasks, setTasks] = useState<TeamyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);
  const [viewMode, setViewMode] = useState<"gantt" | "list">(() => readStoredTimelineViewMode());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(() => readStoredTimelineSortOrder());

  function handleViewModeChange(nextMode: "gantt" | "list") {
    setViewMode(nextMode);
    try {
      window.localStorage.setItem(timelineViewStorageKey, nextMode);
    } catch {
      // ignore storage write errors
    }
  }

  function handleSortOrderChange(nextOrder: "newest" | "oldest") {
    setSortOrder(nextOrder);
    try {
      window.localStorage.setItem(timelineSortOrderStorageKey, nextOrder);
    } catch {
      // ignore storage write errors
    }
  }

  const [currentDate] = useState(() => new Date());
  const [prevProjectId, setPrevProjectId] = useState(project.id);
  const [resolvedTaskIds, setResolvedTaskIds] = useState<Set<string>>(() => loadResolvedIds(project.id));

  if (prevProjectId !== project.id) {
    setPrevProjectId(project.id);
    setResolvedTaskIds(loadResolvedIds(project.id));
  }

  const handleResolveTask = (taskId: string) => {
    setResolvedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      saveResolvedIds(project.id, next);
      toast.success("Task marked as resolved.");
      return next;
    });
  };

  const handleUnresolveTask = (taskId: string) => {
    setResolvedTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      saveResolvedIds(project.id, next);
      toast.success("Resolution undone.");
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    listTasks(project.id)
      .then((loadedTasks) => {
        if (isMounted) {
          setTasks(loadedTasks);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load timeline tasks.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [project.id]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let isActive = true;

    const connectTimer = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      void getTaskSocketTicket(project.id)
        .then((ticket) => {
          if (!isActive) {
            return;
          }

          socket = new WebSocket(getTaskSocketUrl(project.id, ticket));
          socket.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data as string) as TaskSocketEvent;
              if (payload.event === "task.created") {
                setTasks((prev) => [payload.task, ...prev.filter((t) => t.id !== payload.task.id)]);
              } else if (payload.event === "task.updated") {
                setTasks((prev) => prev.map((t) => (t.id === payload.task.id ? payload.task : t)));
              } else if (payload.event === "task.deleted") {
                setTasks((prev) => prev.filter((t) => t.id !== payload.task.id));
              }
            } catch {
              // ignore malformed socket payload
            }
          };
        })
        .catch(() => {
          // ticket fetch failure handled gracefully
        });
    }, 150);

    return () => {
      isActive = false;
      window.clearTimeout(connectTimer);
      if (socket) {
        socket.close();
      }
    };
  }, [project.id]);

  const timelineTasks = useMemo<TimelineTask[]>(() => {
    return tasks
      .filter((task) => Boolean(task.start_date))
      .map((task) => ({
        ...task,
        effectiveStatus: getEffectiveStatus(task, resolvedTaskIds),
      }))
      .sort((a, b) => {
        const timeA = parseApiDateTime(a.start_date || a.created_at);
        const timeB = parseApiDateTime(b.start_date || b.created_at);
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [tasks, resolvedTaskIds, sortOrder]);

  const statusCounts = useMemo(() => {
    const counts: Record<EffectiveStatus, number> = {
      todo: 0,
      in_progress: 0,
      for_review: 0,
      done: 0,
      overdue: 0,
      resolved: 0,
    };
    timelineTasks.forEach((task) => {
      counts[task.effectiveStatus] = (counts[task.effectiveStatus] || 0) + 1;
    });
    return counts;
  }, [timelineTasks]);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Timeline</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">Gantt chart visualization and milestone tracking for {project.name}.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              className={`${labelFont} inline-flex items-center gap-2 rounded-md px-3 py-2 uppercase transition-all ${
                viewMode === "gantt" ? "bg-[#a855f7]/25 text-white font-bold border border-[#a855f7]/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
              }`}
              onClick={() => handleViewModeChange("gantt")}
              type="button"
            >
              <BarChart3 aria-hidden="true" size={14} />
              Gantt View
            </button>
            <button
              className={`${labelFont} inline-flex items-center gap-2 rounded-md px-3 py-2 uppercase transition-all ${
                viewMode === "list" ? "bg-[#a855f7]/25 text-white font-bold border border-[#a855f7]/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
              }`}
              onClick={() => handleViewModeChange("list")}
              type="button"
            >
              <List aria-hidden="true" size={14} />
              List View
            </button>
          </div>
        </div>
      </header>

      {/* ── Legend Bar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {effectiveStatusOrder.map((st) => {
            const cfg = statusConfig[st];
            const count = statusCounts[st] || 0;
            return (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105 shadow-xs"
                key={st}
                style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className={`${labelFont} font-semibold uppercase`} style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-xs font-bold text-white/90">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1 backdrop-blur-md">
            <span className={`${labelFont} flex items-center gap-1.5 pl-2.5 text-[#8e9192] uppercase`}>
              <ArrowUpDown aria-hidden="true" className="text-[#a855f7]" size={14} />
              Sort:
            </span>
            <select
              aria-label="Timeline Task Sort Order"
              className={`${labelFont} cursor-pointer rounded-md border border-white/10 bg-[#18181b] px-3 py-1.5 font-semibold text-white uppercase outline-none transition-all focus:border-[#a855f7] hover:border-white/20`}
              onChange={(e) => handleSortOrderChange(e.target.value as "newest" | "oldest")}
              value={sortOrder}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Older First</option>
            </select>
          </div>

          {viewMode === "gantt" ? (
            <div className="flex items-center gap-2">
              <span className={`${labelFont} rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white uppercase backdrop-blur-md`}>
                All Project Months
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : viewMode === "gantt" ? (
        <TimelineGanttView currentDate={currentDate} onSelect={setSelectedTask} tasks={timelineTasks} />
      ) : (
        <TimelineListView onSelect={setSelectedTask} sortOrder={sortOrder} tasks={timelineTasks} />
      )}

      <AnimatePresence>
        {selectedTask ? (
          <TaskDetailTimelineModal
            item={selectedTask}
            key={selectedTask.id}
            onClose={() => setSelectedTask(null)}
            onResolve={handleResolveTask}
            onUnresolve={handleUnresolveTask}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default TimelinePage;
