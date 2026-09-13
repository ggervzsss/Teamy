import { useMemo } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { TeamyTask } from "@/features/taskboard/api";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getRichTextPlainText } from "@/shared/richText";
import { getUserDisplayName } from "@/shared/userDisplay";
import { parseApiDateTime, toLocalDate } from "@/shared/dateTime";
import { StatusBadge } from "./TaskDetailModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";

function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(dueDate));
}

function sortTasksByLatestStartDate(tasks: TeamyTask[]) {
  return [...tasks].sort((a, b) => b.start_date.localeCompare(a.start_date) || parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at));
}

export function TaskTableSection({
  canSelectTask,
  collapsed = false,
  highlightedTaskId,
  onSelectTask,
  onSetSelectedTasks,
  onToggleCollapse,
  onToggleSelectedTask,
  selectedTaskIds,
  tasks,
  title,
}: {
  canSelectTask?: (task: TeamyTask) => boolean;
  collapsed?: boolean;
  highlightedTaskId?: string | null;
  onSelectTask: (taskId: string) => void;
  onSetSelectedTasks?: (taskIds: string[], selected: boolean) => void;
  onToggleCollapse?: () => void;
  onToggleSelectedTask?: (taskId: string) => void;
  selectedTaskIds?: Set<string>;
  tasks: TeamyTask[];
  title?: string;
}) {
  const sortedTasks = useMemo(() => sortTasksByLatestStartDate(tasks), [tasks]);
  const selectableTaskIds = useMemo(() => sortedTasks.filter((task) => canSelectTask?.(task)).map((task) => task.id), [canSelectTask, sortedTasks]);
  const isSelectionEnabled = Boolean(canSelectTask && onSetSelectedTasks && onToggleSelectedTask && selectedTaskIds);
  const selectedCount = selectableTaskIds.filter((taskId) => selectedTaskIds?.has(taskId)).length;
  const areAllSelectableTasksSelected = selectableTaskIds.length > 0 && selectedCount === selectableTaskIds.length;

  return (
    <section className={`${panelClass} overflow-hidden`}>
      {title ? (
        <button className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 border-b border-white/10 bg-white/5 px-6 py-4 text-left" onClick={onToggleCollapse} type="button">
          <span className="flex items-center gap-2">
            {onToggleCollapse ? collapsed ? <ChevronRight aria-hidden="true" size={18} /> : <ChevronDown aria-hidden="true" size={18} /> : null}
            <span className="text-lg font-bold text-white">{title}</span>
          </span>
          <span className={`${labelFont} rounded border border-white/10 px-2 py-1 text-[#c4c7c8] uppercase`}>{tasks.length}</span>
        </button>
      ) : null}
      {collapsed ? null : (
        <div className="custom-scrollbar scrollbar-gutter-auto overflow-x-auto">
          <table className="w-full text-left text-sm text-[#c4c7c8]">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase">
              <tr>
                {isSelectionEnabled ? (
                  <th className="w-12 p-0 font-medium">
                    <label
                      className={`flex h-full min-h-12 w-full cursor-pointer items-center justify-center px-4 py-4 ${selectableTaskIds.length === 0 ? "cursor-not-allowed opacity-50" : ""}`}
                      title="Select all deletable tasks"
                    >
                      <input
                        aria-label="Select all deletable tasks"
                        checked={areAllSelectableTasksSelected}
                        disabled={selectableTaskIds.length === 0}
                        onChange={(event) => onSetSelectedTasks?.(selectableTaskIds, event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                  </th>
                ) : null}
                <th className="px-6 py-4 font-medium">Task</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Due Date</th>
                <th className="px-6 py-4 font-medium">Assignees</th>
                <th className="px-6 py-4 font-medium">Files</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedTasks.map((task) => {
                const canSelect = Boolean(canSelectTask?.(task));
                const isSelected = Boolean(selectedTaskIds?.has(task.id));
                const isHighlighted = task.id === highlightedTaskId;
                return (
                  <tr
                    id={`task-item-${task.id}`}
                    key={task.id}
                    className={`group cursor-pointer transition-all duration-200 ${
                      isHighlighted
                        ? "bg-[#a855f7]/25 border-l-4 border-l-[#a855f7] shadow-[0_0_25px_rgba(168,85,247,0.6)] animate-pulse"
                        : "hover:bg-white/6 hover:border-l-2 hover:border-l-[#a855f7]/40"
                    }`}
                    onClick={() => onSelectTask(task.id)}
                  >
                    {isSelectionEnabled ? (
                      <td className="p-0" onClick={(event) => event.stopPropagation()}>
                        <label
                          className={`flex h-full min-h-16 w-full items-center justify-center px-4 py-4 ${canSelect ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                          title={canSelect ? "Select task for deletion" : "Only project leaders or task creators can delete this task"}
                        >
                          <input aria-label={`Select ${task.title}`} checked={isSelected} disabled={!canSelect} onChange={() => onToggleSelectedTask?.(task.id)} type="checkbox" />
                        </label>
                      </td>
                    ) : null}
                    <td className="px-6 py-4 font-medium text-white">
                      <span className="flex flex-col gap-1">
                        <span className="line-clamp-1 text-base font-semibold text-white transition-colors group-hover:text-[#d8b4fe]">{task.title}</span>
                        {task.description ? <span className="line-clamp-1 max-w-xl text-xs font-normal text-[#8e9192] group-hover:text-[#c4c7c8]">{getRichTextPlainText(task.description)}</span> : null}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-[#c4c7c8]">{formatDueDate(task.due_date)}</td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-2">
                        {task.assignees.map((a) => (
                          <UserAvatarImage key={a.id} className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#09090b] bg-white/10 text-[10px] font-bold text-white shadow-sm" user={a.user} title={getUserDisplayName(a.user)} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {task.linked_files.length > 0 ? (
                        <span className={`${labelFont} inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/90 uppercase`}>
                          <FileText aria-hidden="true" size={13} />
                          {task.linked_files.length}
                        </span>
                      ) : (
                        <span className="text-[#8e9192]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={isSelectionEnabled ? 6 : 5} className="px-6 py-8 text-center text-[#8e9192]">
                    No tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
