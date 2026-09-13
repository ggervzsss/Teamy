import type { FormEvent } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { TeamMember } from "@/features/teammanagement/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";

export function NicknameModal({
  isSaving,
  member,
  nickname,
  onClose,
  onNicknameChange,
  onSubmit,
}: {
  isSaving: boolean;
  member: TeamMember;
  nickname: string;
  onClose: () => void;
  onNicknameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <AnimatedModal className="z-70" contentClassName={`${panelClass} flex w-full max-w-md flex-col gap-5 p-6`}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-bold text-white">Workspace Nickname</h2>
            <p className="m-0 mt-1 text-sm text-[#8e9192]">{member.user.full_name}</p>
          </div>
          <button className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Nickname</span>
          <input autoFocus className={inputClass} maxLength={40} onChange={(event) => onNicknameChange(event.target.value)} placeholder="No nickname in this workspace" value={nickname} />
        </label>

        <div className="flex justify-end gap-3">
          <button
            className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Check aria-hidden="true" size={16} />}
            Save
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}
