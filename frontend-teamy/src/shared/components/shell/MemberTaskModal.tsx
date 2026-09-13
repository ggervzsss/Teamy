import { CheckSquare, Clock, ListChecks, Loader2, X } from "lucide-react";
import type { TeamPresenceMember } from "@/features/teammanagement/api";
import type { AssigneeStatus, TaskStatus, TeamyTask } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { formatRelativeTime, toLocalDate } from "@/shared/dateTime";
import { getUserDisplayName, getUserSecondaryName } from "@/shared/userDisplay";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  for_review: "For review",
  done: "Done",
};

const assigneeStatusLabels: Record<AssigneeStatus, string> = {
  todo: "Assigned",
  in_progress: "Working",
  ready_for_review: "Ready",
};

const taskStatusToneClasses: Record<TaskStatus, string> = {
  todo: "border-[#8e9192]/40 bg-[#8e9192]/15 text-[#d7d9da]",
  in_progress: "border-[#8fd3ff]/40 bg-[#8fd3ff]/15 text-[#bfe6ff]",
  for_review: "border-[#d8c5ff]/40 bg-[#d8c5ff]/15 text-[#e8dcff]",
  done: "border-[#9be7b0]/40 bg-[#9be7b0]/15 text-[#c7f5d0]",
};

const assigneeStatusToneClasses: Record<AssigneeStatus, string> = {
  todo: "text-[#d7d9da]",
  in_progress: "text-[#bfe6ff]",
  ready_for_review: "text-[#c7f5d0]",
};

function formatTaskDate(date: string | null) {
  if (!date) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(date));
}

function getMemberTaskAssignee(task: TeamyTask, userId: string) {
  return task.assignees.find((assignee) => assignee.user.id === userId);
}

export function AvatarBubble({ member, size = "md", zIndex }: { member: TeamPresenceMember; size?: "sm" | "md"; zIndex?: number }) {
  const name = getUserDisplayName(member.user);
  const dimensionClass = size === "sm" ? "size-7 text-[8px]" : "size-8 text-[9px]";

  return (
    <UserAvatarImage
      className={`grid ${dimensionClass} shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#09090b] font-medium text-white`}
      style={{
        background: "linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.96) 36%), #2a2a2e",
        zIndex,
      }}
      title={member.is_online ? `${name} is online` : `${name} is offline`}
      user={member.user}
    >
      <span className={`absolute right-0 bottom-0 rounded-full border-2 border-[#09090b] ${member.is_online ? "bg-[#b9f6ca]" : "bg-[#5f6264]"} ${size === "sm" ? "size-2.5" : "size-3"}`} />
    </UserAvatarImage>
  );
}

export function MemberTaskStat({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-[#8e9192]">
        <span className={`${labelFont} uppercase`}>{label}</span>
        <Icon aria-hidden="true" size={16} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export function MemberTaskModal({
  error,
  isLoading,
  member,
  onClose,
  onOpenTaskBoard,
  tasks,
}: {
  error: string;
  isLoading: boolean;
  member: TeamPresenceMember;
  onClose: () => void;
  onOpenTaskBoard: (taskId?: string) => void;
  tasks: TeamyTask[];
}) {
  const memberName = getUserDisplayName(member.user);
  const memberSecondaryName = getUserSecondaryName(member.user);
  const groupTasks = tasks.filter((task) => !task.is_private);
  const doneTasks = groupTasks.filter((task) => task.status === "done");
  const assignedTasks = groupTasks.filter((task) => task.status !== "done" && getMemberTaskAssignee(task, member.user.id)?.status === "todo");
  const workingTasks = groupTasks.filter((task) => task.status !== "done" && getMemberTaskAssignee(task, member.user.id)?.status === "in_progress");
  const readyTasks = groupTasks.filter((task) => task.status !== "done" && getMemberTaskAssignee(task, member.user.id)?.status === "ready_for_review");

  function isMemberTaskCompleted(task: TeamyTask, userId: string) {
    if (task.status === "done") return true;
    const assignee = getMemberTaskAssignee(task, userId);
    return assignee?.status === "ready_for_review" || task.status === "for_review";
  }

  const sortedTasks = [...groupTasks].sort((a, b) => {
    const isDoneA = isMemberTaskCompleted(a, member.user.id);
    const isDoneB = isMemberTaskCompleted(b, member.user.id);
    if (isDoneA && !isDoneB) {
      return 1;
    }
    if (!isDoneA && isDoneB) {
      return -1;
    }
    return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
  });

  return (
    <AnimatedModal className="z-110" contentClassName="w-full max-w-3xl" onBackdropClick={onClose}>
      <article className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e10] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarBubble member={member} />
            <div className="min-w-0">
              <h2 className="m-0 truncate text-xl font-bold text-white">{memberName}</h2>
              <p className="m-0 mt-1 truncate text-sm text-[#8e9192]">{memberSecondaryName}</p>
            </div>
          </div>
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
            title="Close"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MemberTaskStat icon={CheckSquare} label="Total" value={groupTasks.length} />
            <MemberTaskStat icon={ListChecks} label="Assigned" value={assignedTasks.length} />
            <MemberTaskStat icon={Clock} label="Working" value={workingTasks.length} />
            <MemberTaskStat icon={CheckSquare} label="Ready" value={readyTasks.length} />
            <MemberTaskStat icon={CheckSquare} label="Done" value={doneTasks.length} />
          </div>

          {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/3 px-4 py-10 text-[#c4c7c8]">
              <Loader2 aria-hidden="true" className="animate-spin" size={18} />
              Loading tasks...
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/3 px-4 py-10 text-center text-[#8e9192]">No group tasks assigned to this member yet.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10">
              {sortedTasks.map((task) => {
                const assignee = getMemberTaskAssignee(task, member.user.id);
                return (
                  <button
                    className="group flex w-full cursor-pointer flex-col gap-3 border-0 border-b border-l-2 border-white/8 border-l-transparent bg-transparent p-4 text-left transition-all duration-200 last:border-b-0 hover:border-l-[#a855f7]/40 hover:bg-white/6 md:flex-row md:items-center md:justify-between"
                    key={task.id}
                    onClick={() => {
                      onClose();
                      onOpenTaskBoard(task.id);
                    }}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-semibold text-white transition-colors group-hover:text-[#d8b4fe]">{task.title}</span>
                        <span className={`${labelFont} rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${taskStatusToneClasses[task.status]}`}>{taskStatusLabels[task.status]}</span>
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#8e9192]">
                        <span>Due {formatTaskDate(task.due_date)}</span>
                        {assignee?.completed_at ? <span>Completed {formatRelativeTime(assignee.completed_at)}</span> : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-2">
                      {assignee ? <span className={`${labelFont} uppercase ${assigneeStatusToneClasses[assignee.status]}`}>{assigneeStatusLabels[assignee.status]}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </article>
    </AnimatedModal>
  );
}
