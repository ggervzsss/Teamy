import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TaskViewer } from "@/shared/components/TaskViewerPresence";
import { createPortal } from "react-dom";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/shared/components/Skeleton";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { parseApiDateTime } from "@/shared/dateTime";
import { StatusFilterDropdown } from "@/shared/components/StatusFilterDropdown";
import { createTask, getTaskSocketTicket, getTaskSocketUrl, listMyTasks, listProjectMembers, submitTaskForReview, updateMyTaskStatus } from "@/features/taskboard/api";
import type { MyTaskStatusUpdate, PersonalTaskKind, ProjectMember, TaskSocketEvent, TaskStatus, TeamyTask } from "@/features/taskboard/api";
import { useScrollLock } from "@/shared/useScrollLock";
import { CheckSquare, Circle, ClipboardList, Clock, LockKeyhole, Plus, Ticket, Users } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { MyTaskHeader } from "../components/MyTaskHeader";
import { MyTaskRow } from "../components/MyTaskTable";
import { MyTaskDetailModal } from "../components/MyTaskDetailModal";
import { CreatePersonalTaskModal } from "../components/CreatePersonalTaskModal";
import type { PersonalFormState } from "../components/CreatePersonalTaskModal";
import { makeTicketItem, serializeTicketItems } from "../utils/ticketHelpers";

type TaskTypeFilter = "group" | "private";
type StatusFilter = "all" | TaskStatus;
type PersonalCreateStatus = Extract<TaskStatus, "todo" | "in_progress">;

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const myTasksStatusFilterStorageKey = "teamy:my-tasks:status-filter";
const myTasksShowDoneStorageKey = "teamy:my-tasks:show-done";

const initialPersonalForm: PersonalFormState = {
  title: "",
  description: "",
  dueDate: "",
  status: "todo" as PersonalCreateStatus,
  kind: "task" as PersonalTaskKind,
  ticketItems: [],
  collaboratorIds: [],
};

function upsertTask(tasks: TeamyTask[], nextTask: TeamyTask) {
  const existingIndex = tasks.findIndex((task) => task.id === nextTask.id);
  if (existingIndex === -1) {
    return [nextTask, ...tasks].sort((a, b) => parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at));
  }
  return tasks.map((task) => (task.id === nextTask.id ? nextTask : task));
}

function getToastErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function readStoredMyTasksStatusFilter(): StatusFilter {
  if (typeof window === "undefined") {
    return "all";
  }

  try {
    const storedFilter = window.localStorage.getItem(myTasksStatusFilterStorageKey);
    return storedFilter === "all" || storedFilter === "todo" || storedFilter === "in_progress" || storedFilter === "for_review" || storedFilter === "done" ? storedFilter : "all";
  } catch {
    return "all";
  }
}

function writeStoredMyTasksStatusFilter(value: StatusFilter) {
  try {
    window.localStorage.setItem(myTasksStatusFilterStorageKey, value);
  } catch {
    // Ignore storage failures.
  }
}

function readStoredMyTasksShowDone(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const storedShowDone = window.localStorage.getItem(myTasksShowDoneStorageKey);
    return storedShowDone === "false" ? false : true;
  } catch {
    return true;
  }
}

function writeStoredMyTasksShowDone(value: boolean) {
  try {
    window.localStorage.setItem(myTasksShowDoneStorageKey, String(value));
  } catch {
    // Ignore storage failures.
  }
}

function isAssignedToUser(task: TeamyTask, userId: string) {
  return task.created_by.id === userId || task.assignees.some((assignee) => assignee.user.id === userId);
}

function isTaskCompleted(task: TeamyTask, userId?: string) {
  if (task.status === "done") return true;
  if (!task.is_private && task.personal_kind !== "ticket" && userId) {
    const assignee = task.assignees.find((a) => a.user.id === userId);
    if (assignee?.status === "ready_for_review" || task.status === "for_review") {
      return true;
    }
  }
  return false;
}

function sortMyTasks(tasks: TeamyTask[], userId?: string) {
  return [...tasks].sort((a, b) => {
    const isDoneA = isTaskCompleted(a, userId);
    const isDoneB = isTaskCompleted(b, userId);
    if (isDoneA && !isDoneB) {
      return 1;
    }
    if (!isDoneA && isDoneB) {
      return -1;
    }
    return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31") || parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at);
  });
}

function MyTasksPage() {
  const { project, user } = useProjectContext();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TeamyTask[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter>("group");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => readStoredMyTasksStatusFilter());
  const [showDone, setShowDone] = useState(() => readStoredMyTasksShowDone());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTaskIdRef = useRef<string | null>(null);
  const [taskViewersMap, setTaskViewersMap] = useState<Record<string, TaskViewer[]>>({});
  const taskSocketRef = useRef<WebSocket | null>(null);
  const [form, setForm] = useState<PersonalFormState>(initialPersonalForm);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  const [searchParams] = useSearchParams();
  const activeViewMode = searchParams.get("view");
  const isTicketsSection = activeViewMode === "tickets";
  const isArchived = project.archived_at !== null;
  const isPrivateView = !isTicketsSection && taskTypeFilter === "private";

  useScrollLock(isCreateOpen || selectedTaskId !== null);

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  function updateStatusFilter(nextFilter: StatusFilter) {
    setStatusFilter(nextFilter);
    writeStoredMyTasksStatusFilter(nextFilter);
  }

  function updateShowDone(nextShowDone: boolean) {
    setShowDone(nextShowDone);
    writeStoredMyTasksShowDone(nextShowDone);
  }

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((task) => {
      if (isTicketsSection) {
        if (task.personal_kind !== "ticket") return false;
      } else {
        if (task.personal_kind === "ticket") return false;
        if (taskTypeFilter === "group" && task.is_private) return false;
        if (taskTypeFilter === "private" && !task.is_private) return false;
      }

      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (!showDone && task.status === "done") return false;

      return true;
    });

    return sortMyTasks(list, user.id);
  }, [tasks, isTicketsSection, taskTypeFilter, statusFilter, showDone, user.id]);

  const stats = useMemo(() => {
    const groupTasks = tasks.filter((task) => !task.is_private && task.personal_kind !== "ticket");
    const total = groupTasks.length;
    const assigned = groupTasks.filter((task) => task.status !== "done" && task.assignees.find((a) => a.user.id === user.id)?.status === "todo").length;
    const working = groupTasks.filter((task) => task.status !== "done" && task.assignees.find((a) => a.user.id === user.id)?.status === "in_progress").length;
    const ready = groupTasks.filter((task) => task.status !== "done" && task.assignees.find((a) => a.user.id === user.id)?.status === "ready_for_review").length;
    const done = groupTasks.filter((task) => task.status === "done").length;
    return { total, assigned, working, ready, done };
  }, [tasks, user.id]);

  const privateStats = useMemo(() => {
    const privateTasks = tasks.filter((task) => task.is_private && task.personal_kind !== "ticket");
    return {
      total: privateTasks.length,
      todo: privateTasks.filter((task) => task.status === "todo").length,
      inProgress: privateTasks.filter((task) => task.status === "in_progress").length,
      done: privateTasks.filter((task) => task.status === "done").length,
    };
  }, [tasks]);

  const ticketStats = useMemo(() => {
    const ticketTasks = tasks.filter((t) => t.personal_kind === "ticket");
    return {
      total: ticketTasks.length,
      todo: ticketTasks.filter((t) => t.status === "todo").length,
      inProgress: ticketTasks.filter((t) => t.status === "in_progress").length,
      done: ticketTasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  const activeMetrics = useMemo(() => {
    if (isTicketsSection) {
      return [
        { label: "Total", value: ticketStats.total, icon: Ticket },
        { label: "Todo", value: ticketStats.todo, icon: Circle },
        { label: "Progress", value: ticketStats.inProgress, icon: Clock },
        { label: "Done", value: ticketStats.done, icon: CheckSquare },
      ];
    }
    if (isPrivateView) {
      return [
        { label: "Total", value: privateStats.total, icon: ClipboardList },
        { label: "Todo", value: privateStats.todo, icon: Circle },
        { label: "Progress", value: privateStats.inProgress, icon: Clock },
        { label: "Done", value: privateStats.done, icon: CheckSquare },
      ];
    }
    return [
      { label: "Total", value: stats.total, icon: ClipboardList },
      { label: "Assigned", value: stats.assigned, icon: Clock },
      { label: "Working", value: stats.working, icon: Clock },
      { label: "Ready", value: stats.ready, icon: CheckSquare },
      { label: "Done", value: stats.done, icon: CheckSquare },
    ];
  }, [isTicketsSection, isPrivateView, ticketStats, privateStats, stats]);

  useEffect(() => {
    let isMounted = true;
    const loadingTimer = window.setTimeout(() => {
      if (isMounted) {
        setIsLoading(true);
        setError("");
      }
    }, 0);

    Promise.all([listMyTasks(project.id), listProjectMembers(project.id)])
      .then(([nextTasks, nextMembers]) => {
        if (isMounted) {
          setTasks(nextTasks);
          setMembers(nextMembers);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(getToastErrorMessage(caughtError, "Could not load page data."));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, [project.id]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let isActive = true;

    void getTaskSocketTicket(project.id)
      .then((ticket) => {
        if (!isActive) {
          return;
        }
        socket = new WebSocket(getTaskSocketUrl(project.id, ticket));
        taskSocketRef.current = socket;

        socket.addEventListener("open", () => {
          if (selectedTaskIdRef.current) {
            socket?.send(JSON.stringify({ action: "view_task", task_id: selectedTaskIdRef.current }));
          }
        });

        socket.addEventListener("message", (event) => {
          const data = JSON.parse(event.data as string) as TaskSocketEvent | { event: "task.presence"; task_id: string; viewers: TaskViewer[] };
          if (data.event === "task.presence") {
            setTaskViewersMap((prev) => ({
              ...prev,
              [data.task_id]: data.viewers,
            }));
            return;
          }
          if (data.task?.project_id !== project.id) {
            return;
          }
          if (data.event === "task.deleted" || !isAssignedToUser(data.task, user.id)) {
            setTasks((currentTasks) => currentTasks.filter((task) => task.id !== data.task.id));
          } else {
            setTasks((currentTasks) => upsertTask(currentTasks, data.task));
          }
        });
      })
      .catch(() => {
        // Fall back to REST polling if WebSocket fails.
      });

    return () => {
      isActive = false;
      taskSocketRef.current = null;
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        socket.close();
      }
    };
  }, [project.id, user.id]);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
    const socket = taskSocketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      if (selectedTaskId) {
        socket.send(JSON.stringify({ action: "view_task", task_id: selectedTaskId }));
      } else {
        socket.send(JSON.stringify({ action: "leave_task" }));
      }
    }
  }, [selectedTaskId]);

  const handleSocketActivity = useCallback((activity: string | null) => {
    const socket = taskSocketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "activity", status: activity }));
    }
  }, []);

  async function handleStatusUpdate(task: TeamyTask, status: MyTaskStatusUpdate) {
    setPendingAction(`${task.id}:${status}`);
    setError("");
    try {
      const nextTask = await updateMyTaskStatus(project.id, task.id, status);
      setTasks((currentTasks) => upsertTask(currentTasks, nextTask));
      toast.success(status === "done" ? "Marked done." : "Status updated.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not update the status.");
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction("");
    }
  }

  async function handleSubmitForReview(task: TeamyTask) {
    setPendingAction(`${task.id}:submit-review`);
    setError("");
    try {
      const nextTask = await submitTaskForReview(project.id, task.id);
      setTasks((currentTasks) => upsertTask(currentTasks, nextTask));
      toast.success("Task submitted for review.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not submit the task for review.");
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction("");
    }
  }

  async function handleCreatePersonalItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) {
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const validTicketItems = form.ticketItems.filter((item) => item.text.trim());
      const description =
        form.kind === "ticket" && validTicketItems.length > 0
          ? serializeTicketItems(validTicketItems)
          : form.description || undefined;

      const task = await createTask(project.id, {
        title: form.title,
        description,
        assignee_ids: [user.id, ...form.collaboratorIds],
        due_date: form.dueDate || undefined,
        initial_status: form.status,
        is_private: true,
        personal_kind: form.kind,
      });
      setTasks((currentTasks) => upsertTask(currentTasks, task));
      setForm(initialPersonalForm);
      setIsCreateOpen(false);
      toast.success(`${form.kind === "ticket" ? "Ticket" : "Task"} saved.`);
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not save your item.");
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <MyTaskHeader
        isTicketsSection={isTicketsSection}
        metrics={activeMetrics}
      />

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isTicketsSection ? (
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
            {[
              { value: "group" as const, label: "Assigned to Me", icon: Users },
              { value: "private" as const, label: "Private Work", icon: LockKeyhole },
            ].map(({ value, label, icon: Icon }) => (
              <button
                className={`${labelFont} inline-flex items-center gap-2 rounded-md px-3 py-2 uppercase transition-all ${
                  taskTypeFilter === value ? "bg-[#a855f7]/25 text-white font-bold border border-[#a855f7]/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
                }`}
                key={value}
                onClick={() => {
                  setTaskTypeFilter(value);
                  if (value === "private" && statusFilter === "for_review") {
                    updateStatusFilter("all");
                  }
                }}
                type="button"
              >
                <Icon aria-hidden="true" size={13} />
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        <StatusFilterDropdown
          value={statusFilter}
          onChange={(v) => updateStatusFilter(v as StatusFilter)}
          options={[
            { id: "all", label: "All statuses" },
            { id: "todo", label: "Todo" },
            { id: "in_progress", label: "Progress" },
            ...(!isPrivateView ? [{ id: "for_review", label: "Review" }] : []),
            { id: "done", label: "Done" },
          ]}
          showDone={showDone}
          onToggleDone={() => {
            const nextShowDone = !showDone;
            updateShowDone(nextShowDone);
            if (!nextShowDone && statusFilter === "done") {
              updateStatusFilter("all");
            }
          }}
        />
      </div>

      {/* Floating Action Button (FAB) in lower right corner */}
      {typeof document !== "undefined"
        ? createPortal(
            <button
              className={`${labelFont} teamy-fab fixed bottom-8 right-8 z-40 flex cursor-pointer items-center gap-2.5 rounded-full px-5.5 py-3.5 text-xs font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={isArchived}
              onClick={() => {
                setForm({
                  ...initialPersonalForm,
                  kind: isTicketsSection ? "ticket" : "task",
                  ticketItems: isTicketsSection ? [makeTicketItem()] : [],
                });
                setIsCreateOpen(true);
              }}
              title={isArchived ? "Archived workspaces are read-only" : isTicketsSection ? "New Ticket" : "New Private Task"}
              type="button"
            >
              <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
              <span>{isTicketsSection ? "New Ticket" : "New Private Task"}</span>
            </button>,
            document.body,
          )
        : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((item) => (
            <Skeleton className="h-32 w-full" key={item} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`${panelClass} px-6 py-12 text-center text-[#8e9192]`}>No tasks match this view.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTasks.map((task) => (
            <MyTaskRow
              isArchived={isArchived}
              key={task.id}
              onSelect={() => setSelectedTaskId(task.id)}
              onStatusUpdate={handleStatusUpdate}
              onSubmitForReview={handleSubmitForReview}
              pendingAction={pendingAction}
              task={task}
              userId={user.id}
            />
          ))}
        </div>
      )}

      <CreatePersonalTaskModal
        form={form}
        isCollaboratorModalOpen={isCollaboratorModalOpen}
        isCreating={isCreating}
        isOpen={isCreateOpen}
        members={members}
        onChangeForm={setForm}
        onClose={() => setIsCreateOpen(false)}
        onCloseCollaboratorModal={() => setIsCollaboratorModalOpen(false)}
        onOpenCollaboratorModal={() => setIsCollaboratorModalOpen(true)}
        onSubmit={handleCreatePersonalItem}
        userId={user.id}
      />

      <AnimatePresence>
        {selectedTask ? (
          <MyTaskDetailModal
            isArchived={isArchived}
            key={selectedTask.id}
            members={members}
            onActivityChange={handleSocketActivity}
            onClose={() => setSelectedTaskId(null)}
            onNavigateToFile={(fileId) => navigate(`/projects/${project.slug}/file-hub/${fileId}`)}
            onOpenTaskBoard={(targetTaskId) => navigate(`/projects/${project.slug}/task-board?highlight=${targetTaskId || selectedTask.id}`)}
            onStatusUpdate={handleStatusUpdate}
            onSubmitForReview={handleSubmitForReview}
            onTaskUpdate={(nextTask) => setTasks((currentTasks) => upsertTask(currentTasks, nextTask))}
            onTaskDelete={(deletedId) => setTasks((currentTasks) => currentTasks.filter((t) => t.id !== deletedId))}
            pendingAction={pendingAction}
            task={selectedTask}
            userId={user.id}
            viewers={selectedTaskId ? taskViewersMap[selectedTaskId] : undefined}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default MyTasksPage;
