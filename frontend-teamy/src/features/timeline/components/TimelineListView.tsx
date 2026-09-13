import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import { getRichTextPlainText } from "@/shared/richText";
import { toLocalDate } from "@/shared/dateTime";
import type { TimelineTask } from "../utils/timelineUtils";
import { getDaysBetween, groupTasksByMonth, statusConfig, formatShortDate } from "../utils/timelineUtils";
import { AssigneeStack, StatusBadge, StatusDot } from "./TaskDetailTimelineModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

export function TimelineListView({
  onSelect,
  tasks,
  sortOrder = "newest",
}: {
  onSelect: (item: TimelineTask) => void;
  tasks: TimelineTask[];
  sortOrder?: "newest" | "oldest";
}) {
  const groups = useMemo(() => groupTasksByMonth(tasks, sortOrder), [tasks, sortOrder]);

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-[#8e9192]">No timeline tasks found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section className="flex flex-col gap-3.5" key={group.label}>
          <div className="flex items-center gap-2">
            <CalendarRange aria-hidden="true" size={16} className="text-[#a855f7]" />
            <h2 className={`${labelFont} m-0 font-semibold text-[#e4e1e7] uppercase`}>{group.label}</h2>
            <span className={`${labelFont} rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-2.5 py-0.5 text-xs font-semibold text-[#d8b4fe]`}>{group.tasks.length}</span>
          </div>

          <div className="gpu-panel overflow-hidden rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/3">
                  <th className={`${labelFont} w-28 px-4 py-3.5 text-[#8e9192] uppercase`}>Start</th>
                  <th className={`${labelFont} px-4 py-3.5 text-[#8e9192] uppercase`}>Item</th>
                  <th className={`${labelFont} w-32 px-4 py-3.5 text-[#8e9192] uppercase`}>Assignees</th>
                  <th className={`${labelFont} w-28 px-4 py-3.5 text-[#8e9192] uppercase`}>Due</th>
                  <th className={`${labelFont} w-20 px-4 py-3.5 text-center text-[#8e9192] uppercase`}>Days</th>
                  <th className={`${labelFont} w-32 px-4 py-3.5 text-[#8e9192] uppercase`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {group.tasks.map((task) => {
                  const cfg = statusConfig[task.effectiveStatus];
                  const startDate = toLocalDate(task.start_date);
                  const dueDate = task.due_date ? toLocalDate(task.due_date) : null;
                  const duration = dueDate ? getDaysBetween(startDate, dueDate) : null;

                  return (
                    <tr
                      className="group cursor-pointer border-b border-white/5 transition-all duration-200 last:border-b-0 hover:bg-white/6"
                      key={`task-${task.id}`}
                      onClick={() => onSelect(task)}
                      style={{ borderLeft: `3px solid ${cfg.color}` }}
                    >
                      <td className="px-4 py-4 text-xs font-medium text-[#c4c7c8]">{formatShortDate(startDate)}</td>
                      <td className="px-4 py-4">
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-white transition-colors group-hover:text-[#d8b4fe]">
                          <StatusDot status={task.effectiveStatus} />
                          {task.title}
                        </span>
                        {task.description ? <span className="mt-0.5 block max-w-md truncate text-xs font-normal text-[#8e9192] group-hover:text-[#c4c7c8]">{getRichTextPlainText(task.description)}</span> : null}
                      </td>
                      <td className="px-4 py-4">
                        <AssigneeStack assignees={task.assignees} />
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[#c4c7c8]">{dueDate ? formatShortDate(dueDate) : "-"}</td>
                      <td className="px-4 py-4 text-center text-xs font-medium text-[#c4c7c8]">{duration ? `${duration}d` : "-"}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={task.effectiveStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
