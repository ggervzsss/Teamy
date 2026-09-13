import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  Circle,
  ClipboardList,
  Loader2,
  LockKeyhole,
  PlayCircle,
  Send,
  Ticket,
  Users,
} from "lucide-react";
import type { MyTaskStatusUpdate, PersonalTaskKind, TaskStatus, TeamyTask } from "@/features/taskboard/api";
import { toLocalDate } from "@/shared/dateTime";
import { getRichTextPlainText } from "@/shared/richText";
import { getUserDisplayName } from "@/shared/userDisplay";
import { parseTicketItems } from "../utils/ticketHelpers";
import { StatusBadge } from "@/features/taskboard/components/TaskDetailModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "Progress",
  for_review: "Review",
  done: "Done",
};

const personalKindLabels: Record<PersonalTaskKind, string> = {
  task: "Task",
  ticket: "Ticket",
};

const personalKindIcons = {
  task: ClipboardList,
  ticket: Ticket,
};

function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(dueDate));
}

export function MyTaskStat({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: number }) {
  return (
    <div className={`${panelClass} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2 text-[#8e9192]">
        <span className={`${labelFont} uppercase`}>{label}</span>
        <Icon aria-hidden="true" size={16} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export function MyTaskRow({
  isArchived,
  onSelect,
  onStatusUpdate,
  onSubmitForReview,
  pendingAction,
  task,
  userId,
}: {
  isArchived: boolean;
  onSelect: () => void;
  onStatusUpdate: (task: TeamyTask, status: MyTaskStatusUpdate) => Promise<void>;
  onSubmitForReview: (task: TeamyTask) => Promise<void>;
  pendingAction: string;
  task: TeamyTask;
  userId: string;
}) {
  const currentAssignee = task.assignees.find((assignee) => assignee.user.id === userId);
  const allAssignedMembersReady = task.assignees.length > 0 && task.assignees.every((assignee) => assignee.status === "ready_for_review");
  const canUpdateShared = Boolean(currentAssignee) && !task.is_private && task.status !== "done" && task.status !== "for_review" && !isArchived;
  const canSubmitForReview = Boolean(currentAssignee) && !task.is_private && task.status === "in_progress" && allAssignedMembersReady && !isArchived;
  const canUpdatePrivate = task.is_private && !isArchived;
  const Icon = task.is_private ? personalKindIcons[task.personal_kind] : ClipboardList;

  const ticketItems = task.is_private && task.personal_kind === "ticket" ? parseTicketItems(task.description) : null;
  const ticketDone = ticketItems ? ticketItems.filter((i) => i.checked).length : 0;
  const ticketTotal = ticketItems ? ticketItems.length : 0;
  const ticketProgress = ticketTotal > 0 ? Math.round((ticketDone / ticketTotal) * 100) : 0;

  return (
    <article className={`${panelClass} group flex flex-col gap-4 p-5 transition-all duration-300 hover:border-[#a855f7]/40 hover:bg-white/6 hover:shadow-[0_12px_36px_rgba(168,85,247,0.12)] lg:flex-row lg:items-center lg:justify-between`}>
      <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={onSelect} type="button">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`${labelFont} inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#c4c7c8] uppercase transition-colors group-hover:border-white/20`}>
            <Icon aria-hidden="true" size={13} />
            {task.is_private ? personalKindLabels[task.personal_kind] : "Assigned"}
          </span>
          <StatusBadge status={task.status} />
        </div>
        <h2 className={`m-0 text-lg leading-snug font-bold text-white transition-colors group-hover:text-[#d8b4fe] ${task.status === "done" ? "text-[#8e9192] line-through decoration-white/20" : ""}`}>{task.title}</h2>
        {ticketItems ? (
          <div className="mt-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-[#8e9192]">
              <CheckSquare aria-hidden="true" className="text-[#a855f7]" size={14} />
              <span>
                {ticketDone} / {ticketTotal} done
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500 shadow-sm"
                style={{
                  width: `${ticketProgress}%`,
                  background: ticketProgress === 100 ? "linear-gradient(90deg, #9be7b0, #b9f6ca)" : "linear-gradient(90deg, #a855f7, #8fd3ff)",
                }}
              />
            </div>
          </div>
        ) : task.description ? (
          <p className="m-0 mt-2 line-clamp-2 text-sm leading-relaxed text-[#8e9192] group-hover:text-[#c4c7c8]">{getRichTextPlainText(task.description)}</p>
        ) : null}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8e9192]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Calendar aria-hidden="true" size={15} />
            {formatDueDate(task.due_date)}
          </span>
          {!task.is_private ? (
            <span className="font-medium">Assigned by {getUserDisplayName(task.created_by)}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <LockKeyhole aria-hidden="true" size={14} /> Private
              {task.assignees.length > 1 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8fd3ff] bg-[#8fd3ff]/10 px-2 py-0.5 rounded-full border border-[#8fd3ff]/30">
                  <Users size={12} />
                  +{task.assignees.length - 1} collaborator{task.assignees.length - 1 === 1 ? "" : "s"}
                </span>
              )}
            </span>
          )}
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {canUpdatePrivate && !ticketItems ? (
          <>
            {(["todo", "in_progress", "done"] as MyTaskStatusUpdate[]).map((status) => (
              <button
                className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  task.status === status ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-transparent text-[#c4c7c8] hover:bg-white/5 hover:text-white"
                }`}
                disabled={pendingAction === `${task.id}:${status}` || task.status === status}
                key={status}
                onClick={() => void onStatusUpdate(task, status)}
                type="button"
              >
                {pendingAction === `${task.id}:${status}` ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                ) : status === "done" ? (
                  <CheckCircle2 aria-hidden="true" size={15} />
                ) : status === "in_progress" ? (
                  <PlayCircle aria-hidden="true" size={15} />
                ) : (
                  <Circle aria-hidden="true" size={15} />
                )}
                {statusLabels[status as TaskStatus]}
              </button>
            ))}
          </>
        ) : null}

        {canUpdateShared ? (
          <>
            {currentAssignee?.status === "todo" ? (
              <button
                className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white uppercase hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={pendingAction === `${task.id}:in_progress`}
                onClick={() => void onStatusUpdate(task, "in_progress")}
                type="button"
              >
                {pendingAction === `${task.id}:in_progress` ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <PlayCircle aria-hidden="true" size={15} />}
                Start
              </button>
            ) : null}
            {currentAssignee?.status !== "ready_for_review" ? (
              <button
                className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-white px-3 py-2 text-[#09090b] uppercase hover:bg-[#c6c6c6] disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={pendingAction === `${task.id}:ready_for_review`}
                onClick={() => void onStatusUpdate(task, "ready_for_review")}
                type="button"
              >
                {pendingAction === `${task.id}:ready_for_review` ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <CheckCircle2 aria-hidden="true" size={15} />}
                Ready
              </button>
            ) : null}
          </>
        ) : null}

        {canSubmitForReview ? (
          <button
            className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#b9f6ca] px-3 py-2 text-[#003814] uppercase hover:bg-[#94d5a4] disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={pendingAction === `${task.id}:submit-review`}
            onClick={() => void onSubmitForReview(task)}
            type="button"
          >
            {pendingAction === `${task.id}:submit-review` ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <Send aria-hidden="true" size={15} />}
            Submit
          </button>
        ) : null}
      </div>
    </article>
  );
}
