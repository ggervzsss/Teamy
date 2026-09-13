import { Loader2, PlusSquare, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TeamyProject } from "@/features/projects";
import { useCreateProject } from "@/features/projects/hooks";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { RichTextEditor } from "@/shared/components/RichText";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: TeamyProject) => void;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-bold leading-none tracking-wider";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createProjectMutation = useCreateProject();

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!name.trim()) return;
    try {
      const project = await createProjectMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onSuccess?.(project);
      onClose();
      navigate(`/projects/${project.slug}/dashboard`);
    } catch {
      // Toast notification is managed inside mutation hook
    }
  }

  return (
    <AnimatedModal className="z-50" contentClassName="w-full max-w-lg" onBackdropClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e10]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white shadow-md">
              <PlusSquare aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="m-0 text-xl font-bold text-white">Create Project</h2>
              <p className="m-0 text-xs text-[#8e9192]">Initialize a workspace for your team.</p>
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
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Project Name</span>
              <input
                autoFocus
                className={inputClass}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior Thesis"
                required
                value={name}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Description</span>
              <RichTextEditor
                minHeightClass="min-h-28"
                onChange={setDescription}
                placeholder="Briefly describe the objective, paste notes, or include a table..."
                value={description}
              />
            </div>
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
              disabled={createProjectMutation.isPending || !name.trim()}
              className={`${labelFont} teamy-btn-primary inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {createProjectMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={15} />
                  Creating...
                </>
              ) : (
                "Create & Generate Code"
              )}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModal>
  );
}
