import { Archive, CheckCircle2, Info, Loader2, Pencil, Trash2, X } from "lucide-react";
import { AnimatedModal } from "@/shared/components/AnimatedModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none transition-all focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30 text-sm";
const primaryButton = `${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white uppercase transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
const dangerOutlineButton = `${labelFont} inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ffb4ab]/30 bg-transparent px-4 py-2.5 text-[#ffb4ab] uppercase transition-all hover:bg-[#ffb4ab]/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
const dangerSolidButton = `${labelFont} inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ffb4ab] bg-[#ffb4ab] px-4 py-2.5 text-[#690005] uppercase transition-all hover:bg-[#ffd5d0] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;

export type DialogMode = "rename" | "archive" | "delete";

export function WorkspaceConfirmDialog({
  archivePhrase,
  deleteName,
  deletePhrase,
  dialogMode,
  dialogStep,
  error,
  isSubmitting,
  onArchive,
  onArchivePhraseChange,
  onClose,
  onDelete,
  onDeleteNameChange,
  onDeletePhraseChange,
  onRename,
  onStepChange,
  projectName,
  renamedName,
}: {
  archivePhrase: string;
  deleteName: string;
  deletePhrase: string;
  dialogMode: DialogMode;
  dialogStep: number;
  error: string;
  isSubmitting: boolean;
  onArchive: () => Promise<void>;
  onArchivePhraseChange: (value: string) => void;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onDeleteNameChange: (value: string) => void;
  onDeletePhraseChange: (value: string) => void;
  onRename: () => Promise<void>;
  onStepChange: (step: number) => void;
  projectName: string;
  renamedName: string;
}) {
  const isArchiveReady = archivePhrase === "ARCHIVE";
  const isDeleteReady = deleteName === projectName && deletePhrase === "DELETE";

  return (
    <AnimatedModal className="z-100" contentClassName="w-full max-w-lg" onBackdropClick={onClose}>
      <div aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e10]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl" role="dialog">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]">
              {dialogMode === "delete" ? <Trash2 aria-hidden="true" size={18} /> : dialogMode === "archive" ? <Archive aria-hidden="true" size={18} /> : <Pencil aria-hidden="true" size={18} />}
            </span>
            <h2 className="m-0 text-xl font-bold text-white">{dialogMode === "rename" ? "Confirm Rename" : dialogMode === "archive" ? "Archive Workspace" : "Delete Workspace"}</h2>
          </div>
          <button className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[#8e9192] hover:bg-white/5 hover:text-white" onClick={onClose} type="button">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="p-6">
          {dialogMode === "rename" ? (
            <RenameConfirmation isSubmitting={isSubmitting} onRename={onRename} projectName={projectName} renamedName={renamedName} />
          ) : dialogMode === "archive" ? (
            <ArchiveConfirmation
              archivePhrase={archivePhrase}
              dialogStep={dialogStep}
              isArchiveReady={isArchiveReady}
              isSubmitting={isSubmitting}
              onArchive={onArchive}
              onArchivePhraseChange={onArchivePhraseChange}
              onStepChange={onStepChange}
            />
          ) : (
            <DeleteConfirmation
              deleteName={deleteName}
              deletePhrase={deletePhrase}
              dialogStep={dialogStep}
              isDeleteReady={isDeleteReady}
              isSubmitting={isSubmitting}
              onDelete={onDelete}
              onDeleteNameChange={onDeleteNameChange}
              onDeletePhraseChange={onDeletePhraseChange}
              onStepChange={onStepChange}
              projectName={projectName}
            />
          )}
          {error ? <div className="mt-4 rounded border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-3 py-2 text-sm text-[#ffdad6]">{error}</div> : null}
        </div>
      </div>
    </AnimatedModal>
  );
}

function RenameConfirmation({ isSubmitting, onRename, projectName, renamedName }: { isSubmitting: boolean; onRename: () => Promise<void>; projectName: string; renamedName: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-[#c4c7c8]">
        <Info aria-hidden="true" className="mt-1 shrink-0 text-white" size={18} />
        <p className="m-0">
          Members will see the workspace change from "{projectName}" to "{renamedName}" across Teamy.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <button className={primaryButton} disabled={isSubmitting} onClick={onRename} type="button">
          {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <CheckCircle2 aria-hidden="true" size={16} />}
          Confirm Save
        </button>
      </div>
    </div>
  );
}

function ArchiveConfirmation({
  archivePhrase,
  dialogStep,
  isArchiveReady,
  isSubmitting,
  onArchive,
  onArchivePhraseChange,
  onStepChange,
}: {
  archivePhrase: string;
  dialogStep: number;
  isArchiveReady: boolean;
  isSubmitting: boolean;
  onArchive: () => Promise<void>;
  onArchivePhraseChange: (value: string) => void;
  onStepChange: (step: number) => void;
}) {
  if (dialogStep === 1) {
    return (
      <div className="flex flex-col gap-5">
        <p className="m-0 text-[#c4c7c8]">Archiving makes this workspace read-only for everyone. Members can still view content, but new tasks, files, and announcements will be blocked.</p>
        <div className="flex justify-end gap-3">
          <button className={dangerOutlineButton} onClick={() => onStepChange(2)} type="button">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={`${labelFont} text-[#8e9192] uppercase`}>Type ARCHIVE to confirm</span>
        <input className={inputClass} onChange={(event) => onArchivePhraseChange(event.target.value)} value={archivePhrase} />
      </label>
      <div className="flex justify-end gap-3">
        <button className={dangerOutlineButton} disabled={!isArchiveReady || isSubmitting} onClick={onArchive} type="button">
          {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Archive aria-hidden="true" size={16} />}
          Archive Workspace
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmation({
  deleteName,
  deletePhrase,
  dialogStep,
  isDeleteReady,
  isSubmitting,
  onDelete,
  onDeleteNameChange,
  onDeletePhraseChange,
  onStepChange,
  projectName,
}: {
  deleteName: string;
  deletePhrase: string;
  dialogStep: number;
  isDeleteReady: boolean;
  isSubmitting: boolean;
  onDelete: () => Promise<void>;
  onDeleteNameChange: (value: string) => void;
  onDeletePhraseChange: (value: string) => void;
  onStepChange: (step: number) => void;
  projectName: string;
}) {
  if (dialogStep === 1) {
    return (
      <div className="flex flex-col gap-5">
        <p className="m-0 text-[#ffdad6]">This permanently deletes the workspace, members, tasks, announcements, files, and linked documents. This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button className={dangerSolidButton} onClick={() => onStepChange(2)} type="button">
            I Understand
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={`${labelFont} text-[#8e9192] uppercase`}>Type the workspace name</span>
        <input className={inputClass} onChange={(event) => onDeleteNameChange(event.target.value)} value={deleteName} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={`${labelFont} text-[#8e9192] uppercase`}>Type DELETE to confirm</span>
        <input className={inputClass} onChange={(event) => onDeletePhraseChange(event.target.value)} value={deletePhrase} />
      </label>
      <p className="m-0 text-sm text-[#8e9192]">Required workspace name: {projectName}</p>
      <div className="flex justify-end gap-3">
        <button className={dangerSolidButton} disabled={!isDeleteReady || isSubmitting} onClick={onDelete} type="button">
          {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
          Delete Permanently
        </button>
      </div>
    </div>
  );
}
