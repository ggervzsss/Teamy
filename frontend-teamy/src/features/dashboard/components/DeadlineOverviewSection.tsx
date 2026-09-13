import { Clock, Megaphone } from "lucide-react";
import type { DashboardDeadlineItem } from "../api";
import { formatDueDate, getDueDateParts } from "../utils/deadlineUtils";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

export function DeadlineItem({ item, onOpen }: { item: DashboardDeadlineItem; onOpen: () => void }) {
  const parts = getDueDateParts(item.dueDate);
  const isTask = item.kind === "task";

  return (
    <button
      className="group flex cursor-pointer items-start gap-4 rounded-xl border border-transparent p-2.5 text-left transition-all duration-200 hover:border-white/10 hover:bg-white/5 active:scale-[0.98]"
      onClick={onOpen}
      type="button"
    >
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 text-[#d8b4fe] shadow-[0_4px_16px_rgba(168,85,247,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:border-[#a855f7]/60 group-hover:bg-[#a855f7]/25 group-hover:text-white">
        {parts ? (
          <>
            <span className={`${labelFont} mb-0.5 text-[9px] font-bold tracking-wider uppercase text-[#c4c7c8] group-hover:text-white/90`}>{parts.month}</span>
            <span className="text-base font-bold leading-none">{parts.day}</span>
          </>
        ) : (
          <Megaphone aria-hidden="true" size={18} />
        )}
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block truncate font-semibold text-white transition-colors group-hover:text-[#d8b4fe]">{item.title}</span>
        <span className={`${labelFont} mt-1.5 flex flex-wrap items-center gap-1.5 text-[#8e9192]`}>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" size={13} />
            {formatDueDate(item.dueDate)}
          </span>
          <span>{"\u2022"}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              isTask ? "border border-[#8fd3ff]/30 bg-[#8fd3ff]/10 text-[#bfe6ff]" : "border border-[#a855f7]/30 bg-[#a855f7]/10 text-[#d8b4fe]"
            }`}
          >
            {isTask ? "Task" : "Announcement"}
          </span>
        </span>
      </span>
    </button>
  );
}
