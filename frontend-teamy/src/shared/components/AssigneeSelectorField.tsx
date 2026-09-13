import type { ProjectMember } from "@/features/taskboard/api";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getUserDisplayName } from "@/shared/userDisplay";
import { UserPlus, X } from "lucide-react";

export type AssigneeSelectorFieldProps = {
  label?: string;
  subtext?: string;
  members: ProjectMember[];
  selectedIds: string[];
  onToggleRemove: (memberId: string) => void;
  onOpenPicker: () => void;
};

export function AssigneeSelectorField({
  label = "Assignees (optional)",
  subtext = "Added members will be able to view and manage this task.",
  members,
  selectedIds,
  onToggleRemove,
  onOpenPicker,
}: AssigneeSelectorFieldProps) {
  const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
  const selectedMembers = members.filter((m) => selectedIds.includes(m.user.id));

  return (
    <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between">
        <span className={`${labelFont} text-[#c4c7c8] uppercase`}>{label}</span>
        <button
          type="button"
          onClick={onOpenPicker}
          className={`${labelFont} inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1.5 text-xs font-bold text-white uppercase transition-all duration-200 hover:bg-[#a855f7]/20 active:scale-95`}
        >
          <UserPlus aria-hidden="true" size={13} />
          <span>{selectedIds.length > 0 ? "Manage" : "Add Members"}</span>
        </button>
      </div>
      {subtext ? <p className="m-0 text-xs text-[#8e9192]">{subtext}</p> : null}

      {selectedMembers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {selectedMembers.map((m) => (
            <div
              key={m.user.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-1.5 pr-2.5 text-xs text-white"
            >
              <UserAvatarImage className="size-4 overflow-hidden rounded-full bg-white/10 text-[9px] font-medium" user={m.user} />
              <span className="max-w-32 truncate">{getUserDisplayName(m.user)}</span>
              <button
                type="button"
                onClick={() => onToggleRemove(m.user.id)}
                className="grid size-4 cursor-pointer place-items-center rounded-full text-[#8e9192] hover:bg-white/15 hover:text-white"
                title={`Remove ${getUserDisplayName(m.user)}`}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/2 px-3.5 py-2.5 text-xs text-[#8e9192]">
          No assignees added yet.
        </div>
      )}
    </div>
  );
}
