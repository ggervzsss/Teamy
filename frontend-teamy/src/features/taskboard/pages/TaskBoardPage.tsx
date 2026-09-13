import {
  Circle,
  Eye,
  Kanban,
  List,
  Loader2,
  PlayCircle,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { TaskViewer } from "@/shared/components/TaskViewerPresence";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { Skeleton } from "@/shared/components/Skeleton";
import { StatusFilterDropdown } from "@/shared/components/StatusFilterDropdown";
import { RichTextEditor } from "@/shared/components/RichText";
import { parseApiDateTime } from "@/shared/dateTime";
import {
  createTask,
  deleteTask,
  getTaskSocketTicket,
  getTaskSocketUrl,
  linkTaskFile,
  listProjectMembers,
  listTasks,
  reviewTask,
  submitTaskForReview,
  updateMyTaskStatus,
  updateTask,
} from "@/features/taskboard/api";
import type { ProjectMember, TaskLinkedFileCreatePayload, TaskSocketEvent, TaskStatus, TaskUpdatePayload, TeamyTask } from "@/features/taskboard/api";
import { useScrollLock } from "@/shared/useScrollLock";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { AssigneeSelectorField, MemberPickerModal } from "@/shared/components";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import { TaskCard } from "../components/TaskCard";
import { TaskTableSection } from "../components/TaskBoardTableView";
import { TaskDetailModal } from "../components/TaskDetailModal";

const statusColumns: Array<{ id: TaskStatus; label: string }> = [
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "Progress" },
  { id: "for_review", label: "Review" },
];

const tableStatusOrder: Array<{ id: TaskStatus; label: string }> = [...statusColumns, { id: "done", label: "Done" }];

type TaskBoardViewMode = "kanban" | "table";
type TaskBoardTableMode = "combined" | "separated";
type TaskFilterValue<T extends string> = "all" | T;

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-colors placeholder:text-[#8e9192] focus:border-white";
const taskBoardViewStorageKey = "teamy:task-board:view-mode";
const taskBoardStatusFilterStorageKey = "teamy:task-board:status-filter";
const taskBoardShowDoneStorageKey = "teamy:task-board:show-done";

const statusToneClasses: Record<TaskStatus, string> = {
  todo: "border-[#8e9192]/30 bg-[#8e9192]/10 text-[#d7d9da]",
  in_progress: "border-[#8fd3ff]/35 bg-[#8fd3ff]/12 text-[#bfe6ff]",
  for_review: "border-[#d8c5ff]/35 bg-[#d8c5ff]/12 text-[#e8dcff]",
  done: "border-[#9be7b0]/35 bg-[#9be7b0]/12 text-[#c7f5d0]",
};

type TaskFormState = {
  title: string;
  description: string;
  assigneeIds: string[];
  startDate: string;
  dueDate: string;
  initialStatus: Extract<TaskStatus, "todo" | "in_progress" | "done">;
  linkedFileMode: "none" | "doc" | "link";
  linkedFileTitle: string;
  linkedFileUrl: string;
};

const initialTaskForm: TaskFormState = {
  title: "",
  description: "",
  assigneeIds: [],
  startDate: "",
  dueDate: "",
  initialStatus: "todo",
  linkedFileMode: "none",
  linkedFileTitle: "",
  linkedFileUrl: "",
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

function readStoredViewMode(): TaskBoardViewMode {
  if (typeof window === "undefined") {
    return "kanban";
  }

  try {
    const storedMode = window.localStorage.getItem(taskBoardViewStorageKey);
    return storedMode === "kanban" || storedMode === "table" ? storedMode : "kanban";
  } catch {
    return "kanban";
  }
}

function readStoredTaskBoardStatusFilter(): TaskFilterValue<TaskStatus> {
  if (typeof window === "undefined") {
    return "all";
  }

  try {
    const storedFilter = window.localStorage.getItem(taskBoardStatusFilterStorageKey);
    return storedFilter === "all" || tableStatusOrder.some((status) => status.id === storedFilter) ? (storedFilter as TaskFilterValue<TaskStatus>) : "all";
  } catch {
    return "all";
  }
}

function readStoredTaskBoardShowDone(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const storedShowDone = window.localStorage.getItem(taskBoardShowDoneStorageKey);
    return storedShowDone === "false" ? false : true;
  } catch {
    return true;
  }
}

function writeStoredStatusFilter(storageKey: string, value: string) {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Ignore storage failures.
  }
}

function TaskBoardPage() {
  const { project, user } = useProjectContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<TeamyTask[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePickerOpen, setIsCreatePickerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTaskIdRef = useRef<string | null>(null);
  const [taskViewersMap, setTaskViewersMap] = useState<Record<string, TaskViewer[]>>({});
  const taskSocketRef = useRef<WebSocket | null>(null);
  const [viewMode, setViewMode] = useState<TaskBoardViewMode>(() => readStoredViewMode());
  const [tableMode, setTableMode] = useState<TaskBoardTableMode>("combined");
  const [statusFilter, setStatusFilter] = useState<TaskFilterValue<TaskStatus>>(() => readStoredTaskBoardStatusFilter());
  const [showDone, setShowDone] = useState(() => readStoredTaskBoardShowDone());
  const [selectedTableTaskIds, setSelectedTableTaskIds] = useState<Set<string>>(() => new Set());
  const [collapsedTables, setCollapsedTables] = useState<Record<TaskStatus, boolean>>({ todo: false, in_progress: false, for_review: false, done: false });
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
  const [form, setForm] = useState<TaskFormState>(initialTaskForm);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const isLeader = project.role === "leader" || project.role === "co_leader";
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const [searchParams] = useSearchParams();
  const highlightTaskIdParam = searchParams.get("highlight") || searchParams.get("task");

  const targetTask = useMemo(() => tasks.find((t) => t.id === highlightTaskIdParam) || null, [tasks, highlightTaskIdParam]);
  const highlightedTaskId = targetTask?.id ?? null;

  useEffect(() => {
    if (!targetTask || isLoading) return;

    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`task-item-${targetTask.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [targetTask, isLoading]);

  const isFormDirty = Boolean(
    form.title.trim() ||
      form.description.trim() ||
      form.assigneeIds.length > 0 ||
      form.linkedFileTitle.trim() ||
      form.linkedFileUrl.trim()
  );

  function handleAttemptCloseCreateModal() {
    if (isFormDirty) {
      setShowUnsavedConfirm(true);
    } else {
      handleForceCloseCreateModal();
    }
  }

  function handleForceCloseCreateModal() {
    setShowUnsavedConfirm(false);
    setIsModalOpen(false);
    setForm(initialTaskForm);
  }

  useScrollLock(isModalOpen || selectedTaskId !== null);

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.id === highlightTaskIdParam ||
          ((statusFilter === "all" || task.status === statusFilter) && (showDone || task.status !== "done")),
      ),
    [statusFilter, showDone, tasks, highlightTaskIdParam],
  );
  const selectedTableTasks = useMemo(() => tasks.filter((task) => selectedTableTaskIds.has(task.id)), [selectedTableTaskIds, tasks]);
  const selectedTableTaskCount = selectedTableTaskIds.size;
  const isBatchDeleting = pendingAction === "batch-delete";

  const allTasksByStatus = useMemo(
    () =>
      tableStatusOrder.reduce<Record<TaskStatus, TeamyTask[]>>(
        (accumulator, column) => ({
          ...accumulator,
          [column.id]: tasks.filter((task) => task.status === column.id),
        }),
        { todo: [], in_progress: [], for_review: [], done: [] },
      ),
    [tasks],
  );

  const visibleTableStatuses = useMemo(
    () =>
      tableStatusOrder.filter(
        (column) =>
          column.id === targetTask?.status ||
          ((statusFilter === "all" || column.id === statusFilter) && (showDone || column.id !== "done")),
      ),
    [statusFilter, showDone, targetTask],
  );

  function updateViewMode(mode: TaskBoardViewMode) {
    setViewMode(mode);
    writeStoredStatusFilter(taskBoardViewStorageKey, mode);
  }

  function updateStatusFilter(filter: TaskFilterValue<TaskStatus>) {
    setStatusFilter(filter);
    writeStoredStatusFilter(taskBoardStatusFilterStorageKey, filter);
  }

  function updateShowDone(nextShowDone: boolean) {
    setShowDone(nextShowDone);
    writeStoredStatusFilter(taskBoardShowDoneStorageKey, String(nextShowDone));
  }

  function canDeleteTask(task: TeamyTask) {
    return isLeader || task.created_by.id === user.id;
  }

  function toggleAssignee(memberId: string) {
    setForm((currentForm) => ({
      ...currentForm,
      assigneeIds: currentForm.assigneeIds.includes(memberId) ? currentForm.assigneeIds.filter((assigneeId) => assigneeId !== memberId) : [...currentForm.assigneeIds, memberId],
    }));
  }

  function toggleTableTaskSelection(taskId: string) {
    setSelectedTableTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function setTableTaskSelection(taskIds: string[], selected: boolean) {
    setSelectedTableTaskIds((current) => {
      const next = new Set(current);
      taskIds.forEach((taskId) => {
        if (selected) {
          next.add(taskId);
        } else {
          next.delete(taskId);
        }
      });
      return next;
    });
  }

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedTableTaskIds((current) => {
        const validTaskIds = new Set(tasks.filter((t) => isLeader || t.created_by.id === user.id).map((t) => t.id));
        const next = new Set<string>();
        current.forEach((taskId) => {
          if (validTaskIds.has(taskId)) {
            next.add(taskId);
          }
        });
        return next;
      });
    });
  }, [tasks, isLeader, user.id]);

  useEffect(() => {
    let isActive = true;
    let socket: WebSocket | null = null;

    queueMicrotask(() => {
      if (isActive) {
        setIsLoading(true);
        setError("");
      }
    });

    Promise.all([listTasks(project.id), listProjectMembers(project.id)])
      .then(([fetchedTasks, fetchedMembers]) => {
        if (isActive) {
          setTasks(fetchedTasks);
          setMembers(fetchedMembers);
        }
      })
      .catch((caughtError) => {
        if (isActive) {
          setError(getToastErrorMessage(caughtError, "Could not load task board data."));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

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
          } else if (
            data.event === "task.created" ||
            data.event === "task.updated" ||
            data.event === "task.submitted" ||
            data.event === "task.reviewed"
          ) {
            setTasks((currentTasks) => upsertTask(currentTasks, data.task));
          } else if (data.event === "task.deleted") {
            setTasks((currentTasks) => currentTasks.filter((task) => task.id !== data.task.id));
            setSelectedTaskId((currentSelectedId) => (currentSelectedId === data.task.id ? null : currentSelectedId));
          }
        });
      })
      .catch(() => {
        // Socket errors fall back gracefully to REST state.
      });

    return () => {
      isActive = false;
      taskSocketRef.current = null;
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        socket.close();
      }
    };
  }, [project.id]);

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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const taskIdParam = searchParams.get("task");
    if (taskIdParam && tasks.some((task) => task.id === taskIdParam)) {
      queueMicrotask(() => {
        setSelectedTaskId(taskIdParam);
      });
    }
  }, [location.search, tasks]);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.assigneeIds.length === 0) {
      toast.error("Choose at least one assignee.");
      return;
    }

    if (form.linkedFileMode === "link" && !form.linkedFileUrl.trim()) {
      toast.error("Enter a resource link URL.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await createTask(project.id, {
        title: form.title,
        description: form.description || undefined,
        assignee_ids: form.assigneeIds,
        start_date: form.startDate || undefined,
        due_date: form.dueDate || undefined,
        initial_status: form.initialStatus,
        is_record_only: form.initialStatus === "done",
      });

      if (form.linkedFileMode !== "none") {
        await linkTaskFile(
          project.id,
          created.id,
          form.linkedFileMode === "doc"
            ? { mode: "doc", title: form.linkedFileTitle || `${created.title} Doc` }
            : { mode: "link", title: form.linkedFileTitle || created.title, url: form.linkedFileUrl },
        );
      }

      setForm(initialTaskForm);
      setIsModalOpen(false);
      toast.success(form.initialStatus === "done" ? "Task record saved." : "Task created.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not create task."));
    } finally {
      setIsCreating(false);
    }
  }

  async function updateStatus(taskId: string, nextStatus: "in_progress" | "ready_for_review") {
    setPendingAction(`${taskId}:${nextStatus}`);
    try {
      const updated = await updateMyTaskStatus(project.id, taskId, nextStatus);
      setTasks((currentTasks) => upsertTask(currentTasks, updated));
      toast.success(nextStatus === "ready_for_review" ? "Task submitted for review." : "Task moved to Progress.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not update status."));
    } finally {
      setPendingAction("");
    }
  }

  async function handleSubmitForReview(taskId: string) {
    setPendingAction(`${taskId}:submit-review`);
    try {
      const updated = await submitTaskForReview(project.id, taskId);
      setTasks((currentTasks) => upsertTask(currentTasks, updated));
      toast.success("Task submitted for leader review.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not submit for review."));
    } finally {
      setPendingAction("");
    }
  }

  async function handleReview(taskId: string, action: "approve" | "request_changes", remarks?: string) {
    setPendingAction(`${taskId}:${action}`);
    try {
      const updated = await reviewTask(project.id, taskId, action, remarks);
      setTasks((currentTasks) => upsertTask(currentTasks, updated));
      toast.success(action === "approve" ? "Task approved and completed." : "Changes requested.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not submit review decision."));
    } finally {
      setPendingAction("");
    }
  }

  async function handleUpdateTask(taskId: string, payload: TaskUpdatePayload) {
    setPendingAction(`${taskId}:edit`);
    try {
      const updated = await updateTask(project.id, taskId, payload);
      setTasks((currentTasks) => upsertTask(currentTasks, updated));
      toast.success("Task updated.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not update task."));
      throw caughtError;
    } finally {
      setPendingAction("");
    }
  }

  async function handleLinkTaskFile(taskId: string, payload: TaskLinkedFileCreatePayload) {
    setPendingAction(`${taskId}:link-file`);
    try {
      const updated = await linkTaskFile(project.id, taskId, payload);
      setTasks((currentTasks) => upsertTask(currentTasks, updated));
      toast.success(payload.mode === "doc" ? "Teamy Doc created and linked." : "Link added.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not link resource."));
      throw caughtError;
    } finally {
      setPendingAction("");
    }
  }

  async function handleDeleteTask(taskId: string) {
    setPendingAction(`${taskId}:delete`);
    try {
      await deleteTask(project.id, taskId);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      toast.success("Task deleted.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not delete task."));
    } finally {
      setPendingAction("");
    }
  }

  async function handleDeleteSelectedTasks() {
    if (selectedTableTaskCount === 0 || isBatchDeleting) {
      return;
    }

    const tasksToDelete = selectedTableTasks.filter(canDeleteTask);
    if (tasksToDelete.length === 0) {
      toast.error("You do not have permission to delete the selected tasks.");
      return;
    }

    setPendingAction("batch-delete");
    try {
      const results = await Promise.allSettled(tasksToDelete.map((task) => deleteTask(project.id, task.id)));
      const deletedTaskIds = new Set<string>();
      let failedCount = 0;

      results.forEach((result, index) => {
        const task = tasksToDelete[index];
        if (result.status === "fulfilled") {
          deletedTaskIds.add(task.id);
        } else {
          failedCount += 1;
        }
      });

      if (deletedTaskIds.size > 0) {
        setTasks((currentTasks) => currentTasks.filter((task) => !deletedTaskIds.has(task.id)));
        setSelectedTableTaskIds((current) => {
          const next = new Set(current);
          deletedTaskIds.forEach((taskId) => next.delete(taskId));
          return next;
        });
        if (selectedTaskId && deletedTaskIds.has(selectedTaskId)) {
          setSelectedTaskId(null);
        }
      }

      if (failedCount === 0) {
        toast.success(`Deleted ${deletedTaskIds.size} task${deletedTaskIds.size === 1 ? "" : "s"}.`);
      } else if (deletedTaskIds.size > 0) {
        toast.error(`Deleted ${deletedTaskIds.size} task${deletedTaskIds.size === 1 ? "" : "s"}, but ${failedCount} failed.`);
      } else {
        toast.error("Could not delete selected tasks.");
      }
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Task Board</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">Manage, track, and assign project work.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              className={`${labelFont} inline-flex items-center gap-2 rounded-md px-3 py-2 uppercase transition-all ${viewMode === "table" ? "bg-[#a855f7]/25 text-white font-bold border border-[#a855f7]/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"}`}
              onClick={() => updateViewMode("table")}
              type="button"
            >
              <List aria-hidden="true" size={16} />
              Table
            </button>
            <button
              className={`${labelFont} inline-flex items-center gap-2 rounded-md px-3 py-2 uppercase transition-all ${viewMode === "kanban" ? "bg-[#a855f7]/25 text-white font-bold border border-[#a855f7]/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]" : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"}`}
              onClick={() => updateViewMode("kanban")}
              type="button"
            >
              <Kanban aria-hidden="true" size={16} />
              Kanban
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Button (FAB) in lower right corner */}
      {typeof document !== "undefined"
        ? createPortal(
            <button
              className={`${labelFont} teamy-fab fixed bottom-8 right-8 z-40 flex cursor-pointer items-center gap-2.5 rounded-full px-5.5 py-3.5 text-xs font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => setIsModalOpen(true)}
              title="New Task"
              type="button"
            >
              <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
              <span>New Task</span>
            </button>,
            document.body,
          )
        : null}

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      {isLoading ? (
        viewMode === "kanban" ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <section className="flex min-h-96 flex-col rounded-xl border border-white/8 bg-white/2 p-6 backdrop-blur-2xl" key={i}>
                  <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                </section>
              ))}
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-10 w-48" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/2">
              <Skeleton className="h-12 w-full rounded-none border-b border-white/10" />
              <Skeleton className="h-16 w-full rounded-none border-b border-white/10" />
              <Skeleton className="h-16 w-full rounded-none border-b border-white/10" />
              <Skeleton className="h-16 w-full rounded-none border-b border-white/10" />
              <Skeleton className="h-16 w-full rounded-none" />
            </div>
          </div>
        )
      ) : viewMode === "kanban" ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
            {statusColumns.map((column) => {
              const isTodo = column.id === "todo";
              const isInProgress = column.id === "in_progress";
              const isForReview = column.id === "for_review";

              let accentLineClass = "bg-linear-to-r from-transparent via-white/15 to-transparent";
              if (isInProgress) accentLineClass = "bg-linear-to-r from-transparent via-[#8fd3ff]/70 to-transparent";
              if (isForReview) accentLineClass = "bg-linear-to-r from-transparent via-[#a855f7]/70 to-transparent";
              if (isTodo) accentLineClass = "bg-linear-to-r from-transparent via-[#8e9192]/40 to-transparent";

              return (
                <section className="gpu-panel relative flex min-h-96 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/4 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl" key={column.id}>
                  <div className={`absolute inset-x-0 top-0 h-1 ${accentLineClass}`} />

                  <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <h3 className="m-0 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
                      {column.id === "todo" && <Circle size={20} className="text-[#8e9192]" />}
                      {column.id === "in_progress" && <PlayCircle size={20} className="text-[#8fd3ff]" />}
                      {column.id === "for_review" && <Eye size={20} className="text-[#d8c5ff]" />}
                      {column.label}
                    </h3>
                    <span className={`${labelFont} rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${statusToneClasses[column.id]}`}>{allTasksByStatus[column.id].length}</span>
                  </div>

                  <div className="gpu-scroll custom-scrollbar flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                    {allTasksByStatus[column.id].length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-[#8e9192]">No tasks in {column.label.toLowerCase()}</div>
                    ) : null}
                    {allTasksByStatus[column.id].map((task) => (
                      <TaskCard key={task.id} onSelectTask={setSelectedTaskId} task={task} isHighlighted={highlightedTaskId === task.id} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          {(showDone || targetTask?.status === "done") && <TaskTableSection onSelectTask={setSelectedTaskId} tasks={allTasksByStatus.done} title="Done Records" highlightedTaskId={highlightedTaskId} />}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-1">
                <button
                  className={`${labelFont} rounded-md px-3 py-2 uppercase ${tableMode === "combined" ? "bg-white/10 text-white" : "text-[#8e9192] hover:text-white"}`}
                  onClick={() => setTableMode("combined")}
                  type="button"
                >
                  Combined
                </button>
                <button
                  className={`${labelFont} inline-flex items-center gap-2 rounded-md px-3 py-2 uppercase ${tableMode === "separated" ? "bg-white/10 text-white" : "text-[#8e9192] hover:text-white"}`}
                  onClick={() => setTableMode("separated")}
                  type="button"
                >
                  By Status
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {selectedTableTaskCount > 0 ? (
                <button
                  className={`${labelFont} inline-flex items-center gap-2 rounded-md border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-3 py-2 text-[#ffb4ab] uppercase hover:bg-[#ffb4ab]/20 disabled:opacity-60`}
                  disabled={isBatchDeleting}
                  onClick={() => void handleDeleteSelectedTasks()}
                  type="button"
                  title="Delete selected tasks"
                >
                  {isBatchDeleting ? <Loader2 aria-hidden="true" className="animate-spin" size={14} /> : <Trash2 aria-hidden="true" size={14} />}
                  Delete Selected ({selectedTableTaskCount})
                </button>
              ) : null}
              <StatusFilterDropdown
                value={statusFilter}
                onChange={(v) => updateStatusFilter(v as TaskFilterValue<TaskStatus>)}
                options={[{ id: "all", label: "All statuses" }, ...tableStatusOrder.map((s) => ({ id: s.id, label: s.label }))]}
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
          </div>
          {tableMode === "combined" ? (
            <TaskTableSection
              canSelectTask={canDeleteTask}
              highlightedTaskId={highlightedTaskId}
              onSelectTask={setSelectedTaskId}
              onSetSelectedTasks={setTableTaskSelection}
              onToggleSelectedTask={toggleTableTaskSelection}
              selectedTaskIds={selectedTableTaskIds}
              tasks={filteredTasks}
            />
          ) : (
            visibleTableStatuses.map((status) => (
              <TaskTableSection
                canSelectTask={canDeleteTask}
                collapsed={collapsedTables[status.id] && targetTask?.status !== status.id}
                highlightedTaskId={highlightedTaskId}
                key={status.id}
                onSelectTask={setSelectedTaskId}
                onSetSelectedTasks={setTableTaskSelection}
                onToggleCollapse={() => setCollapsedTables((current) => ({ ...current, [status.id]: !current[status.id] }))}
                onToggleSelectedTask={toggleTableTaskSelection}
                selectedTaskIds={selectedTableTaskIds}
                tasks={allTasksByStatus[status.id]}
                title={status.label}
              />
            ))
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {isModalOpen ? (
          <AnimatedModal className="z-70" contentClassName="w-full max-w-2xl" onBackdropClick={handleAttemptCloseCreateModal}>
            <form className={`${panelClass} flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden`} onSubmit={handleCreateTask}>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
                <div>
                  <h2 className="m-0 text-2xl font-bold text-white">New Task</h2>
                  <p className="m-0 mt-1 text-sm text-[#8e9192]">Assign work to one or more project members.</p>
                </div>
                <button
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
                  onClick={handleAttemptCloseCreateModal}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>

              <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
                <label className="flex flex-col gap-2">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
                  <input className={inputClass} maxLength={200} onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={form.title} />
                </label>

                <div className="flex flex-col gap-2">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Description</span>
                  <RichTextEditor
                    onChange={(description) => setForm((currentForm) => ({ ...currentForm, description }))}
                    placeholder="Add details, paste formatted notes, or include a table..."
                    value={form.description}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="flex flex-col gap-2">
                    <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start Date</span>
                    <input className={inputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))} type="date" value={form.startDate} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Due Date</span>
                    <input className={inputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))} type="date" value={form.dueDate} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start In</span>
                    <select
                      className={inputClass}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, initialStatus: event.target.value as TaskFormState["initialStatus"] }))}
                      value={form.initialStatus}
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">Progress</option>
                      {isLeader ? <option value="done">Done</option> : null}
                    </select>
                  </label>
                </div>

                <AssigneeSelectorField
                  label="Assignees"
                  members={members}
                  onOpenPicker={() => setIsCreatePickerOpen(true)}
                  onToggleRemove={(memberId) => toggleAssignee(memberId)}
                  selectedIds={form.assigneeIds}
                  subtext="Added members will be responsible for completing this task."
                />

                <MemberPickerModal
                  isOpen={isCreatePickerOpen}
                  members={members}
                  onChange={(ids) => setForm((current) => ({ ...current, assigneeIds: ids }))}
                  onClose={() => setIsCreatePickerOpen(false)}
                  selectedIds={form.assigneeIds}
                  title="Add Assignees"
                />

                <fieldset className="m-0 flex flex-col gap-3 border-0 border-t border-white/10 p-0 pt-5">
                  <legend className={`${labelFont} mb-1 text-[#c4c7c8] uppercase`}>Linked File</legend>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {[
                      ["none", "None"],
                      ["doc", "Teamy Doc"],
                      ["link", "External Link"],
                    ].map(([mode, label]) => (
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${form.linkedFileMode === mode ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/3 text-[#c4c7c8] hover:bg-white/6"}`}
                        key={mode}
                      >
                        <input
                          checked={form.linkedFileMode === mode}
                          name="linked-file-mode"
                          onChange={() => setForm((currentForm) => ({ ...currentForm, linkedFileMode: mode as TaskFormState["linkedFileMode"] }))}
                          type="radio"
                        />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                  {form.linkedFileMode !== "none" ? (
                    <div className="mt-2 flex flex-col gap-3">
                      <input
                        className={inputClass}
                        maxLength={240}
                        onChange={(event) => setForm((currentForm) => ({ ...currentForm, linkedFileTitle: event.target.value }))}
                        placeholder={form.linkedFileMode === "doc" ? "Doc title..." : "Resource title..."}
                        value={form.linkedFileTitle}
                      />
                      {form.linkedFileMode === "link" ? (
                        <input
                          className={inputClass}
                          maxLength={2048}
                          onChange={(event) => setForm((currentForm) => ({ ...currentForm, linkedFileUrl: event.target.value }))}
                          placeholder="https://..."
                          required
                          type="url"
                          value={form.linkedFileUrl}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
                <button
                  className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
                  onClick={handleAttemptCloseCreateModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Send aria-hidden="true" size={16} />}
                  Create Task
                </button>
              </div>
            </form>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceCloseCreateModal}
      />

      <AnimatePresence>
        {selectedTask ? (
          <TaskDetailModal
            isLeader={isLeader}
            key={selectedTask.id}
            members={members}
            onLinkFile={handleLinkTaskFile}
            onNavigateToFile={(fileId) => {
              setSelectedTaskId(null);
              navigate(`/projects/${project.slug}/file-hub/${fileId}`);
            }}
            onClose={() => setSelectedTaskId(null)}
            onDeleteTask={handleDeleteTask}
            onReview={handleReview}
            onSubmitForReview={handleSubmitForReview}
            onStatusUpdate={updateStatus}
            onUpdateTask={handleUpdateTask}
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

export default TaskBoardPage;
