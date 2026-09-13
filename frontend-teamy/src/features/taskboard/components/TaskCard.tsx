import { Calendar, FileText, Image as ImageIcon } from "lucide-react";
import type { TaskStatus, TeamyTask } from "@/features/taskboard/api";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getRichTextPlainText } from "@/shared/richText";
import { getUserDisplayName } from "@/shared/userDisplay";
import { toLocalDate } from "@/shared/dateTime";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

const statusToneClasses: Record<TaskStatus, string> = {
  todo: "border-[#8e9192]/40 bg-[#8e9192]/15 text-[#d7d9da]",
  in_progress: "border-[#8fd3ff]/40 bg-[#8fd3ff]/15 text-[#bfe6ff]",
  for_review: "border-[#d8c5ff]/40 bg-[#d8c5ff]/15 text-[#e8dcff]",
  done: "border-[#9be7b0]/40 bg-[#9be7b0]/15 text-[#c7f5d0]",
};

function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(dueDate));
}

export function TaskCard({
  isHighlighted = false,
  onSelectTask,
  task,
}: {
  isHighlighted?: boolean;
  onSelectTask: (taskId: string) => void;
  task: TeamyTask;
}) {
  const isDone = task.status === "done";
  const isInProgress = task.status === "in_progress";

  const descriptionPreview = getRichTextPlainText(task.description ?? "");

  return (
    <button
      id={`task-item-${task.id}`}
      className={`gpu-panel group relative flex min-h-44 w-full flex-col justify-between overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 active:scale-[0.99] ${
        isHighlighted
          ? "border-[#a855f7] ring-2 ring-[#a855f7] shadow-[0_0_30px_rgba(168,85,247,0.8)] bg-[#a855f7]/15 animate-pulse"
          : isDone
            ? "border-white/5 bg-[#0e0e10]/40 opacity-70 hover:border-white/25 hover:opacity-100"
            : isInProgress
              ? "border-[#8fd3ff]/30 bg-[#12161f]/60 hover:border-[#8fd3ff]/60 hover:shadow-[0_8px_30px_rgba(143,211,255,0.12)]"
              : "border-white/10 bg-[#0e0e10]/95 hover:border-[#a855f7]/40 hover:bg-[#121215] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      }`}
      onClick={() => onSelectTask(task.id)}
      type="button"
    >
      {isInProgress ? <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#8fd3ff]/80" /> : null}

      <div className={`mb-3 flex w-full items-center justify-between gap-2 ${isInProgress ? "pl-2" : ""}`}>
        <span className={`${labelFont} rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors ${statusToneClasses[task.status]}`}>
          {task.status === "in_progress" ? "In Progress" : task.status === "for_review" ? "For Review" : task.status}
        </span>

        {task.images.length > 0 || task.linked_files.length > 0 ? (
          <span
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-[#c4c7c8] transition-colors group-hover:border-white/20"
            title={`${task.images.length + task.linked_files.length} attachment(s)`}
          >
            {task.images.length > 0 && <ImageIcon aria-hidden="true" size={13} />}
            {task.linked_files.length > 0 && <FileText aria-hidden="true" size={13} />}
            {task.images.length + task.linked_files.length}
          </span>
        ) : null}
      </div>

      <div className={`mb-6 flex min-h-24 flex-col gap-2 ${isInProgress ? "pl-2" : ""}`}>
        <h3 className={`m-0 line-clamp-2 text-[18px] leading-[1.4] font-bold text-white transition-colors group-hover:text-white ${isDone ? "text-[#8e9192] line-through decoration-white/20" : ""}`}>{task.title}</h3>
        <p className={`m-0 line-clamp-2 min-h-10 text-sm leading-5 ${isDone ? "text-[#8e9192]/60" : "text-[#8e9192] group-hover:text-[#c4c7c8]"}`}>
          {descriptionPreview || <span className="text-[#8e9192]/50">No description</span>}
        </p>
      </div>

      <div className={`mt-auto flex w-full items-center justify-between border-t border-white/5 pt-4 ${isInProgress ? "pl-2" : ""}`}>
        {task.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {task.assignees.map((a, i) => (
              <UserAvatarImage
                key={a.id}
                className={`grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#09090b] bg-white/10 text-[10px] font-bold text-white ${isDone ? "opacity-50 grayscale" : ""}`}
                style={{ zIndex: 10 - i }}
                title={getUserDisplayName(a.user)}
                user={a.user}
              />
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className={`flex items-center gap-1.5 ${labelFont} ${isDone ? "text-[#8e9192]/50" : "text-[#8e9192]"}`}>
          <Calendar aria-hidden="true" size={14} />
          {formatDueDate(task.due_date)}
        </div>
      </div>
    </button>
  );
}
