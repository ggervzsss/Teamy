import { Loader2, UserMinus, UserPlus, X } from "lucide-react";
import type { TeamPresenceMember } from "@/features/teammanagement/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { getUserDisplayName } from "@/shared/userDisplay";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";

export function RoleConfirmationModal({
  isSubmitting,
  member,
  nextRole,
  onClose,
  onConfirm,
}: {
  isSubmitting: boolean;
  member: TeamPresenceMember;
  nextRole: "co_leader" | "member";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const memberName = getUserDisplayName(member.user);
  const isPromote = nextRole === "co_leader";

  return (
    <AnimatedModal className="z-70" contentClassName={`${panelClass} flex w-full max-w-md flex-col gap-5 p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
              isPromote ? "border-[#a855f7]/30 bg-[#a855f7]/10 text-[#d8b4fe]" : "border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]"
            }`}
          >
            {isPromote ? <UserPlus size={20} /> : <UserMinus size={20} />}
          </span>
          <div>
            <h2 className="m-0 text-xl font-bold text-white">{isPromote ? "Promote to Co-leader" : "Demote to Member"}</h2>
            <p className="m-0 mt-0.5 text-xs text-[#8e9192]">{memberName}</p>
          </div>
        </div>
        <button
          className="grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>

      <p className="m-0 text-sm leading-relaxed text-[#c4c7c8]">
        {isPromote ? (
          <>
            Are you sure you want to promote <span className="font-semibold text-white">{memberName}</span> to <span className="font-semibold text-[#d8b4fe]">Co-leader</span>? They will receive full administrative authority across this workspace, including access to workspace settings, member management, and task approvals.
          </>
        ) : (
          <>
            Are you sure you want to demote <span className="font-semibold text-white">{memberName}</span> back to a <span className="font-semibold text-white">Project Member</span>? They will revert to standard member permissions and no longer have workspace administrative privileges.
          </>
        )}
      </p>

      <div className="flex justify-end gap-3 pt-2">
        <button
          className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase transition-all hover:bg-white/5 active:scale-95`}
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg ${
            isPromote ? "teamy-btn-primary text-white" : "border border-[#ffb4ab] bg-[#ffb4ab] text-[#3b0906] hover:bg-[#ffdad6]"
          } px-4 py-3 text-xs font-bold uppercase transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={isSubmitting}
          onClick={onConfirm}
          type="button"
        >
          {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : isPromote ? <UserPlus aria-hidden="true" size={16} /> : <UserMinus aria-hidden="true" size={16} />}
          {isPromote ? "Promote to Co-leader" : "Demote to Member"}
        </button>
      </div>
    </AnimatedModal>
  );
}
