import { CheckCircle2, Clock, ListTodo } from "lucide-react";
import type { TaskStatus, TeamyTask } from "@/features/taskboard/api";
import { formatDueDate } from "../utils/deadlineUtils";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "Progress",
  for_review: "Review",
  done: "Done",
};

const statusToneClasses: Record<TaskStatus, string> = {
  todo: "border-[#8e9192]/30 bg-[#8e9192]/10 text-[#d7d9da]",
  in_progress: "border-[#8fd3ff]/35 bg-[#8fd3ff]/12 text-[#bfe6ff]",
  for_review: "border-[#d8c5ff]/35 bg-[#d8c5ff]/12 text-[#e8dcff]",
  done: "border-[#9be7b0]/35 bg-[#9be7b0]/12 text-[#c7f5d0]",
};

const statusIconClasses: Record<TaskStatus, string> = {
  todo: "border-white/10 bg-white/5 text-[#8e9192] group-hover:border-[#a855f7]/40 group-hover:bg-[#a855f7]/15 group-hover:text-white",
  in_progress: "border-[#8fd3ff]/40 bg-[#8fd3ff]/15 text-[#8fd3ff] shadow-[0_0_10px_rgba(143,211,255,0.2)]",
  for_review: "border-[#d8c5ff]/40 bg-[#d8c5ff]/15 text-[#e8dcff] shadow-[0_0_10px_rgba(216,197,255,0.3)]",
  done: "border-[#9be7b0]/40 bg-[#9be7b0]/15 text-[#9be7b0] shadow-[0_0_10px_rgba(155,231,176,0.2)]",
};

export function DashboardTaskRow({ onOpen, task }: { onOpen: () => void; task: TeamyTask }) {
  const Icon = task.status === "in_progress" ? Clock : task.status === "for_review" || task.status === "done" ? CheckCircle2 : ListTodo;

  return (
    <button
      className="group flex w-full cursor-pointer items-center gap-4 border-0 border-b border-l-2 border-white/5 border-l-transparent bg-transparent p-5 text-left transition-all duration-200 last:border-b-0 hover:border-l-[#a855f7] hover:bg-white/5 active:scale-[0.99]"
      onClick={onOpen}
      type="button"
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${statusIconClasses[task.status]}`}
      >
        <Icon aria-hidden="true" size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-white transition-colors group-hover:text-[#d8b4fe]">{task.title}</span>
        <span className={`${labelFont} mt-1.5 flex flex-wrap items-center gap-2 text-[#8e9192]`}>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <Clock aria-hidden="true" size={13} />
            {formatDueDate(task.due_date)}
          </span>
          <span>{"\u2022"}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusToneClasses[task.status]}`}>
            {statusLabels[task.status]}
          </span>
        </span>
      </span>
    </button>
  );
}
