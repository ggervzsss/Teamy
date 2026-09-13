import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";

export function CreateFileModal({
  isCreating,
  modal,
  onClose,
  onSubmit,
  setTitle,
  setUrl,
  title,
  url,
}: {
  isCreating: boolean;
  modal: "link" | "doc" | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setTitle: (val: string) => void;
  setUrl: (val: string) => void;
  title: string;
  url: string;
}) {
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  if (!modal) return null;

  const isFormDirty = Boolean(title.trim() || url.trim());

  function handleAttemptClose() {
    if (isFormDirty) {
      setShowUnsavedConfirm(true);
    } else {
      handleForceClose();
    }
  }

  function handleForceClose() {
    setShowUnsavedConfirm(false);
    onClose();
  }

  return (
    <>
      <AnimatedModal className="z-70" contentClassName="w-full max-w-lg" onBackdropClick={handleAttemptClose}>
        <form className={`${panelClass} flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden`} onSubmit={onSubmit}>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
            <div>
              <h2 className="m-0 text-xl font-bold text-white">{modal === "doc" ? "New Teamy Doc" : "Add Link"}</h2>
              <p className="m-0 mt-1 text-sm text-[#8e9192]">{modal === "doc" ? "Create an editable document in Resources." : "Save an external resource for the team."}</p>
            </div>
            <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={handleAttemptClose} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
            <label className="flex flex-col gap-2">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
              <input className={inputClass} maxLength={240} onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            {modal === "link" ? (
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>URL</span>
                <input className={inputClass} maxLength={2048} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." required type="url" value={url} />
              </label>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
            <button className={`${labelFont} rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={handleAttemptClose} type="button">
              Cancel
            </button>
            <button
              className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:opacity-60`}
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Plus aria-hidden="true" size={16} />}
              Create
            </button>
          </div>
        </form>
      </AnimatedModal>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceClose}
      />
    </>
  );
}
