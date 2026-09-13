import { Activity, ArrowRight, CalendarDays, ClipboardList, Loader2, Megaphone, Pencil, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { KeyboardEvent, MouseEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementSocketTicket,
  getAnnouncementSocketUrl,
  markAnnouncementDeadlineDone,
  notifyAnnouncement,
  updateAnnouncement,
  updateAnnouncementPin,
} from "@/features/announcement/api";
import type { AnnouncementSocketEvent, AnnouncementUpdatePayload, TeamyAnnouncement } from "@/features/announcement/api";
import { AnnouncementDetailModal } from "@/features/announcement";
import { getDashboardSummary } from "@/features/dashboard/api";
import type { DashboardSummary } from "@/features/dashboard/api";
import { getTaskSocketTicket, getTaskSocketUrl } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { Skeleton } from "@/shared/components/Skeleton";
import { DashboardAnnouncementCard } from "../components/DashboardAnnouncementsSection";
import { DeadlineItem } from "../components/DeadlineOverviewSection";
import type { DashboardDeadlineItem } from "../api";
import { DashboardTaskRow } from "../components/DashboardPendingTasksSection";
import { ActivityFeedItem } from "../components/ActivityFeedItem";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

type AnnouncementMenuState = {
  announcement: TeamyAnnouncement;
  x: number;
  y: number;
};

function sortAnnouncements(items: TeamyAnnouncement[]): TeamyAnnouncement[] {
  return [...items].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function DashboardPage() {
  const { project, user } = useProjectContext();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [announcementMenu, setAnnouncementMenu] = useState<AnnouncementMenuState | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<TeamyAnnouncement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamyAnnouncement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingPinId, setPendingPinId] = useState("");
  const [pendingDoneId, setPendingDoneId] = useState("");

  const loadDashboard = useCallback(() => {
    getDashboardSummary(project.id)
      .then((data) => {
        setSummary(data);
        setError("");
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load dashboard summary.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [project.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let taskSocket: WebSocket | null = null;
    let announcementSocket: WebSocket | null = null;
    let isActive = true;

    const connectSockets = async () => {
      try {
        const [taskTicket, announcementTicket] = await Promise.all([getTaskSocketTicket(project.id), getAnnouncementSocketTicket(project.id)]);
        if (!isActive) {
          return;
        }

        taskSocket = new WebSocket(getTaskSocketUrl(project.id, taskTicket));
        taskSocket.addEventListener("message", () => {
          void loadDashboard();
        });

        announcementSocket = new WebSocket(getAnnouncementSocketUrl(project.id, announcementTicket));
        announcementSocket.addEventListener("message", (event) => {
          const data = JSON.parse(event.data as string) as AnnouncementSocketEvent;
          if (data.event === "announcement.created" || data.event === "announcement.updated" || data.event === "announcement.deleted") {
            void loadDashboard();
          }
        });
      } catch {
        // Fall back gracefully.
      }
    };

    const timer = window.setTimeout(() => {
      void connectSockets();
    }, 150);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
      if (taskSocket && (taskSocket.readyState === WebSocket.CONNECTING || taskSocket.readyState === WebSocket.OPEN)) {
        taskSocket.close();
      }
      if (announcementSocket && (announcementSocket.readyState === WebSocket.CONNECTING || announcementSocket.readyState === WebSocket.OPEN)) {
        announcementSocket.close();
      }
    };
  }, [project.id, loadDashboard]);

  useEffect(() => {
    function handleDocumentClick() {
      setAnnouncementMenu(null);
    }

    window.addEventListener("click", handleDocumentClick);
    return () => window.removeEventListener("click", handleDocumentClick);
  }, []);

  const recentAnnouncements = useMemo(() => sortAnnouncements(summary?.recentAnnouncements || []), [summary?.recentAnnouncements]);
  const tasksForReview = summary?.tasksForReview || [];
  const myPendingTasks = summary?.pendingTasks || [];
  const deadlineItems = summary?.deadlineItems || [];
  const activityItems = summary?.activityItems || [];

  const dashboardSummary = useMemo(() => {
    if (!summary) {
      return `Tracking active progress for ${project.name}.`;
    }
    const parts: string[] = [];
    if (summary.tasksForReview.length > 0 && (project.role === "leader" || project.role === "co_leader")) {
      parts.push(`${summary.tasksForReview.length} task${summary.tasksForReview.length === 1 ? "" : "s"} awaiting your review`);
    }
    if (summary.pendingTasks.length > 0) {
      parts.push(`${summary.pendingTasks.length} pending task${summary.pendingTasks.length === 1 ? "" : "s"} assigned to you`);
    }
    if (summary.deadlineItems.length > 0) {
      parts.push(`${summary.deadlineItems.length} open item${summary.deadlineItems.length === 1 ? "" : "s"} in deadline overview`);
    }
    if (parts.length === 0) {
      return `Everything is up to date in ${project.name}.`;
    }
    return `${parts.join(", ")}.`;
  }, [project.name, project.role, summary]);

  function canManageAnnouncement(announcement: TeamyAnnouncement) {
    return project.role === "leader" || project.role === "co_leader" || announcement.created_by.id === user.id;
  }

  function handleAnnouncementContextMenu(event: MouseEvent<HTMLButtonElement>, announcement: TeamyAnnouncement) {
    if (!canManageAnnouncement(announcement)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 176;
    const menuHeight = 96;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 12);
    setAnnouncementMenu({ announcement, x, y });
  }

  function handleAnnouncementKeyDown(event: KeyboardEvent<HTMLButtonElement>, announcement: TeamyAnnouncement) {
    if (event.key === "ContextMenu") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      handleAnnouncementContextMenu(
        {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          preventDefault: () => undefined,
          stopPropagation: () => undefined,
        } as unknown as MouseEvent<HTMLButtonElement>,
        announcement,
      );
    }
  }

  async function openAnnouncement(announcement: TeamyAnnouncement) {
    setSelectedAnnouncement(announcement);
    if (announcement.is_read) {
      return;
    }
    try {
      const updated = await getAnnouncement(project.id, announcement.id);
      void loadDashboard();
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? updated : currentSelection));
    } catch {
      // Retain optimistic read state on failure.
    }
  }

  function startEditAnnouncement(announcement: TeamyAnnouncement) {
    setAnnouncementMenu(null);
    setEditingAnnouncementId(announcement.id);
    setSelectedAnnouncement(announcement);
  }

  function startDeleteAnnouncement(announcement: TeamyAnnouncement) {
    setAnnouncementMenu(null);
    setDeleteTarget(announcement);
  }

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }
    setDeleteTarget(null);
  }

  async function handleDeleteAnnouncement() {
    if (!deleteTarget || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await deleteAnnouncement(project.id, deleteTarget.id);
      void loadDashboard();
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === deleteTarget.id ? null : currentSelection));
      setEditingAnnouncementId((currentEditingId) => (currentEditingId === deleteTarget.id ? "" : currentEditingId));
      setDeleteTarget(null);
      toast.success("Announcement deleted.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not delete the announcement.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpdateAnnouncement(announcementId: string, payload: AnnouncementUpdatePayload) {
    setError("");
    try {
      const updated = await updateAnnouncement(project.id, announcementId, payload);
      void loadDashboard();
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? updated : currentSelection));
      toast.success("Announcement updated.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not edit the announcement.";
      setError(message);
      toast.error(message);
      throw caughtError;
    }
  }

  async function handlePinToggle(announcement: TeamyAnnouncement) {
    setPendingPinId(announcement.id);
    setError("");
    try {
      const updated = await updateAnnouncementPin(project.id, announcement.id, !announcement.is_pinned);
      void loadDashboard();
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? updated : currentSelection));
      toast.success(updated.is_pinned ? "Announcement pinned." : "Announcement unpinned.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not update the pin.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingPinId("");
    }
  }

  async function handleNotifyAnnouncement(announcementId: string) {
    setError("");
    try {
      await notifyAnnouncement(project.id, announcementId);
      toast.success("All members have been notified.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not send the notification.";
      setError(message);
      toast.error(message);
    }
  }

  async function handleMarkAnnouncementDone(announcementId: string) {
    setPendingDoneId(announcementId);
    setError("");
    try {
      const updated = await markAnnouncementDeadlineDone(project.id, announcementId);
      void loadDashboard();
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? updated : currentSelection));
      toast.success("Announcement marked as done.");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not mark the announcement as done.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingDoneId("");
    }
  }

  async function openDeadlineItem(item: DashboardDeadlineItem) {
    if (item.kind === "task") {
      navigate(`/projects/${project.slug}/task-board`);
      return;
    }
    const announcement = recentAnnouncements.find((currentAnnouncement) => currentAnnouncement.id === item.sourceId);
    if (announcement) {
      await openAnnouncement(announcement);
      return;
    }
    try {
      const opened = await getAnnouncement(project.id, item.sourceId);
      await openAnnouncement(opened);
    } catch {
      toast.error("Could not load announcement detail.");
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">
            Hello, <span className="bg-linear-to-r from-white via-white to-[#d8b4fe] bg-clip-text text-transparent">{user.full_name?.trim() || user.email}</span>.
          </h1>
          <p className="m-0 mt-1.5 text-sm text-[#8e9192]">{dashboardSummary}</p>
        </div>
      </header>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      {isLoading ? (
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 flex flex-col gap-4 lg:col-span-8">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </section>
          <section className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <Skeleton className="h-6 w-40" />
            <div className={`${panelClass} flex flex-col gap-4 p-6`}>
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </section>
          <section className="col-span-12 flex flex-col gap-4 lg:col-span-7">
            <Skeleton className="h-6 w-32" />
            <div className={`${panelClass} flex flex-col`}>
              <Skeleton className="h-20 w-full rounded-none border-b border-white/5" />
              <Skeleton className="h-20 w-full rounded-none border-b border-white/5" />
              <Skeleton className="h-20 w-full rounded-none border-b border-white/5" />
              <Skeleton className="h-20 w-full rounded-none" />
            </div>
          </section>
          <section className="col-span-12 flex flex-col gap-4 lg:col-span-5">
            <Skeleton className="h-6 w-40" />
            <div className={`${panelClass} relative flex flex-col gap-6 p-6`}>
              <div className="flex gap-4">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex w-full flex-col gap-2 pt-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 flex flex-col gap-4 lg:col-span-8">
            <SectionHeader actionLabel="View All" icon={Megaphone} onAction={() => navigate(`/projects/${project.slug}/announcements`)} title="Recent Announcements" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recentAnnouncements.length === 0 ? (
                <EmptyPanel className="md:col-span-2" text="No announcements yet." />
              ) : (
                recentAnnouncements.map((announcement) => (
                  <DashboardAnnouncementCard
                    announcement={announcement}
                    key={announcement.id}
                    onContextMenu={(event) => handleAnnouncementContextMenu(event, announcement)}
                    onKeyDown={(event) => handleAnnouncementKeyDown(event, announcement)}
                    onOpen={() => void openAnnouncement(announcement)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <SectionHeader actionLabel="View Timeline" icon={CalendarDays} onAction={() => navigate(`/projects/${project.slug}/timeline`)} title="Deadlines Overview" />
            <div className={`${panelClass} h-full p-6`}>
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="m-0 text-xl font-bold text-white">{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}</h3>
                <span className={`${labelFont} text-[#8e9192] uppercase`}>{deadlineItems.length} upcoming</span>
              </div>
              <div className="flex flex-col gap-4">
                {deadlineItems.length === 0 ? (
                  <p className="m-0 text-[#8e9192]">No tasks or announcements are currently open.</p>
                ) : (
                  deadlineItems.map((item) => <DeadlineItem item={item} key={item.id} onOpen={() => void openDeadlineItem(item)} />)
                )}
              </div>
            </div>
          </section>

          <section className="col-span-12 flex flex-col gap-4 lg:col-span-7">
            <SectionHeader
              actionLabel="Task Board"
              icon={ClipboardList}
              onAction={() => navigate(`/projects/${project.slug}/task-board`)}
              title={(project.role === "leader" || project.role === "co_leader") && tasksForReview.length > 0 ? "Pending Review" : "Pending Tasks"}
            />
            <div className={`${panelClass} overflow-hidden`}>
              {(project.role === "leader" || project.role === "co_leader") && tasksForReview.length > 0 ? (
                tasksForReview.slice(0, 4).map((task) => <DashboardTaskRow key={task.id} onOpen={() => navigate(`/projects/${project.slug}/task-board`)} task={task} />)
              ) : myPendingTasks.length === 0 ? (
                <EmptyPanel text="No pending assignments for you." />
              ) : (
                myPendingTasks.map((task) => <DashboardTaskRow key={task.id} onOpen={() => navigate(`/projects/${project.slug}/task-board`)} task={task} />)
              )}
            </div>
          </section>

          <section className="col-span-12 flex flex-col gap-4 lg:col-span-5">
            <SectionHeader actionLabel="View All" icon={Activity} onAction={() => navigate(`/projects/${project.slug}/activity`)} title="Recent Activity Feed" />
            <div className={`${panelClass} relative h-[#22.5rem] overflow-hidden p-6`}>
              <div className="absolute top-6 bottom-6 left-9.75 w-px bg-white/10" />
              <div className="gpu-scroll custom-scrollbar relative flex flex-col gap-6 overflow-y-auto max-h-full">
                {activityItems.length === 0 ? <p className="m-0 pl-12 text-[#8e9192]">No activity yet.</p> : activityItems.map((item) => <ActivityFeedItem item={item} key={item.id} />)}
              </div>
            </div>
          </section>
        </div>
      )}

      {announcementMenu && typeof document !== "undefined"
        ? createPortal(
            <div className={`${panelClass} fixed z-80 w-44 overflow-hidden p-1`} onClick={(event) => event.stopPropagation()} style={{ left: announcementMenu.x, top: announcementMenu.y }}>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                onClick={() => startEditAnnouncement(announcementMenu.announcement)}
                type="button"
              >
                <Pencil aria-hidden="true" size={15} />
                Edit
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                onClick={() => startDeleteAnnouncement(announcementMenu.announcement)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={15} />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
      <AnimatePresence>
        {deleteTarget ? (
          <AnimatedModal className="z-80" contentClassName="w-full max-w-md" onBackdropClick={closeDeleteModal}>
            <div className={`${panelClass} w-full max-w-md p-6`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-bold text-white">Delete Announcement</h2>
                  <p className="m-0 mt-2 text-sm leading-relaxed text-[#8e9192]">This will permanently remove "{deleteTarget.title}" from the project.</p>
                </div>
                <button
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={closeDeleteModal}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isDeleting}
                  onClick={closeDeleteModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab] uppercase transition-colors hover:bg-[#ffb4ab]/20 disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isDeleting}
                  onClick={() => void handleDeleteAnnouncement()}
                  type="button"
                >
                  {isDeleting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {selectedAnnouncement ? (
          <AnnouncementDetailModal
            announcement={selectedAnnouncement}
            canEdit={project.role === "leader" || project.role === "co_leader" || selectedAnnouncement.created_by.id === user.id}
            isMarkingDone={pendingDoneId === selectedAnnouncement.id}
            isPinPending={pendingPinId === selectedAnnouncement.id}
            key={`${selectedAnnouncement.id}:${selectedAnnouncement.updated_at}:${editingAnnouncementId === selectedAnnouncement.id ? "edit" : "view"}`}
            onClose={() => {
              setSelectedAnnouncement(null);
              setEditingAnnouncementId("");
            }}
            onDelete={startDeleteAnnouncement}
            onEdit={handleUpdateAnnouncement}
            onMarkDone={handleMarkAnnouncementDone}
            onNotify={handleNotifyAnnouncement}
            onPinToggle={() => void handlePinToggle(selectedAnnouncement)}
            startEditing={editingAnnouncementId === selectedAnnouncement.id}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function SectionHeader({ actionLabel, icon: Icon, onAction, title }: { actionLabel?: string; icon: LucideIcon; onAction?: () => void; title: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className={`${labelFont} m-0 inline-flex items-center gap-2 text-[#e4e1e7] uppercase`}>
        <Icon aria-hidden="true" className="text-[#a855f7]" size={16} />
        {title}
      </h2>
      {actionLabel && onAction ? (
        <button className={`${labelFont} group inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[#8e9192] uppercase transition-colors hover:text-white`} onClick={onAction} type="button">
          <span>{actionLabel}</span>
          <ArrowRight aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#d8b4fe]" size={14} />
        </button>
      ) : null}
    </div>
  );
}

function EmptyPanel({ className = "", text }: { className?: string; text: string }) {
  return <div className={`${panelClass} px-6 py-10 text-center text-[#8e9192] ${className}`}>{text}</div>;
}

export default DashboardPage;
