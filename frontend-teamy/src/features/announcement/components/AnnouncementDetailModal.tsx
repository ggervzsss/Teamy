import type { FormEvent } from "react";
import { useState } from "react";
import { BellRing, CheckCircle2, Loader2, Pencil, Pin, PinOff, Save, Trash2, X } from "lucide-react";
import type { AnnouncementUpdatePayload, TeamyAnnouncement } from "@/features/announcement/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { RichTextContent, RichTextEditor } from "@/shared/components/RichText";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import { isRichTextEmpty } from "@/shared/richText";
import { toApiDate } from "@/shared/dateTime";
import { AuthorStamp, DeadlineStamp } from "./AnnouncementCard";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";

export function AnnouncementDetailModal({
  announcement,
  canEdit,
  isMarkingDone = false,
  isPinPending,
  onClose,
  onDelete,
  onEdit,
  onMarkDone,
  onNotify,
  onPinToggle,
  startEditing = false,
}: {
  announcement: TeamyAnnouncement;
  canEdit: boolean;
  isMarkingDone?: boolean;
  isPinPending: boolean;
  onClose: () => void;
  onDelete?: (announcement: TeamyAnnouncement) => void;
  onEdit: (announcementId: string, payload: AnnouncementUpdatePayload) => Promise<void>;
  onMarkDone?: (announcementId: string) => Promise<void>;
  onNotify: (announcementId: string) => Promise<void>;
  onPinToggle: () => void;
  startEditing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(startEditing && canEdit);
  const [editForm, setEditForm] = useState({ title: announcement.title, body: announcement.body, isPinned: announcement.is_pinned, deadlineDate: announcement.deadline_date || "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const isFormDirty = Boolean(
    isEditing &&
      (editForm.title.trim() !== announcement.title ||
        editForm.body.trim() !== announcement.body ||
        editForm.deadlineDate !== (announcement.deadline_date || ""))
  );

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

  async function handleNotifyClick() {
    setIsNotifying(true);
    try {
      await onNotify(announcement.id);
    } finally {
      setIsNotifying(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRichTextEmpty(editForm.body)) {
      setLocalError("Add an announcement message.");
      return;
    }
    setIsSaving(true);
    setLocalError("");
    try {
      await onEdit(announcement.id, {
        title: editForm.title,
        body: editForm.body,
        is_pinned: editForm.isPinned,
        deadline_date: editForm.deadlineDate || null,
      });
      setIsEditing(false);
    } catch {
      setLocalError("Could not save the announcement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatedModal className="z-70" contentClassName="w-full max-w-2xl" onBackdropClick={handleAttemptClose}>
      <article className={`${panelClass} flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex min-w-0 flex-col gap-3">
            <AuthorStamp announcement={announcement} />
            <h2 className="m-0 text-xl leading-tight font-bold text-white">{announcement.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit ? (
              <>
                <button
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
                  onClick={() => setIsEditing((current) => !current)}
                  type="button"
                  title="Edit announcement"
                >
                  <Pencil aria-hidden="true" size={17} />
                </button>
                {onDelete ? (
                  <button
                    className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                    onClick={() => onDelete(announcement)}
                    type="button"
                    title="Delete announcement"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                ) : null}
              </>
            ) : null}
            <button className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={handleAttemptClose} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {localError ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]">{localError}</div> : null}

          {isEditing ? (
            <form className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#09090b]/50 p-5" onSubmit={handleEditSubmit}>
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
                <input className={inputClass} maxLength={200} onChange={(event) => setEditForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={editForm.title} />
              </label>
              <div className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Message</span>
                <RichTextEditor
                  minHeightClass="min-h-40"
                  onChange={(body) => setEditForm((currentForm) => ({ ...currentForm, body }))}
                  placeholder="Write an update, paste formatted text, or include a table..."
                  required
                  value={editForm.body}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/3 p-3 text-white transition-colors hover:bg-white/6">
                <input checked={editForm.isPinned} onChange={(event) => setEditForm((currentForm) => ({ ...currentForm, isPinned: event.target.checked }))} type="checkbox" />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Pin aria-hidden="true" size={16} />
                  Pin announcement
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Date</span>
                <input className={inputClass} onChange={(event) => setEditForm((currentForm) => ({ ...currentForm, deadlineDate: event.target.value }))} type="date" value={editForm.deadlineDate} />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
                  onClick={() => setIsEditing(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#09090b]/50 p-5">
              <RichTextContent className="text-base leading-relaxed text-[#e4e1e7]" value={announcement.body} />
              {announcement.deadline_date ? <DeadlineStamp date={announcement.deadline_date} /> : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-between gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            {!announcement.is_record_only ? (
              <button
                className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={isPinPending}
                onClick={onPinToggle}
                type="button"
              >
                {announcement.is_pinned ? <PinOff aria-hidden="true" size={16} /> : <Pin aria-hidden="true" size={16} />}
                {announcement.is_pinned ? "Unpin" : "Pin"}
              </button>
            ) : null}
            {canEdit && !announcement.is_record_only ? (
              <button
                className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-indigo-300 uppercase transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={isNotifying}
                onClick={() => void handleNotifyClick()}
                type="button"
                title="Send a reminder notification to all project members"
              >
                {isNotifying ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <BellRing aria-hidden="true" size={16} />}
                {isNotifying ? "Notifying..." : "Notify All"}
              </button>
            ) : null}
            {!announcement.is_record_only && !announcement.deadline_date && !announcement.deadline_done_at && onMarkDone ? (
              <button
                className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 px-4 py-3 text-[#2dd4bf] uppercase transition-colors hover:bg-[#2dd4bf]/20 disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={isMarkingDone}
                onClick={() => void onMarkDone(announcement.id)}
                type="button"
                title="Remove this undated announcement from Deadline Overview"
              >
                {isMarkingDone ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <CheckCircle2 aria-hidden="true" size={16} />}
                {isMarkingDone ? "Marking..." : "Mark as Done"}
              </button>
            ) : null}
          </div>
          <time className="self-center text-sm text-[#8e9192]">
            Posted {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(toApiDate(announcement.created_at))}
          </time>
        </div>
      </article>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceClose}
      />
    </AnimatedModal>
  );
}
