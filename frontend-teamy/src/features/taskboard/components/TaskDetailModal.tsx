import { useState } from "react";
import type { FormEvent } from "react";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import type {
  AssigneeStatus,
  ProjectMember,
  TaskLinkedFileCreatePayload,
  TaskStatus,
  TaskUpdatePayload,
  TeamyTask,
} from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { AssigneeSelectorField, MemberPickerModal } from "@/shared/components";
import { RichTextContent, RichTextEditor } from "@/shared/components/RichText";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { TaskViewerPresence, type TaskViewer } from "@/shared/components/TaskViewerPresence";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import { toLocalDate } from "@/shared/dateTime";
import { getUserDisplayName } from "@/shared/userDisplay";


const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-colors placeholder:text-[#8e9192] focus:border-white";

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "Progress",
  for_review: "Review",
  done: "Done",
};

const assigneeStatusLabels = {
  todo: "Todo",
  in_progress: "Progress",
  ready_for_review: "Ready",
};

const statusToneClasses: Record<TaskStatus, string> = {
  todo: "border-[#8e9192]/40 bg-[#8e9192]/15 text-[#d7d9da]",
  in_progress: "border-[#8fd3ff]/40 bg-[#8fd3ff]/15 text-[#bfe6ff]",
  for_review: "border-[#d8c5ff]/40 bg-[#d8c5ff]/15 text-[#e8dcff]",
  done: "border-[#9be7b0]/40 bg-[#9be7b0]/15 text-[#c7f5d0]",
};

const assigneeStatusToneClasses: Record<AssigneeStatus, string> = {
  todo: "text-[#d7d9da]",
  in_progress: "text-[#bfe6ff]",
  ready_for_review: "text-[#c7f5d0]",
};

function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(dueDate));
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`${labelFont} rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${statusToneClasses[status]}`}>{statusLabels[status]}</span>;
}

export function TaskDetailModal({
  isLeader,
  members,
  onClose,
  onDeleteTask,
  onLinkFile,
  onNavigateToFile,
  onReview,
  onSubmitForReview,
  onStatusUpdate,
  onUpdateTask,
  pendingAction,
  task,
  userId,
  viewers,
}: {
  isLeader: boolean;
  members: ProjectMember[];
  onClose: () => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onLinkFile: (taskId: string, payload: TaskLinkedFileCreatePayload) => Promise<void>;
  onNavigateToFile: (fileId: string) => void;
  onReview: (taskId: string, action: "approve" | "request_changes", remarks?: string) => Promise<void>;
  onSubmitForReview: (taskId: string) => Promise<void>;
  onStatusUpdate: (taskId: string, status: "in_progress" | "ready_for_review") => Promise<void>;
  onUpdateTask: (taskId: string, payload: TaskUpdatePayload) => Promise<void>;
  pendingAction: string;
  task: TeamyTask;
  userId: string;
  viewers?: TaskViewer[];
}) {
  const initialEditForm = {
    title: task.title,
    description: task.description || "",
    assigneeIds: task.assignees.map((assignee) => assignee.user.id),
    startDate: task.start_date || "",
    dueDate: task.due_date || "",
  };
  const currentAssignee = task.assignees.find((assignee) => assignee.user.id === userId);
  const allAssignedMembersReady = task.assignees.length > 0 && task.assignees.every((assignee) => assignee.status === "ready_for_review");
  const canManageTask = isLeader || task.created_by.id === userId;
  const canLinkResource = canManageTask || Boolean(currentAssignee);
  const canUpdateStatus = Boolean(currentAssignee) && task.status !== "done" && task.status !== "for_review";
  const canSubmitForReview = Boolean(currentAssignee) && task.status === "in_progress" && allAssignedMembersReady;
  const canReview = isLeader && task.status === "for_review";
  const [remarks, setRemarks] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditPickerOpen, setIsEditPickerOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [linkForm, setLinkForm] = useState<{ mode: "doc" | "link"; title: string; url: string }>({ mode: "doc", title: "", url: "" });
  const [localError, setLocalError] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const isFormDirty = Boolean(
    isEditing &&
      (editForm.title.trim() !== initialEditForm.title ||
        editForm.description.trim() !== initialEditForm.description ||
        editForm.startDate !== initialEditForm.startDate ||
        editForm.dueDate !== initialEditForm.dueDate ||
        editForm.assigneeIds.slice().sort().join(",") !== initialEditForm.assigneeIds.slice().sort().join(",") ||
        linkForm.title.trim() ||
        linkForm.url.trim())
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

  function toggleEditAssignee(memberId: string) {
    setEditForm((currentForm) => ({
      ...currentForm,
      assigneeIds: currentForm.assigneeIds.includes(memberId) ? currentForm.assigneeIds.filter((assigneeId) => assigneeId !== memberId) : [...currentForm.assigneeIds, memberId],
    }));
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editForm.assigneeIds.length === 0) {
      const message = "Choose at least one assignee.";
      setLocalError(message);
      toast.error(message);
      return;
    }

    setLocalError("");
    try {
      await onUpdateTask(task.id, {
        title: editForm.title,
        description: editForm.description || null,
        assignee_ids: editForm.assigneeIds,
        start_date: editForm.startDate || null,
        due_date: editForm.dueDate || null,
      });
      setIsEditing(false);
    } catch {
      const message = "Could not save the task changes.";
      setLocalError(message);
    }
  }

  async function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");
    try {
      await onLinkFile(task.id, linkForm.mode === "doc" ? { mode: "doc", title: linkForm.title || `${task.title} Doc` } : { mode: "link", title: linkForm.title || task.title, url: linkForm.url });
      setLinkForm({ mode: "doc", title: "", url: "" });
    } catch {
      const message = "Could not link the resource.";
      setLocalError(message);
    }
  }

  async function handleConfirmedDelete() {
    setLocalError("");
    try {
      await onDeleteTask(task.id);
      setIsConfirmingDelete(false);
    } catch {
      setLocalError("Could not delete the task.");
    }
  }

  return (
    <AnimatedModal className="z-70" contentClassName="w-full max-w-2xl" onBackdropClick={handleAttemptClose}>
      <div className={`${panelClass} flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden`}>
        {/* Fixed Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10] px-6 py-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${labelFont} rounded border border-white/10 px-2 py-1 text-[#c4c7c8] uppercase`}>{task.id.slice(0, 8)}</span>
              <StatusBadge status={task.status} />
              <TaskViewerPresence currentUserId={userId} viewers={viewers} />
            </div>
            <h2 className="m-0 text-xl font-bold text-white">{task.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManageTask ? (
              <>
                <button
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
                  onClick={() => setIsEditing((current) => !current)}
                  type="button"
                  title="Edit task"
                >
                  <Pencil aria-hidden="true" size={17} />
                </button>
                <button
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                  onClick={() => setIsConfirmingDelete(true)}
                  type="button"
                  title="Delete task"
                  disabled={pendingAction === `${task.id}:delete`}
                >
                  {pendingAction === `${task.id}:delete` ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : <Trash2 aria-hidden="true" size={17} />}
                </button>
              </>
            ) : null}
            <button className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={handleAttemptClose} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {localError ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab]">{localError}</div> : null}

          {isEditing ? (
            <div className="flex flex-col gap-6">
              <form className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#09090b]/40 p-4" onSubmit={handleEditSubmit}>
                <label className="flex flex-col gap-2">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
                  <input className={inputClass} maxLength={200} onChange={(event) => setEditForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={editForm.title} />
                </label>
                <div className="flex flex-col gap-2">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Description</span>
                  <RichTextEditor
                    minHeightClass="min-h-28"
                    onChange={(description) => setEditForm((currentForm) => ({ ...currentForm, description }))}
                    placeholder="Add details, paste formatted notes, or include a table..."
                    value={editForm.description}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Start Date</span>
                    <input className={inputClass} onChange={(event) => setEditForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))} type="date" value={editForm.startDate} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Due Date</span>
                    <input className={inputClass} onChange={(event) => setEditForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))} type="date" value={editForm.dueDate} />
                  </label>
                </div>
                <AssigneeSelectorField
                  label="Assignees"
                  members={members}
                  onOpenPicker={() => setIsEditPickerOpen(true)}
                  onToggleRemove={(memberId) => toggleEditAssignee(memberId)}
                  selectedIds={editForm.assigneeIds}
                  subtext="Added members will be responsible for completing this task."
                />

                <MemberPickerModal
                  isOpen={isEditPickerOpen}
                  members={members}
                  onChange={(ids) => setEditForm((current) => ({ ...current, assigneeIds: ids }))}
                  onClose={() => setIsEditPickerOpen(false)}
                  selectedIds={editForm.assigneeIds}
                  title="Manage Assignees"
                />
                <div className="mt-2 flex justify-end gap-3 border-t border-white/10 pt-4">
                  <button
                    className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
                    onClick={() => setIsEditing(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                    disabled={pendingAction === `${task.id}:edit`}
                    type="submit"
                  >
                    {pendingAction === `${task.id}:edit` ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}
                    Save
                  </button>
                </div>
              </form>

              {canLinkResource ? (
                <form className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#09090b]/40 p-4" onSubmit={handleLinkSubmit}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`${labelFont} m-0 text-[#c4c7c8] uppercase`}>Add Resource</h3>
                    <div className="flex rounded-lg border border-white/10 bg-[#09090b] p-1">
                      <button
                        className={`${labelFont} rounded-md px-3 py-2 uppercase ${linkForm.mode === "doc" ? "bg-white/10 text-white" : "text-[#8e9192] hover:text-white"}`}
                        onClick={() => setLinkForm((currentForm) => ({ ...currentForm, mode: "doc" }))}
                        type="button"
                      >
                        Teamy Doc
                      </button>
                      <button
                        className={`${labelFont} rounded-md px-3 py-2 uppercase ${linkForm.mode === "link" ? "bg-white/10 text-white" : "text-[#8e9192] hover:text-white"}`}
                        onClick={() => setLinkForm((currentForm) => ({ ...currentForm, mode: "link" }))}
                        type="button"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
                      <input
                        className={inputClass}
                        maxLength={240}
                        onChange={(event) => setLinkForm((currentForm) => ({ ...currentForm, title: event.target.value }))}
                        placeholder={linkForm.mode === "doc" ? `${task.title} Doc` : task.title}
                        value={linkForm.title}
                      />
                    </label>
                    {linkForm.mode === "link" ? (
                      <label className="flex flex-col gap-2">
                        <span className={`${labelFont} text-[#c4c7c8] uppercase`}>URL</span>
                        <input
                          className={inputClass}
                          maxLength={2048}
                          onChange={(event) => setLinkForm((currentForm) => ({ ...currentForm, url: event.target.value }))}
                          placeholder="https://..."
                          required
                          type="url"
                          value={linkForm.url}
                        />
                      </label>
                    ) : null}
                  </div>
                  <button
                    className={`${labelFont} inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60`}
                    disabled={pendingAction === `${task.id}:link-file`}
                    type="submit"
                  >
                    {pendingAction === `${task.id}:link-file` ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Plus aria-hidden="true" size={16} />}
                    Add Resource
                  </button>
                </form>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {task.description ? <RichTextContent className="rounded-lg border border-white/10 bg-[#09090b]/50 p-4 text-sm leading-relaxed text-[#c4c7c8]" value={task.description} /> : null}

              {task.review_remarks ? (
                <div className="rounded-lg border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 p-4 text-sm leading-relaxed whitespace-pre-wrap text-[#ffdad6]">
                  <span className={`${labelFont} mb-2 block text-[#ffb4ab] uppercase`}>Leader Remarks</span>
                  {task.review_remarks}
                </div>
              ) : null}

              <div className="flex items-center gap-2 text-sm text-[#8e9192]">
                <Calendar aria-hidden="true" size={16} />
                <span className="font-medium">Starts:</span> {formatDueDate(task.start_date)}
                <span className="mx-2 opacity-50">|</span>
                <span className="font-medium">Due:</span> {formatDueDate(task.due_date)}
              </div>

              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className={`${labelFont} mb-2 text-[#c4c7c8] uppercase`}>Assignees</legend>
                <div className="flex flex-col gap-2">
                  {task.assignees.map((assignee) => (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/3 px-4 py-3" key={assignee.id}>
                      <span className="flex min-w-0 items-center gap-3">
                        <UserAvatarImage className="size-8 overflow-hidden rounded-full bg-white/10 text-xs font-bold text-white" user={assignee.user} />
                        <span className="min-w-0 truncate text-sm font-medium text-white">{getUserDisplayName(assignee.user)}</span>
                      </span>
                      <span className={`${labelFont} shrink-0 uppercase ${assigneeStatusToneClasses[assignee.status]}`}>{assigneeStatusLabels[assignee.status]}</span>
                    </div>
                  ))}
                </div>
              </fieldset>

              {task.linked_files.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h3 className={`${labelFont} m-0 text-[#c4c7c8] uppercase`}>Related Files</h3>
                  <div className="flex flex-col gap-2">
                    {task.linked_files.map((file) =>
                      file.kind === "link" && file.url ? (
                        <a
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/3 px-4 py-3 text-white transition-colors hover:bg-white/6"
                          href={file.url}
                          key={file.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <ExternalLink aria-hidden="true" className="shrink-0 text-[#c4c7c8]" size={18} />
                            <span className="truncate text-sm font-medium">{file.title}</span>
                          </span>
                          <span className={`${labelFont} shrink-0 text-[#8e9192] uppercase`}>Open</span>
                        </a>
                      ) : (
                        <button
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/3 px-4 py-3 text-left text-white transition-colors hover:bg-white/6"
                          key={file.id}
                          onClick={() => onNavigateToFile(file.id)}
                          type="button"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <FileText aria-hidden="true" className="shrink-0 text-[#c4c7c8]" size={18} />
                            <span className="truncate text-sm font-medium">{file.title}</span>
                          </span>
                          <span className={`${labelFont} shrink-0 text-[#8e9192] uppercase`}>Edit</span>
                        </button>
                      ),
                    )}
                  </div>
                </section>
              ) : null}

              {canReview && !isEditing ? (
                <label className="flex flex-col gap-2 border-t border-white/10 pt-4">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Remarks for requested changes</span>
                  <textarea className={`${inputClass} min-h-24 resize-y`} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional feedback for the assignees..." value={remarks} />
                </label>
              ) : null}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        {!isEditing && (canUpdateStatus || canSubmitForReview || canReview) ? (
          <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-[#0e0e10] px-6 py-4">
            {canUpdateStatus ? (
              <>
                {currentAssignee?.status === "todo" ? (
                  <button
                    className={`${labelFont} inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60`}
                    disabled={pendingAction === `${task.id}:in_progress`}
                    onClick={() => void onStatusUpdate(task.id, "in_progress")}
                    type="button"
                  >
                    <Send aria-hidden="true" size={16} />
                    Start Progress
                  </button>
                ) : null}
                {currentAssignee?.status !== "ready_for_review" ? (
                  <button
                    className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                    disabled={pendingAction === `${task.id}:ready_for_review`}
                    onClick={() => void onStatusUpdate(task.id, "ready_for_review")}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" size={16} />
                    Ready for Review
                  </button>
                ) : null}
              </>
            ) : null}

            {canSubmitForReview ? (
              <button
                className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={pendingAction === `${task.id}:submit-review`}
                onClick={() => void onSubmitForReview(task.id)}
                type="button"
              >
                <Send aria-hidden="true" size={16} />
                Submit for Review
              </button>
            ) : null}

            {canReview ? (
              <>
                <button
                  className={`${labelFont} inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab] uppercase transition-colors hover:bg-[#ffb4ab]/20 disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={pendingAction === `${task.id}:request_changes`}
                  onClick={() => void onReview(task.id, "request_changes", remarks)}
                  type="button"
                >
                  <RefreshCcw aria-hidden="true" size={16} />
                  Changes
                </button>
                <button
                  className={`${labelFont} inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[#b9f6ca] px-4 py-3 text-[#003814] uppercase transition-colors hover:bg-[#94d5a4] disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={pendingAction === `${task.id}:approve`}
                  onClick={() => void onReview(task.id, "approve")}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" size={16} />
                  Approve
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <AnimatePresence>
          {isConfirmingDelete ? (
            <AnimatedModal className="z-80" contentClassName={`${panelClass} flex w-full max-w-md flex-col gap-5 p-6`}>
              <div>
                <div>
                  <h3 className="m-0 text-xl font-bold text-white">Delete Task</h3>
                  <p className="m-0 mt-2 text-sm leading-relaxed text-[#c4c7c8]">
                    Delete <span className="font-semibold text-white">{task.title}</span>? This removes the task, its assignees, and linked task references.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className={`${labelFont} rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
                    onClick={() => setIsConfirmingDelete(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={`${labelFont} inline-flex items-center gap-2 rounded-lg border-0 bg-[#ffb4ab] px-4 py-3 text-[#3b0906] uppercase hover:bg-[#ffdad6] disabled:opacity-60`}
                    disabled={pendingAction === `${task.id}:delete`}
                    onClick={() => void handleConfirmedDelete()}
                    type="button"
                  >
                    {pendingAction === `${task.id}:delete` ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
                    Delete
                  </button>
                </div>
              </div>
            </AnimatedModal>
          ) : null}
        </AnimatePresence>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceClose}
      />
    </AnimatedModal>
  );
}
