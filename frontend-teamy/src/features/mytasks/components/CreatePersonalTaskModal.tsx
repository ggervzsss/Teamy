import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { PersonalTaskKind, ProjectMember, TaskStatus } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { AssigneeSelectorField, MemberPickerModal } from "@/shared/components";
import { RichTextEditor } from "@/shared/components/RichText";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import toast from "react-hot-toast";
import type { TicketItem } from "../utils/ticketHelpers";
import { MAX_TICKET_CHECKLIST_ITEMS } from "../utils/ticketHelpers";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30 text-sm";

type PersonalCreateStatus = Extract<TaskStatus, "todo" | "in_progress">;

export type PersonalFormState = {
  title: string;
  description: string;
  dueDate: string;
  status: PersonalCreateStatus;
  kind: PersonalTaskKind;
  ticketItems: TicketItem[];
  collaboratorIds: string[];
};

function TicketItemsBuilder({
  items,
  onChange,
}: {
  items: TicketItem[];
  onChange: (items: TicketItem[]) => void;
}) {
  function addItem() {
    if (items.length >= MAX_TICKET_CHECKLIST_ITEMS) {
      toast.error(`Maximum limit of ${MAX_TICKET_CHECKLIST_ITEMS} checklist items reached.`);
      return;
    }
    onChange([...items, { id: crypto.randomUUID(), text: "", checked: false }]);
  }

  function updateItemText(id: string, text: string) {
    onChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`${labelFont} text-[#c4c7c8] uppercase`}>
          Checklist Items ({items.length}/{MAX_TICKET_CHECKLIST_ITEMS} max)
        </span>
        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= MAX_TICKET_CHECKLIST_ITEMS}
          className={`${labelFont} flex items-center gap-1 text-[#8fd3ff] hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-xs text-[#8e9192] w-5 text-right font-medium">{index + 1}.</span>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
              placeholder="Task checklist item..."
              className={inputClass}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 text-[#8e9192] hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreatePersonalTaskModal({
  form,
  isCollaboratorModalOpen,
  isCreating,
  isOpen,
  members,
  onChangeForm,
  onClose,
  onCloseCollaboratorModal,
  onOpenCollaboratorModal,
  onSubmit,
  userId,
}: {
  form: PersonalFormState;
  isCollaboratorModalOpen: boolean;
  isCreating: boolean;
  isOpen: boolean;
  members: ProjectMember[];
  onChangeForm: React.Dispatch<React.SetStateAction<PersonalFormState>>;
  onClose: () => void;
  onCloseCollaboratorModal: () => void;
  onOpenCollaboratorModal: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  userId: string;
}) {
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  if (!isOpen) return null;

  const isDirty = Boolean(
    form.title.trim() ||
      form.description.trim() ||
      form.ticketItems.some((item) => item.text.trim()) ||
      form.collaboratorIds.length > 0
  );

  function handleAttemptClose() {
    if (isDirty) {
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
      <AnimatedModal className="z-70" contentClassName="w-full max-w-xl" onBackdropClick={handleAttemptClose}>
        <form className={`${panelClass} flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden`} onSubmit={onSubmit}>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
            <div>
              <h2 className="m-0 text-2xl font-bold text-white">
                {form.kind === "ticket" ? "New Ticket" : "New Private Task"}
              </h2>
              <p className="m-0 mt-1 text-sm text-[#8e9192]">
                {form.kind === "ticket"
                  ? "Create a collaborative ticket with task checklists and image attachments."
                  : "Only you (and selected collaborators) can see this item in Teamy."}
              </p>
            </div>
            <button
              className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
              onClick={handleAttemptClose}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
            <label className="flex flex-col gap-2">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
              <input className={inputClass} maxLength={200} onChange={(event) => onChangeForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={form.title} />
            </label>

            {form.kind === "ticket" ? (
              <TicketItemsBuilder
                items={form.ticketItems}
                onChange={(ticketItems) => onChangeForm((currentForm) => ({ ...currentForm, ticketItems }))}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Description</span>
                <RichTextEditor
                  onChange={(description) => onChangeForm((currentForm) => ({ ...currentForm, description }))}
                  placeholder="Add details, paste formatted text, or include a table..."
                  value={form.description}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Due Date</span>
                <input className={inputClass} onChange={(event) => onChangeForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))} type="date" value={form.dueDate} />
              </label>
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start In</span>
                <select className={inputClass} onChange={(event) => onChangeForm((currentForm) => ({ ...currentForm, status: event.target.value as PersonalCreateStatus }))} value={form.status}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">Progress</option>
                </select>
              </label>
            </div>

            <AssigneeSelectorField
              label="Assignees (optional)"
              members={members.filter((m) => m.user.id !== userId)}
              onOpenPicker={onOpenCollaboratorModal}
              onToggleRemove={(memberId) =>
                onChangeForm((currentForm) => ({
                  ...currentForm,
                  collaboratorIds: currentForm.collaboratorIds.filter((id) => id !== memberId),
                }))
              }
              selectedIds={form.collaboratorIds}
              subtext="Added members will be able to view and manage this private task."
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
            <button
              className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
              onClick={handleAttemptClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Plus aria-hidden="true" size={16} />}
              Save
            </button>
          </div>
        </form>
      </AnimatedModal>

      <MemberPickerModal
        isOpen={isCollaboratorModalOpen}
        members={members.filter((m) => m.user.id !== userId)}
        onChange={(ids) => onChangeForm((currentForm) => ({ ...currentForm, collaboratorIds: ids }))}
        onClose={onCloseCollaboratorModal}
        selectedIds={form.collaboratorIds}
        title="Add Assignees"
      />

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceClose}
      />
    </>
  );
}
