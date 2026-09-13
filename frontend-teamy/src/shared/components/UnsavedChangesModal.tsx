import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

export function UnsavedChangesModal({
  isOpen,
  onConfirmDiscard,
  onCancel,
  title = "Unsaved Changes",
  description = "You have inputted text in this task. Are you sure you want to discard your unsaved changes?",
}: {
  isOpen: boolean;
  onConfirmDiscard: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onCancel} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e10]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertTriangle size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-base leading-tight font-bold text-white">{title}</h3>
              <p className="m-0 mt-2 text-sm leading-relaxed text-[#c4c7c8]">{description}</p>
            </div>

            <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg p-1 text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white" title="Close">
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onConfirmDiscard}
              className={`${labelFont} cursor-pointer rounded-lg border border-[#ff8a80]/30 bg-[#ff8a80]/10 px-4 py-2.5 text-xs font-bold text-[#ff8a80] uppercase transition-all hover:border-[#ff8a80]/50 hover:bg-[#ff8a80]/20 active:scale-95`}
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`${labelFont} cursor-pointer rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-[#09090b] uppercase shadow-md transition-all hover:bg-[#c6c6c6] active:scale-95`}
            >
              Keep Editing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
