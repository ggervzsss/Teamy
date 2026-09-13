import { ArrowRight, Loader2, Tag, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TeamyProject } from "@/features/projects";
import { useJoinProject } from "@/features/projects/hooks";
import { AnimatedModal } from "@/shared/components/AnimatedModal";

type JoinProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: TeamyProject) => void;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-bold leading-none tracking-wider";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-3 text-sm font-mono tracking-wider text-white outline-none transition-all placeholder:text-[#8e9192] placeholder:font-sans focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "").replaceAll("_", "-");
}

export function JoinProjectModal({ isOpen, onClose, onSuccess }: JoinProjectModalProps) {
  const navigate = useNavigate();
  const [teamyCode, setTeamyCode] = useState("");
  const joinProjectMutation = useJoinProject();

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!teamyCode.trim()) return;
    try {
      const project = await joinProjectMutation.mutateAsync(normalizeCode(teamyCode));
      onSuccess?.(project);
      onClose();
      navigate(`/projects/${project.slug}/dashboard`);
    } catch {
      // Toast notification is managed inside mutation hook
    }
  }

  return (
    <AnimatedModal className="z-50" contentClassName="w-full max-w-md" onBackdropClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e10]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/15 text-[#d8b4fe] shadow-md">
              <Tag aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="m-0 text-xl font-bold text-white">Join Project</h2>
              <p className="m-0 text-xs text-[#8e9192]">Access a workspace using a shared code.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/5 text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <label className="flex flex-col gap-1.5">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Enter Teamy Code</span>
              <span className="relative flex items-center">
                <input
                  autoFocus
                  autoComplete="off"
                  className={inputClass}
                  onChange={(e) => setTeamyCode(e.target.value)}
                  placeholder="e.g. TMY-9284-XK"
                  required
                  value={teamyCode}
                />
                <Tag aria-hidden="true" className="absolute right-3.5 text-[#8e9192]" size={16} />
              </span>
            </label>
            <p className="m-0 text-xs text-[#8e9192]">Enter the unique code shared by your project lead or teammate.</p>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={onClose}
              className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-[#c4c7c8] uppercase hover:bg-white/10 hover:text-white`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={joinProjectMutation.isPending || !teamyCode.trim()}
              className={`${labelFont} teamy-btn-primary inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {joinProjectMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={15} />
                  Joining...
                </>
              ) : (
                <>
                  Join Project
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModal>
  );
}
