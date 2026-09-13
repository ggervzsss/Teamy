import type { FormEvent } from "react";
import { useState } from "react";
import { CheckSquare, Loader2, LockKeyhole, Megaphone, X } from "lucide-react";
import toast from "react-hot-toast";
import type { TeamPresenceMember } from "@/features/teammanagement/api";
import { createAnnouncement } from "@/features/announcement/api";
import { createTask } from "@/features/taskboard/api";
import type { PersonalTaskKind, TaskStatus } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { AssigneeSelectorField } from "@/shared/components/AssigneeSelectorField";
import { MemberPickerModal } from "@/shared/components/MemberPickerModal";
import { RichTextEditor } from "@/shared/components/RichText";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import { isRichTextEmpty } from "@/shared/richText";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const modalInputClass =
  "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30 disabled:cursor-not-allowed disabled:opacity-60";

export type GlobalCreateKind = "task" | "private-task" | "announcement";

type GlobalTaskFormState = {
  title: string;
  description: string;
  assigneeIds: string[];
  startDate: string;
  dueDate: string;
  initialStatus: Extract<TaskStatus, "todo" | "in_progress" | "done">;
};

type GlobalPrivateTaskFormState = {
  title: string;
  description: string;
  dueDate: string;
  initialStatus: Extract<TaskStatus, "todo" | "in_progress">;
  personalKind: PersonalTaskKind;
};

type GlobalAnnouncementFormState = {
  title: string;
  body: string;
  isPinned: boolean;
  deadlineDate: string;
  isRecordOnly: boolean;
};

const initialGlobalTaskForm: GlobalTaskFormState = {
  title: "",
  description: "",
  assigneeIds: [],
  startDate: "",
  dueDate: "",
  initialStatus: "todo",
};

const initialGlobalPrivateTaskForm: GlobalPrivateTaskFormState = {
  title: "",
  description: "",
  dueDate: "",
  initialStatus: "todo",
  personalKind: "task",
};

const initialGlobalAnnouncementForm: GlobalAnnouncementFormState = {
  title: "",
  body: "",
  isPinned: false,
  deadlineDate: "",
  isRecordOnly: false,
};

const personalKindLabels: Record<PersonalTaskKind, string> = {
  task: "Task",
  ticket: "Ticket",
};

export function GlobalTaskCreateModal({ isLeader, members, onClose, projectId }: { isLeader: boolean; members: TeamPresenceMember[]; onClose: () => void; projectId: string }) {
  const [form, setForm] = useState<GlobalTaskFormState>(initialGlobalTaskForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const isFormDirty = Boolean(form.title.trim() || form.description.trim() || form.assigneeIds.length > 0);

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

  function toggleAssignee(userId: string) {
    setForm((currentForm) => ({
      ...currentForm,
      assigneeIds: currentForm.assigneeIds.includes(userId) ? currentForm.assigneeIds.filter((assigneeId) => assigneeId !== userId) : [...currentForm.assigneeIds, userId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    if (form.assigneeIds.length === 0) {
      const message = "Choose at least one assignee.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await createTask(projectId, {
        title: form.title,
        description: form.description || undefined,
        assignee_ids: form.assigneeIds,
        start_date: form.startDate || undefined,
        due_date: form.dueDate || undefined,
        initial_status: form.initialStatus,
        is_record_only: form.initialStatus === "done",
      });
      toast.success(form.initialStatus === "done" ? "Task record saved." : "Task created.");
      onClose();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not create the task.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AnimatedModal
        className="z-120"
        contentClassName="w-full max-w-2xl"
        onBackdropClick={handleAttemptClose}
      >
        <form className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e10] shadow-2xl" onSubmit={handleSubmit}>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
            <div>
              <h2 className="m-0 text-xl font-bold text-white">New Task</h2>
              <p className="m-0 mt-1 text-sm text-[#8e9192]">Create and assign a task without leaving this screen.</p>
            </div>
            <button className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={handleAttemptClose} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
            {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

            <label className="flex flex-col gap-2">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
              <input className={modalInputClass} maxLength={200} onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={form.title} />
            </label>

            <div className="flex flex-col gap-2">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Description</span>
              <RichTextEditor
                onChange={(description) => setForm((currentForm) => ({ ...currentForm, description }))}
                placeholder="Add details, paste formatted notes, or include a table..."
                value={form.description}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start Date</span>
                <input className={modalInputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))} type="date" value={form.startDate} />
              </label>
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Due Date</span>
                <input className={modalInputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))} type="date" value={form.dueDate} />
              </label>
              <label className="flex flex-col gap-2">
                <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start In</span>
                <select
                  className={modalInputClass}
                  onChange={(event) => setForm((currentForm) => ({ ...currentForm, initialStatus: event.target.value as GlobalTaskFormState["initialStatus"] }))}
                  value={form.initialStatus}
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">Progress</option>
                  {isLeader ? <option value="done">Done</option> : null}
                </select>
              </label>
            </div>

            <AssigneeSelectorField
              label="Assignees"
              members={members as unknown as import("@/features/taskboard/api").ProjectMember[]}
              onOpenPicker={() => setIsPickerOpen(true)}
              onToggleRemove={(userId) => toggleAssignee(userId)}
              selectedIds={form.assigneeIds}
              subtext="Added members will be responsible for completing this task."
            />

            <MemberPickerModal
              isOpen={isPickerOpen}
              members={members as unknown as import("@/features/taskboard/api").ProjectMember[]}
              onChange={(ids) => setForm((currentForm) => ({ ...currentForm, assigneeIds: ids }))}
              onClose={() => setIsPickerOpen(false)}
              selectedIds={form.assigneeIds}
              title="Add Assignees"
            />
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
            <button className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={handleAttemptClose} type="button">
              Cancel
            </button>
            <button
              className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <CheckSquare aria-hidden="true" size={16} />}
              Create Task
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

export function GlobalPrivateTaskCreateModal({ onClose, projectId, userId }: { onClose: () => void; projectId: string; userId: string }) {
  const [form, setForm] = useState<GlobalPrivateTaskFormState>(initialGlobalPrivateTaskForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await createTask(projectId, {
        title: form.title,
        description: form.description || undefined,
        assignee_ids: [userId],
        due_date: form.dueDate || undefined,
        initial_status: form.initialStatus,
        is_private: true,
        personal_kind: form.personalKind,
      });
      toast.success(`${personalKindLabels[form.personalKind]} saved.`);
      onClose();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not save your private task.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatedModal
      className="z-120"
      contentClassName="w-full max-w-xl"
      onBackdropClick={onClose}
    >
      <form className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e10] shadow-2xl" onSubmit={handleSubmit}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
          <div>
            <h2 className="m-0 text-2xl font-bold text-white">New Private Task</h2>
            <p className="m-0 mt-1 text-sm text-[#8e9192]">Only you can see this item in Teamy.</p>
          </div>
          <button className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

          <label className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
            <input className={modalInputClass} maxLength={200} onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={form.title} />
          </label>

          <div className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Notes</span>
            <RichTextEditor
              onChange={(description) => setForm((currentForm) => ({ ...currentForm, description }))}
              placeholder="Add notes, paste formatted text, or include a table..."
              value={form.description}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Due Date</span>
              <input className={modalInputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))} type="date" value={form.dueDate} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start In</span>
              <select
                className={modalInputClass}
                onChange={(event) => setForm((currentForm) => ({ ...currentForm, initialStatus: event.target.value as GlobalPrivateTaskFormState["initialStatus"] }))}
                value={form.initialStatus}
              >
                <option value="todo">Todo</option>
                <option value="in_progress">Progress</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
          <button className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <LockKeyhole aria-hidden="true" size={16} />}
            Save
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export function GlobalAnnouncementCreateModal({ isLeader, onClose, projectId, projectName }: { isLeader: boolean; onClose: () => void; projectId: string; projectName: string }) {
  const [form, setForm] = useState<GlobalAnnouncementFormState>(initialGlobalAnnouncementForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    if (isRichTextEmpty(form.body)) {
      toast.error("Add an announcement message.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await createAnnouncement(projectId, {
        title: form.title,
        body: form.body,
        is_pinned: form.isRecordOnly ? false : form.isPinned,
        deadline_date: form.deadlineDate || null,
        is_record_only: form.isRecordOnly,
      });
      toast.success(form.isRecordOnly ? "Announcement record saved." : "Announcement posted.");
      onClose();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not post the announcement.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatedModal
      className="z-120"
      contentClassName="w-full max-w-2xl"
      onBackdropClick={onClose}
    >
      <form className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e0e10] shadow-2xl" onSubmit={handleSubmit}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
          <div>
            <h2 className="m-0 text-2xl font-bold text-white">Post Announcement</h2>
            <p className="m-0 mt-1 text-sm text-[#8e9192]">Share an update with everyone in {projectName}.</p>
          </div>
          <button className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

          <label className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
            <input className={modalInputClass} maxLength={200} onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={form.title} />
          </label>

          <div className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Message</span>
            <RichTextEditor
              minHeightClass="min-h-40"
              onChange={(body) => setForm((currentForm) => ({ ...currentForm, body }))}
              placeholder="Write an update, paste formatted text, or include a table..."
              required
              value={form.body}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/3 p-3 text-white transition-colors hover:bg-white/6">
            <input checked={form.isPinned} disabled={form.isRecordOnly} onChange={(event) => setForm((currentForm) => ({ ...currentForm, isPinned: event.target.checked }))} type="checkbox" />
            <span className="flex items-center gap-2 text-sm font-medium">
              <Megaphone aria-hidden="true" size={16} />
              Pin as priority
            </span>
          </label>

          {isLeader ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/3 p-3 text-white transition-colors hover:bg-white/6">
              <input
                checked={form.isRecordOnly}
                onChange={(event) => setForm((currentForm) => ({ ...currentForm, isRecordOnly: event.target.checked, isPinned: event.target.checked ? false : currentForm.isPinned }))}
                type="checkbox"
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">Record-only announcement</span>
                <span className="text-xs text-[#8e9192]">Save under Past Records without sending a new broadcast notification.</span>
              </span>
            </label>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Date</span>
            <input className={modalInputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, deadlineDate: event.target.value }))} type="date" value={form.deadlineDate} />
          </label>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
          <button className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Megaphone aria-hidden="true" size={16} />}
            Post
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}
