import { CalendarDays, Loader2, Megaphone, Pencil, Pin, Plus, Radio, Search, Send, Trash2, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent, TouchEvent } from "react";
import toast from "react-hot-toast";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementSocketTicket,
  getAnnouncementSocketUrl,
  listAnnouncements,
  markAnnouncementDeadlineDone,
  notifyAnnouncement,
  updateAnnouncement,
  updateAnnouncementPin,
} from "@/features/announcement/api";
import type { AnnouncementSocketEvent, AnnouncementUpdatePayload, TeamyAnnouncement } from "@/features/announcement/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { RichTextEditor } from "@/shared/components/RichText";
import { isRichTextEmpty } from "@/shared/richText";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { Skeleton } from "@/shared/components/Skeleton";
import { parseApiDateTime, toLocalDate } from "@/shared/dateTime";
import { useScrollLock } from "@/shared/useScrollLock";
import { UnsavedChangesModal } from "@/shared/components/UnsavedChangesModal";
import { FeedAnnouncementItem, PinnedAnnouncementCard } from "../components/AnnouncementCard";
import { AnnouncementDetailModal } from "../components/AnnouncementDetailModal";
export { AnnouncementDetailModal };

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const listItemClass = "gpu-panel rounded-lg border border-white/8 bg-white/2 backdrop-blur-2xl";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-colors placeholder:text-[#8e9192] focus:border-white";

const primaryButton = `${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50`;

type AnnouncementFormState = {
  title: string;
  body: string;
  isPinned: boolean;
  deadlineDate: string;
  isRecordOnly: boolean;
};

type AnnouncementMenuState = {
  announcement: TeamyAnnouncement;
  x: number;
  y: number;
};

const initialForm: AnnouncementFormState = {
  title: "",
  body: "",
  isPinned: false,
  deadlineDate: "",
  isRecordOnly: false,
};

function sortAnnouncements(announcements: TeamyAnnouncement[]) {
  return [...announcements].sort((a, b) => {
    if (a.deadline_date && b.deadline_date) {
      return toLocalDate(b.deadline_date).getTime() - toLocalDate(a.deadline_date).getTime() || parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at);
    }
    if (a.deadline_date) {
      return -1;
    }
    if (b.deadline_date) {
      return 1;
    }
    return parseApiDateTime(b.created_at) - parseApiDateTime(a.created_at);
  });
}

function upsertAnnouncement(announcements: TeamyAnnouncement[], nextAnnouncement: TeamyAnnouncement, currentUserId: string) {
  const existing = announcements.find((announcement) => announcement.id === nextAnnouncement.id);
  const mergedAnnouncement = {
    ...nextAnnouncement,
    is_read: existing?.is_read ?? (nextAnnouncement.created_by.id === currentUserId || nextAnnouncement.is_read),
  };
  const nextList = existing ? announcements.map((announcement) => (announcement.id === nextAnnouncement.id ? mergedAnnouncement : announcement)) : [mergedAnnouncement, ...announcements];
  return sortAnnouncements(nextList);
}

function getToastErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isPastAnnouncement(announcement: TeamyAnnouncement) {
  if (announcement.is_record_only) {
    return true;
  }
  if (!announcement.deadline_date) {
    return false;
  }
  const deadlineDate = toLocalDate(announcement.deadline_date);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return deadlineDate < startOfToday;
}

function AnnouncementPage() {
  const { project, user } = useProjectContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<TeamyAnnouncement[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementFormState>(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<TeamyAnnouncement | null>(null);
  const [pendingPinId, setPendingPinId] = useState("");
  const [pendingDoneId, setPendingDoneId] = useState("");
  const [announcementMenu, setAnnouncementMenu] = useState<AnnouncementMenuState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamyAnnouncement | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  useScrollLock(isModalOpen || selectedAnnouncement !== null || deleteTarget !== null);

  useEffect(() => {
    let isMounted = true;

    listAnnouncements(project.id)
      .then((nextAnnouncements) => {
        if (isMounted) {
          setAnnouncements(sortAnnouncements(nextAnnouncements));
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load announcements.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [project.id]);

  useEffect(() => {
    function handleNewAnnouncementShortcut() {
      setIsModalOpen(true);
    }

    window.addEventListener("teamy:new-announcement", handleNewAnnouncementShortcut);
    return () => window.removeEventListener("teamy:new-announcement", handleNewAnnouncementShortcut);
  }, []);

  useEffect(() => {
    if (location.state?.openNewAnnouncement) {
      const openTimer = window.setTimeout(() => setIsModalOpen(true), 0);
      navigate(location.pathname, { replace: true, state: {} });
      return () => window.clearTimeout(openTimer);
    }
    return undefined;
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let isActive = true;

    const connectTimer = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      void getAnnouncementSocketTicket(project.id)
        .then((ticket) => {
          if (!isActive) {
            return;
          }

          socket = new WebSocket(getAnnouncementSocketUrl(project.id, ticket));
          socket.addEventListener("message", (event) => {
            const data = JSON.parse(event.data as string) as AnnouncementSocketEvent;
            if (data.event === "announcement.created" || data.event === "announcement.updated") {
              if (data.announcement.project_id === project.id) {
                setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, data.announcement, user.id));
                setSelectedAnnouncement((currentSelection) => (currentSelection?.id === data.announcement.id ? { ...data.announcement, is_read: currentSelection.is_read } : currentSelection));
              }
              return;
            }
            if (data.event === "announcement.deleted") {
              setAnnouncements((currentAnnouncements) => currentAnnouncements.filter((announcement) => announcement.id !== data.announcement_id));
              setSelectedAnnouncement((currentSelection) => (currentSelection?.id === data.announcement_id ? null : currentSelection));
              setDeleteTarget((currentTarget) => (currentTarget?.id === data.announcement_id ? null : currentTarget));
              setEditingAnnouncementId((currentEditingId) => (currentEditingId === data.announcement_id ? "" : currentEditingId));
            }
          });
        })
        .catch(() => undefined);
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(connectTimer);
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        socket.close();
      }
    };
  }, [project.id, user.id]);

  useEffect(() => {
    function handleDocumentClick() {
      setAnnouncementMenu(null);
    }

    window.addEventListener("click", handleDocumentClick);
    return () => window.removeEventListener("click", handleDocumentClick);
  }, []);

  const filteredAnnouncements = useMemo(
    () => announcements.filter((announcement) => announcement.title.toLowerCase().includes(query.toLowerCase()) || announcement.body.toLowerCase().includes(query.toLowerCase())),
    [announcements, query],
  );

  const pinnedAnnouncements = useMemo(() => filteredAnnouncements.filter((announcement) => announcement.is_pinned && !isPastAnnouncement(announcement)), [filteredAnnouncements]);
  const recentAnnouncements = useMemo(() => filteredAnnouncements.filter((announcement) => !announcement.is_pinned && !isPastAnnouncement(announcement)), [filteredAnnouncements]);
  const pastAnnouncements = useMemo(() => filteredAnnouncements.filter((announcement) => isPastAnnouncement(announcement)), [filteredAnnouncements]);

  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const isFormDirty = Boolean(form.title.trim() || form.body.trim());

  function handleAttemptCloseCreateModal() {
    if (isFormDirty) {
      setShowUnsavedConfirm(true);
    } else {
      closeCreateModal();
    }
  }

  function closeCreateModal() {
    setShowUnsavedConfirm(false);
    setIsModalOpen(false);
    setForm(initialForm);
  }

  function canManageAnnouncement(announcement: TeamyAnnouncement) {
    return project.role === "leader" || project.role === "co_leader" || announcement.created_by.id === user.id;
  }

  function openContextMenu(event: MouseEvent<HTMLElement>, announcement: TeamyAnnouncement) {
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

  function handleAnnouncementTouchStart(event: TouchEvent<HTMLElement>, announcement: TeamyAnnouncement) {
    if (!canManageAnnouncement(announcement)) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      const menuWidth = 176;
      const menuHeight = 96;
      const x = Math.min(touch.clientX, window.innerWidth - menuWidth - 12);
      const y = Math.min(touch.clientY, window.innerHeight - menuHeight - 12);
      setAnnouncementMenu({ announcement, x, y });
    }, 500);
  }

  function handleAnnouncementTouchEnd() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleAnnouncementContextMenu(event: MouseEvent<HTMLElement>, announcement: TeamyAnnouncement) {
    openContextMenu(event, announcement);
  }

  function handleAnnouncementKeyDown(event: KeyboardEvent<HTMLButtonElement>, announcement: TeamyAnnouncement) {
    if (event.key === "ContextMenu") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      openContextMenu(
        {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          preventDefault: () => undefined,
          stopPropagation: () => undefined,
        } as unknown as MouseEvent<HTMLElement>,
        announcement,
      );
    }
  }

  function consumeLongPressOpen() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return true;
    }
    return false;
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

  async function handleCreateAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRichTextEmpty(form.body)) {
      toast.error("Add an announcement message.");
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const created = await createAnnouncement(project.id, {
        title: form.title,
        body: form.body,
        is_pinned: form.isRecordOnly ? false : form.isPinned,
        deadline_date: form.deadlineDate || null,
        is_record_only: form.isRecordOnly,
      });

      setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, created, user.id));
      closeCreateModal();
      toast.success(form.isRecordOnly ? "Announcement record saved." : "Announcement posted.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not post the announcement.");
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handlePinToggle(announcement: TeamyAnnouncement) {
    setPendingPinId(announcement.id);
    setError("");
    try {
      const updated = await updateAnnouncementPin(project.id, announcement.id, !announcement.is_pinned);
      setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, updated, user.id));
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? { ...updated, is_read: currentSelection.is_read } : currentSelection));
      toast.success(updated.is_pinned ? "Announcement pinned." : "Announcement unpinned.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not update pin status.");
      setError(message);
      toast.error(message);
    } finally {
      setPendingPinId("");
    }
  }

  async function openAnnouncement(announcement: TeamyAnnouncement) {
    setSelectedAnnouncement(announcement);
    if (announcement.is_read) {
      return;
    }

    try {
      const updated = await getAnnouncement(project.id, announcement.id);
      setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, updated, user.id));
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? updated : currentSelection));
    } catch {
      // Keep optimistic or previous read state on failure.
    }
  }

  async function handleUpdateAnnouncement(announcementId: string, payload: AnnouncementUpdatePayload) {
    try {
      const updated = await updateAnnouncement(project.id, announcementId, payload);
      setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, updated, user.id));
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? { ...updated, is_read: currentSelection.is_read } : currentSelection));
      toast.success("Announcement updated.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not update the announcement.");
      toast.error(message);
      throw caughtError;
    }
  }

  async function handleDeleteAnnouncement() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAnnouncement(project.id, deleteTarget.id);
      setAnnouncements((currentAnnouncements) => currentAnnouncements.filter((announcement) => announcement.id !== deleteTarget.id));
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === deleteTarget.id ? null : currentSelection));
      setDeleteTarget(null);
      toast.success("Announcement deleted.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not delete the announcement."));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleNotifyAnnouncement(announcementId: string) {
    try {
      await notifyAnnouncement(project.id, announcementId);
      toast.success("Broadcast notification sent to project members.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not send broadcast notification."));
      throw caughtError;
    }
  }

  async function handleMarkAnnouncementDone(announcementId: string) {
    setPendingDoneId(announcementId);
    try {
      const updated = await markAnnouncementDeadlineDone(project.id, announcementId);
      setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, updated, user.id));
      setSelectedAnnouncement((currentSelection) => (currentSelection?.id === updated.id ? { ...updated, is_read: currentSelection.is_read } : currentSelection));
      toast.success("Announcement marked as done.");
    } catch (caughtError) {
      toast.error(getToastErrorMessage(caughtError, "Could not mark announcement as done."));
    } finally {
      setPendingDoneId("");
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Announcements</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">Project updates, priorities, and announcements for {project.name}.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className={primaryButton}
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            Post Announcement
          </button>
        </div>
      </header>

      <div className="relative w-full max-w-md">
        <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8e9192]" size={18} />
        <input className={`${inputClass} rounded-full pl-10`} onChange={(event) => setQuery(event.target.value)} placeholder="Search announcements..." value={query} />
      </div>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <Skeleton className="h-6 w-48 rounded" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Skeleton className="min-h-72 rounded-xl" />
              <Skeleton className="hidden min-h-72 rounded-xl lg:block" />
            </div>
          </section>
          <section className="flex flex-col gap-4">
            <Skeleton className="h-6 w-48 rounded" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </section>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
          <Megaphone aria-hidden="true" className="text-[#8e9192]" size={34} />
          <h2 className="m-0 text-2xl font-bold text-white">No announcements found</h2>
          <p className="m-0 max-w-md text-[#8e9192]">{query ? "Try a different search." : "Post the first project-wide update for this team."}</p>
        </div>
      ) : (
        <>
          {pinnedAnnouncements.length > 0 ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Pin aria-hidden="true" size={18} className="text-[#a855f7]" />
                <h2 className={`${labelFont} m-0 text-[#e4e1e7] uppercase`}>Pinned Priorities</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {pinnedAnnouncements.map((announcement) => (
                  <PinnedAnnouncementCard
                    announcement={announcement}
                    isPinPending={pendingPinId === announcement.id}
                    key={announcement.id}
                    onContextMenu={(event) => handleAnnouncementContextMenu(event, announcement)}
                    onKeyDown={(event) => handleAnnouncementKeyDown(event, announcement)}
                    onOpen={() => {
                      if (!consumeLongPressOpen()) {
                        void openAnnouncement(announcement);
                      }
                    }}
                    onPinToggle={() => void handlePinToggle(announcement)}
                    onTouchCancel={handleAnnouncementTouchEnd}
                    onTouchEnd={handleAnnouncementTouchEnd}
                    onTouchMove={handleAnnouncementTouchEnd}
                    onTouchStart={(event) => handleAnnouncementTouchStart(event, announcement)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Radio aria-hidden="true" size={18} className="text-[#a855f7]" />
              <h2 className={`${labelFont} m-0 text-[#e4e1e7] uppercase`}>Recent Broadcasts</h2>
            </div>
            <div className="flex flex-col gap-3">
              {recentAnnouncements.length === 0 ? (
                <div className={`${listItemClass} px-5 py-6 text-[#8e9192]`}>No recent broadcasts outside pinned priorities.</div>
              ) : (
                recentAnnouncements.map((announcement) => (
                  <FeedAnnouncementItem
                    announcement={announcement}
                    isPinPending={pendingPinId === announcement.id}
                    key={announcement.id}
                    onContextMenu={(event) => handleAnnouncementContextMenu(event, announcement)}
                    onKeyDown={(event) => handleAnnouncementKeyDown(event, announcement)}
                    onOpen={() => {
                      if (!consumeLongPressOpen()) {
                        void openAnnouncement(announcement);
                      }
                    }}
                    onPinToggle={() => void handlePinToggle(announcement)}
                    onTouchCancel={handleAnnouncementTouchEnd}
                    onTouchEnd={handleAnnouncementTouchEnd}
                    onTouchMove={handleAnnouncementTouchEnd}
                    onTouchStart={(event) => handleAnnouncementTouchStart(event, announcement)}
                  />
                ))
              )}
            </div>
          </section>

          {pastAnnouncements.length > 0 ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <CalendarDays aria-hidden="true" size={18} className="text-[#a855f7]" />
                <h2 className={`${labelFont} m-0 text-[#e4e1e7] uppercase`}>Past Records</h2>
              </div>
              <div className="flex flex-col gap-3">
                {pastAnnouncements.map((announcement) => (
                  <FeedAnnouncementItem
                    announcement={announcement}
                    canPin={!announcement.is_record_only}
                    isPinPending={pendingPinId === announcement.id}
                    key={announcement.id}
                    onContextMenu={(event) => handleAnnouncementContextMenu(event, announcement)}
                    onKeyDown={(event) => handleAnnouncementKeyDown(event, announcement)}
                    onOpen={() => {
                      if (!consumeLongPressOpen()) {
                        void openAnnouncement(announcement);
                      }
                    }}
                    onPinToggle={() => void handlePinToggle(announcement)}
                    onTouchCancel={handleAnnouncementTouchEnd}
                    onTouchEnd={handleAnnouncementTouchEnd}
                    onTouchMove={handleAnnouncementTouchEnd}
                    onTouchStart={(event) => handleAnnouncementTouchStart(event, announcement)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <AnimatePresence>
        {isModalOpen ? (
          <AnimatedModal className="z-70" contentClassName="w-full max-w-2xl" onBackdropClick={handleAttemptCloseCreateModal}>
            <form className={`${panelClass} flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden`} onSubmit={handleCreateAnnouncement}>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
                <div>
                  <h2 className="m-0 text-xl font-bold text-white">Post Announcement</h2>
                  <p className="m-0 mt-1 text-sm text-[#8e9192]">Share a formatted update with everyone in {project.name}.</p>
                </div>
                <button
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
                  onClick={handleAttemptCloseCreateModal}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>

              <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                <label className="flex flex-col gap-2">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
                  <input className={inputClass} maxLength={200} onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))} required value={form.title} />
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
                    <Pin aria-hidden="true" size={16} />
                    Pin announcement
                  </span>
                </label>

                {project.role === "leader" || project.role === "co_leader" ? (
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
                  <input className={inputClass} onChange={(event) => setForm((currentForm) => ({ ...currentForm, deadlineDate: event.target.value }))} type="date" value={form.deadlineDate} />
                </label>
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
                <button
                  className={`${labelFont} cursor-pointer rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`}
                  onClick={handleAttemptCloseCreateModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-white px-4 py-3 text-[#09090b] uppercase hover:bg-[#c6c6c6] disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Send aria-hidden="true" size={16} />}
                  Post
                </button>
              </div>
            </form>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>

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
                  <h2 className="m-0 text-xl font-bold text-white">Delete Announcement</h2>
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
            isPinPending={pendingPinId === selectedAnnouncement.id}
            isMarkingDone={pendingDoneId === selectedAnnouncement.id}
            key={`${selectedAnnouncement.id}:${selectedAnnouncement.updated_at}:${editingAnnouncementId === selectedAnnouncement.id ? "edit" : "view"}`}
            onClose={() => {
              setSelectedAnnouncement(null);
              setEditingAnnouncementId("");
            }}
            onEdit={handleUpdateAnnouncement}
            onDelete={startDeleteAnnouncement}
            onMarkDone={handleMarkAnnouncementDone}
            onNotify={handleNotifyAnnouncement}
            onPinToggle={() => void handlePinToggle(selectedAnnouncement)}
            startEditing={editingAnnouncementId === selectedAnnouncement.id}
          />
        ) : null}
      </AnimatePresence>

      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        onCancel={() => setShowUnsavedConfirm(false)}
        onConfirmDiscard={closeCreateModal}
      />
    </section>
  );
}

export default AnnouncementPage;
