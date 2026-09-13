import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  PlayCircle,
  Send,
  Ticket,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import type { MyTaskStatusUpdate, PersonalTaskKind, ProjectMember, TaskStatus, TeamyTask } from "@/features/taskboard/api";
import { deleteTask, updateTask } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { MemberPickerModal } from "@/shared/components";
import { RichTextContent } from "@/shared/components/RichText";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { toLocalDate } from "@/shared/dateTime";
import { getUserDisplayName } from "@/shared/userDisplay";
import { parseTicketItems } from "../utils/ticketHelpers";
import { TicketChecklist } from "./TicketChecklist";
import { StatusBadge } from "@/features/taskboard/components/TaskDetailModal";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import { TaskViewerPresence, type TaskViewer } from "@/shared/components/TaskViewerPresence";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "Progress",
  for_review: "Review",
  done: "Done",
};

const personalKindLabels: Record<PersonalTaskKind, string> = {
  task: "Task",
  ticket: "Ticket",
};

const personalKindIcons = {
  task: ClipboardList,
  ticket: Ticket,
};

function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(dueDate));
}

function UserAvatar({ className = "", user }: { className?: string; user: TeamyTask["created_by"] }) {
  return (
    <UserAvatarImage
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-xs font-bold text-white ${className}`}
      title={getUserDisplayName(user)}
      user={user}
    />
  );
}

function TicketChecklistSection({
  activeViewers,
  isArchived,
  onActivityChange,
  onDirtyChange,
  onStatusUpdate,
  onTaskUpdate,
  projectId,
  task,
  userId,
}: {
  activeViewers?: TaskViewer[];
  isArchived: boolean;
  onActivityChange?: (activity: string | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onStatusUpdate: (task: TeamyTask, status: MyTaskStatusUpdate) => Promise<void>;
  onTaskUpdate: (task: TeamyTask) => void;
  projectId: string;
  task: TeamyTask;
  userId: string;
}) {
  const items = parseTicketItems(task.description) ?? [];

  async function handleUpdateDescription(newDesc: string) {
    const parsed = parseTicketItems(newDesc);
    const allChecked = Boolean(parsed && parsed.length > 0 && parsed.every((item) => item.checked));

    const updated = await updateTask(projectId, task.id, { description: newDesc });
    onTaskUpdate(updated);

    if (allChecked && task.status !== "done") {
      void onStatusUpdate(updated, "done");
    } else if (!allChecked && task.status === "done") {
      void onStatusUpdate(updated, "in_progress");
    }
  }

  function handleUpdateImages(newImages: import("@/features/taskboard/api").TaskImage[]) {
    onTaskUpdate({ ...task, images: newImages });
  }

  return (
    <TicketChecklist
      activeViewers={activeViewers}
      canEdit={!isArchived}
      canUpload={!isArchived}
      currentUserId={userId}
      items={items}
      onActivityChange={onActivityChange}
      onDirtyChange={onDirtyChange}
      onUpdateDescription={handleUpdateDescription}
      onUpdateImages={handleUpdateImages}
      projectId={projectId}
      task={task}
    />
  );
}

export function MyTaskDetailModal({
  isArchived,
  members,
  onActivityChange,
  onClose,
  onNavigateToFile,
  onOpenTaskBoard,
  onStatusUpdate,
  onSubmitForReview,
  pendingAction,
  task,
  onTaskUpdate,
  onTaskDelete,
  userId,
  viewers,
}: {
  isArchived: boolean;
  members: ProjectMember[];
  onActivityChange?: (activity: string | null) => void;
  onClose: () => void;
  onNavigateToFile: (fileId: string) => void;
  onOpenTaskBoard: (taskId?: string) => void;
  onStatusUpdate: (task: TeamyTask, status: MyTaskStatusUpdate) => Promise<void>;
  onSubmitForReview: (task: TeamyTask) => Promise<void>;
  onTaskUpdate: (task: TeamyTask) => void;
  onTaskDelete?: (taskId: string) => void;
  pendingAction: string;
  task: TeamyTask;
  userId: string;
  viewers?: TaskViewer[];
}) {
  const currentAssignee = task.assignees.find((a) => a.user.id === userId);
  const allAssignedMembersReady = task.assignees.length > 0 && task.assignees.every((a) => a.status === "ready_for_review");
  const canUpdateShared = Boolean(currentAssignee) && !task.is_private && task.status !== "done" && task.status !== "for_review" && !isArchived;
  const canSubmitForReview = Boolean(currentAssignee) && !task.is_private && task.status === "in_progress" && allAssignedMembersReady && !isArchived;
  const canUpdatePrivate = task.is_private && !isArchived;
  const canEdit = !isArchived;
  const Icon = task.is_private ? personalKindIcons[task.personal_kind] : ClipboardList;
  const isOwner = task.created_by.id === userId;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [isSubtaskDirty, setIsSubtaskDirty] = useState(false);

  const isFormDirty = Boolean((isEditingTitle && titleText.trim() !== task.title) || isSubtaskDirty);

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

  async function handleSaveTitle() {
    const trimmed = titleText.trim();
    if (!trimmed || trimmed === task.title || isSavingTitle) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    try {
      const updated = await updateTask(task.project_id, task.id, { title: trimmed });
      onTaskUpdate(updated);
      toast.success("Ticket renamed.");
      setIsEditingTitle(false);
    } catch {
      toast.error("Could not rename ticket.");
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function handleDeleteTicket() {
    setIsDeletingTicket(true);
    try {
      await deleteTask(task.project_id, task.id);
      toast.success("Ticket deleted.");
      onClose();
      onTaskDelete?.(task.id);
    } catch {
      toast.error("Could not delete ticket.");
      setIsDeletingTicket(false);
    }
  }

  const isTicketTask = task.is_private && task.personal_kind === "ticket";
  const hasTicketItems = (parseTicketItems(task.description)?.length ?? 0) > 0;
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const collaborators = task.assignees.filter((a) => a.user.id !== task.created_by.id);

  return (
    <AnimatedModal className="z-70" contentClassName="w-full max-w-xl" onBackdropClick={handleAttemptClose}>
      <div className={`${panelClass} flex max-h-[calc(100dvh-1rem)] w-full max-w-xl min-w-0 flex-col overflow-hidden sm:max-h-[85vh]`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={`${labelFont} inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[#c4c7c8] uppercase`}>
              <Icon aria-hidden="true" size={13} />
              {task.is_private ? personalKindLabels[task.personal_kind] : "Assigned"}
            </span>
            <StatusBadge status={task.status} />
            <TaskViewerPresence currentUserId={userId} viewers={viewers} />
          </div>
          <button className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={handleAttemptClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
          <div>
            {isEditingTitle ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSaveTitle();
                    } else if (e.key === "Escape") {
                      setIsEditingTitle(false);
                      setTitleText(task.title);
                    }
                  }}
                  className="min-w-0 flex-[1_1_12rem] rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-lg font-bold text-white outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveTitle()}
                  disabled={!titleText.trim() || isSavingTitle}
                  className={`${labelFont} teamy-btn-primary cursor-pointer rounded-lg px-3 py-2 text-xs font-bold uppercase disabled:opacity-50`}
                >
                  {isSavingTitle ? <Loader2 className="animate-spin" size={14} /> : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setTitleText(task.title);
                  }}
                  className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white uppercase hover:bg-white/5`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="group flex min-w-0 items-start gap-2">
                <h2 className={`m-0 min-w-0 text-xl leading-snug font-bold wrap-anywhere text-white ${task.status === "done" ? "text-[#8e9192] line-through decoration-white/20" : ""}`}>
                  {task.title}
                </h2>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="cursor-pointer rounded p-1 text-[#8e9192] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 hover:text-white"
                    title="Rename ticket"
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {isTicketTask ? (
            <TicketChecklistSection
              activeViewers={viewers}
              isArchived={isArchived}
              onActivityChange={onActivityChange}
              onDirtyChange={setIsSubtaskDirty}
              projectId={task.project_id}
              task={task}
              userId={userId}
              onTaskUpdate={onTaskUpdate}
              onStatusUpdate={onStatusUpdate}
            />
          ) : (
            task.description ? <RichTextContent className="mt-1 text-sm leading-relaxed text-[#8e9192]" value={task.description} /> : null
          )}

          {task.is_private && (
            <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`${labelFont} m-0 text-[#8e9192] uppercase`}>Collaborators</h3>
                {isOwner && !isArchived && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCollaborator(true)}
                    className={`${labelFont} inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1.5 text-xs font-bold text-white uppercase transition-all duration-200 hover:bg-[#a855f7]/20 active:scale-95`}
                  >
                    <UserPlus aria-hidden="true" size={13} />
                    <span>{collaborators.length > 0 ? "Manage" : "Add"}</span>
                  </button>
                )}
              </div>

              <MemberPickerModal
                isOpen={isAddingCollaborator}
                members={members.filter((m) => m.user.id !== task.created_by.id)}
                onChange={async (nextIds) => {
                  try {
                    const updated = await updateTask(task.project_id, task.id, {
                      assignee_ids: [task.created_by.id, ...nextIds],
                    });
                    onTaskUpdate(updated);
                  } catch {
                    toast.error("Could not update collaborators.");
                    throw new Error("Update failed");
                  }
                }}
                onClose={() => setIsAddingCollaborator(false)}
                selectedIds={task.assignees.map((a) => a.user.id).filter((id) => id !== task.created_by.id)}
                title="Manage Assignees"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-1 pl-1.5 pr-2.5 text-xs text-white"
                  title={`${getUserDisplayName(task.created_by)} (Owner)`}
                >
                  <UserAvatar className="size-4" user={task.created_by} />
                  <span className="max-w-28 truncate">{getUserDisplayName(task.created_by)}</span>
                  <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#c4c7c8] uppercase">
                    Owner
                  </span>
                </div>

                {collaborators.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-1.5 pr-2.5 text-xs text-white"
                  >
                    <UserAvatar className="size-4" user={assignee.user} />
                    <span className="max-w-28 truncate">{getUserDisplayName(assignee.user)}</span>
                    {isOwner && !isArchived ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const nextIds = task.assignees
                            .map((a) => a.user.id)
                            .filter((id) => id !== task.created_by.id && id !== assignee.user.id);
                          try {
                            const updated = await updateTask(task.project_id, task.id, {
                              assignee_ids: [task.created_by.id, ...nextIds],
                            });
                            onTaskUpdate(updated);
                            toast.success("Collaborator removed.", { id: "collaborator-update" });
                          } catch {
                            toast.error("Could not remove collaborator.");
                          }
                        }}
                        className="grid size-4 cursor-pointer place-items-center rounded-full text-[#8e9192] hover:bg-white/15 hover:text-white"
                        title={`Remove ${getUserDisplayName(assignee.user)}`}
                      >
                        <X size={11} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className={`${labelFont} text-[#8e9192] uppercase`}>Due date</dt>
              <dd className="m-0 inline-flex items-center gap-1.5 text-[#c4c7c8]">
                <Calendar aria-hidden="true" size={14} />
                {formatDueDate(task.due_date)}
              </dd>
            </div>
            {!task.is_private ? (
              <div className="flex flex-col gap-1">
                <dt className={`${labelFont} text-[#8e9192] uppercase`}>Created by</dt>
                <dd className="m-0 text-[#c4c7c8]">{getUserDisplayName(task.created_by)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className={`${labelFont} m-0 text-[#8e9192] uppercase`}>Linked Resources</h3>
              {task.linked_files.length > 0 ? <span className={`${labelFont} rounded border border-white/10 px-2 py-1 text-[#c4c7c8] uppercase`}>{task.linked_files.length}</span> : null}
            </div>
            {task.linked_files.length > 0 ? (
              <div className="flex flex-col gap-2">
                {task.linked_files.map((file) =>
                  file.kind === "link" && file.url ? (
                    <a
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-[#c4c7c8] transition-colors hover:bg-white/6 hover:text-white"
                      href={file.url}
                      key={file.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ExternalLink aria-hidden="true" className="shrink-0" size={16} />
                        <span className="truncate text-sm font-medium">{file.title}</span>
                      </span>
                      <span className={`${labelFont} shrink-0 text-[#8e9192] uppercase`}>Link</span>
                    </a>
                  ) : (
                    <button
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-[#c4c7c8] transition-colors hover:bg-white/6 hover:text-white"
                      key={file.id}
                      onClick={() => onNavigateToFile(file.id)}
                      type="button"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText aria-hidden="true" className="shrink-0" size={16} />
                        <span className="truncate text-sm font-medium">{file.title}</span>
                      </span>
                      <span className={`${labelFont} shrink-0 text-[#8e9192] uppercase`}>Teamy Doc</span>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="m-0 rounded-lg border border-dashed border-white/10 px-3 py-3 text-sm text-[#8e9192]">No linked resources for this task.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {canUpdatePrivate && !(isTicketTask && hasTicketItems)
                ? (["todo", "in_progress", "done"] as MyTaskStatusUpdate[]).map((status) => (
                    <button
                      className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        task.status === status ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-transparent text-[#c4c7c8] hover:bg-white/5 hover:text-white"
                      }`}
                      disabled={pendingAction === `${task.id}:${status}` || task.status === status}
                      key={status}
                      onClick={() => void onStatusUpdate(task, status)}
                      type="button"
                    >
                      {pendingAction === `${task.id}:${status}` ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                      ) : status === "done" ? (
                        <CheckCircle2 aria-hidden="true" size={15} />
                      ) : status === "in_progress" ? (
                        <PlayCircle aria-hidden="true" size={15} />
                      ) : (
                        <Circle aria-hidden="true" size={15} />
                      )}
                      {statusLabels[status as TaskStatus]}
                    </button>
                  ))
                : null}

              {canUpdateShared ? (
                <>
                  {currentAssignee?.status === "todo" ? (
                    <button
                      className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white uppercase hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60`}
                      disabled={pendingAction === `${task.id}:in_progress`}
                      onClick={() => void onStatusUpdate(task, "in_progress")}
                      type="button"
                    >
                      {pendingAction === `${task.id}:in_progress` ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <PlayCircle aria-hidden="true" size={15} />}
                      Start
                    </button>
                  ) : null}
                  {currentAssignee?.status !== "ready_for_review" ? (
                    <button
                      className={`${labelFont} teamy-btn-primary inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                      disabled={pendingAction === `${task.id}:ready_for_review`}
                      onClick={() => void onStatusUpdate(task, "ready_for_review")}
                      type="button"
                    >
                      {pendingAction === `${task.id}:ready_for_review` ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <CheckCircle2 aria-hidden="true" size={15} />}
                      Ready
                    </button>
                  ) : null}
                </>
              ) : null}

              {canSubmitForReview ? (
                <button
                  className={`${labelFont} teamy-btn-primary inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={pendingAction === `${task.id}:submit-review`}
                  onClick={() => void onSubmitForReview(task)}
                  type="button"
                >
                  {pendingAction === `${task.id}:submit-review` ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <Send aria-hidden="true" size={15} />}
                  Submit
                </button>
              ) : null}

              {!task.is_private ? (
                <button
                  className={`${labelFont} ml-auto inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-3.5 py-2 text-xs font-semibold text-white uppercase transition-all duration-200 hover:border-[#a855f7]/60 hover:bg-[#a855f7]/20 active:scale-95 shadow-sm`}
                  onClick={() => {
                    onClose();
                    onOpenTaskBoard(task.id);
                  }}
                  type="button"
                >
                  <ExternalLink aria-hidden="true" className="text-[#d8b4fe]" size={14} />
                  View on Board
                </button>
              ) : null}
            </div>

            {isOwner && !isArchived && (
              <div>
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[#ff8a80]/30 bg-[#ff8a80]/10 p-1.5 pl-3">
                    <span className="text-xs text-[#ff8a80] font-medium">Delete ticket?</span>
                    <button
                      type="button"
                      disabled={isDeletingTicket}
                      onClick={() => void handleDeleteTicket()}
                      className={`${labelFont} flex items-center gap-1 rounded bg-[#ff8a80] px-2.5 py-1 text-[#09090b] font-semibold uppercase hover:bg-[#ff5252] disabled:opacity-50 cursor-pointer`}
                    >
                      {isDeletingTicket ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className={`${labelFont} rounded border border-white/10 px-2 py-1 text-xs text-white uppercase hover:bg-white/10 cursor-pointer`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className={`${labelFont} inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#ff8a80]/20 bg-[#ff8a80]/5 px-3 py-2 text-[#ff8a80] uppercase hover:bg-[#ff8a80]/15 hover:border-[#ff8a80]/40 transition-colors`}
                    title="Delete this ticket"
                  >
                    <Trash2 size={14} />
                    Delete Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={handleForceClose}
      />
    </AnimatedModal>
  );
}
