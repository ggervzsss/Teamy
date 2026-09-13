import type { CSSProperties } from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";
import type { TeamyTask } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { RichTextContent } from "@/shared/components/RichText";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { toLocalDate } from "@/shared/dateTime";
import { getUserDisplayName } from "@/shared/userDisplay";
import type { EffectiveStatus, TimelineTask } from "../utils/timelineUtils";
import { formatShortDate, statusConfig } from "../utils/timelineUtils";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

export function StatusDot({ status }: { status: EffectiveStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className="relative flex size-3 shrink-0 items-center justify-center">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {status === "overdue" ? <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: cfg.color }} /> : null}
    </span>
  );
}

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`${labelFont} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase shadow-xs`} style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export function AssigneeStack({ assignees }: { assignees: TeamyTask["assignees"] }) {
  if (assignees.length === 0) {
    return <span className="text-xs text-[#8e9192]">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center -space-x-2">
      {assignees.map((assignee) => (
        <UserAvatarImage
          className="grid size-7 place-items-center overflow-hidden rounded-full border-2 border-[#09090b] text-[8px] font-medium text-white"
          key={assignee.id}
          style={
            {
              background: "linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.96) 36%), #2a2a2e",
            } as CSSProperties
          }
          title={getUserDisplayName(assignee.user)}
          user={assignee.user}
        />
      ))}
    </div>
  );
}

export function TaskDetailTimelineModal({ item, onClose, onResolve, onUnresolve }: { item: TimelineTask; onClose: () => void; onResolve: (id: string) => void; onUnresolve: (id: string) => void }) {
  const task = item;
  const cfg = statusConfig[task.effectiveStatus];
  const startDate = toLocalDate(task.start_date);
  const dueDate = task.due_date ? toLocalDate(task.due_date) : null;

  return (
    <AnimatedModal className="z-50" contentClassName="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e0e10]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl" onBackdropClick={onClose}>
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="flex items-center gap-3 text-xl font-bold text-white">
            <StatusDot status={task.effectiveStatus} />
            {task.title}
          </h3>
          <button onClick={onClose} className="cursor-pointer text-[#8e9192] transition-colors hover:text-white" type="button">
            <X size={20} />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-5">
          {task.description ? <RichTextContent className="text-sm text-[#c4c7c8]" value={task.description} /> : <div className="text-sm text-[#c4c7c8]">No description provided</div>}

          <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
            <span className="text-xs font-semibold tracking-wider text-[#8e9192] uppercase">Assignees</span>
            <AssigneeStack assignees={task.assignees} />
          </div>

          <div className="flex items-center gap-8 border-t border-white/5 pt-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-[#8e9192] uppercase">Start Date</span>
              <span className="text-sm text-white">{formatShortDate(startDate)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-[#8e9192] uppercase">Due Date</span>
              <span className="text-sm text-white">{dueDate ? formatShortDate(dueDate) : "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wider text-[#8e9192] uppercase">Status</span>
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide uppercase"
                style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
          {task.effectiveStatus === "overdue" || task.effectiveStatus === "resolved" ? (
            <div className="flex justify-end border-t border-white/5 pt-4">
              {task.effectiveStatus === "overdue" ? (
                <button
                  className={`${labelFont} teamy-btn-primary inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white uppercase`}
                  onClick={() => {
                    onResolve(task.id);
                    onClose();
                  }}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" size={16} />
                  Resolve
                </button>
              ) : (
                <button
                  className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-[#c4c7c8] uppercase transition-colors hover:bg-white/10 hover:text-white`}
                  onClick={() => {
                    onUnresolve(task.id);
                    onClose();
                  }}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={16} />
                  Undo Resolve
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </AnimatedModal>
  );
}
