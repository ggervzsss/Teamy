import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { RichTextEditor } from "@/shared/components/RichText";
import { useScrollLock } from "@/shared/useScrollLock";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";

type CreateTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium uppercase tracking-wider";

export function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  useScrollLock(isOpen);

  const isDirty = Boolean(title.trim() || description.trim() || assignee.trim());

  function handleAttemptClose() {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      handleForceClose();
    }
  }

  function handleForceClose() {
    setShowUnsavedConfirm(false);
    setTitle("");
    setDescription("");
    setAssignee("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <AnimatedModal className="z-50" contentClassName="w-full max-w-2xl" onBackdropClick={handleAttemptClose}>
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl sm:px-8">
                <h2 className="m-0 text-xl font-bold text-white">Create New Task</h2>
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="grid size-10 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/5 text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Handle create
                onClose();
              }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6 sm:p-8">
                {/* Title Field */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="title" className={`${labelFont} text-[#8e9192]`}>
                    Task Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., Implement new auth flow"
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 text-white transition-all outline-none placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30"
                    required
                  />
                </div>

                {/* Description Field */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="description" className={`${labelFont} text-[#8e9192]`}>
                    Description
                  </label>
                  <RichTextEditor minHeightClass="min-h-32" onChange={setDescription} placeholder="Add details, paste formatted notes, or include a table..." value={description} />
                </div>

                {/* Assignee Field */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="assignee" className={`${labelFont} text-[#8e9192]`}>
                    Assignee
                  </label>
                  <input
                    id="assignee"
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Search team members..."
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 text-white transition-all outline-none placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center justify-end gap-4 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl sm:px-8">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className={`${labelFont} h-12 cursor-pointer rounded-2xl border border-white/10 bg-transparent px-6 text-white transition-all hover:border-white/20 hover:bg-white/5`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${labelFont} teamy-btn-primary h-12 cursor-pointer rounded-2xl px-8 text-xs font-bold uppercase`}
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </AnimatedModal>
      </AnimatePresence>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceClose}
      />
    </>
  );
}

export default CreateTaskModal;
