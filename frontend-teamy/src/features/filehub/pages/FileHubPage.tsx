import { ClipboardList, LinkIcon, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent, KeyboardEvent, MouseEvent, TouchEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { createFileResource, deleteFileResource, listFileResources, updateFileResource } from "@/features/filehub/api";
import type { FileResourceSummary } from "@/features/filehub/api";
import { linkExistingTaskFile, listTasks } from "@/features/taskboard/api";
import type { TeamyTask } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { useScrollLock } from "@/shared/useScrollLock";
import { FileHubTable, ResourceFilterDropdown } from "../components/FileHubTable";
import type { Filter, FilterOption } from "../components/FileHubTable";
import { CreateFileModal } from "../components/CreateFileModal";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";

type ResourceMenuState = {
  file: FileResourceSummary;
  x: number;
  y: number;
};

const filterOptions: FilterOption[] = [
  { id: "all", label: "All Files" },
  { id: "doc", label: "Teamy Doc" },
  { id: "link", label: "Link" },
];

function getToastErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function canLinkResourceToTask(task: TeamyTask, userId: string, projectRole: "leader" | "co_leader" | "member") {
  return projectRole === "leader" || projectRole === "co_leader" || task.created_by.id === userId || task.assignees.some((assignee) => assignee.user.id === userId);
}

function FileHubPage() {
  const { project, user } = useProjectContext();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileResourceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modal, setModal] = useState<"link" | "doc" | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [resourceMenu, setResourceMenu] = useState<ResourceMenuState | null>(null);
  const [editingFile, setEditingFile] = useState<FileResourceSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileResourceSummary | null>(null);
  const [linkTarget, setLinkTarget] = useState<FileResourceSummary | null>(null);
  const [tasks, setTasks] = useState<TeamyTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLinkingTask, setIsLinkingTask] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  useScrollLock(modal !== null || editingFile !== null || deleteTarget !== null || linkTarget !== null);

  useEffect(() => {
    let isMounted = true;
    listFileResources(project.id)
      .then((nextFiles) => {
        if (isMounted) {
          setFiles(nextFiles);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load Resources.");
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
    if (!resourceMenu) {
      return undefined;
    }
    function closeMenu() {
      setResourceMenu(null);
    }
    document.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [resourceMenu]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return files.filter((file) => {
      const matchesFilter = filter === "all" || file.kind === filter;
      const taskText = file.linked_tasks.map((task) => task.title).join(" ");
      const matchesQuery = !normalizedQuery || `${file.title} ${file.created_by.full_name} ${file.created_by.username || ""} ${taskText}`.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [files, filter, query]);

  function closeModal() {
    setModal(null);
    setTitle("");
    setUrl("");
  }

  function openResourceMenu(file: FileResourceSummary, x: number, y: number) {
    const menuWidth = 176;
    const menuHeight = 144;
    setResourceMenu({
      file,
      x: Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12)),
      y: Math.max(12, Math.min(y, window.innerHeight - menuHeight - 12)),
    });
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleResourceContextMenu(event: MouseEvent<HTMLButtonElement>, file: FileResourceSummary) {
    event.preventDefault();
    openResourceMenu(file, event.clientX, event.clientY);
  }

  function handleResourceTouchStart(event: TouchEvent<HTMLButtonElement>, file: FileResourceSummary) {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      openResourceMenu(file, touch.clientX, touch.clientY);
    }, 550);
  }

  function handleResourceTouchEnd() {
    clearLongPressTimer();
  }

  function handleResourceKeyDown(event: KeyboardEvent<HTMLButtonElement>, file: FileResourceSummary) {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    openResourceMenu(file, rect.left + 32, rect.top + 32);
  }

  function startEdit(file: FileResourceSummary) {
    setResourceMenu(null);
    setEditingFile(file);
    setEditTitle(file.title);
    setEditUrl(file.url ?? "");
  }

  function closeEditModal() {
    setEditingFile(null);
    setEditTitle("");
    setEditUrl("");
  }

  function startDelete(file: FileResourceSummary) {
    setResourceMenu(null);
    setDeleteTarget(file);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
  }

  async function startLinkToTask(file: FileResourceSummary) {
    setResourceMenu(null);
    setLinkTarget(file);
    setSelectedTaskId("");
    setTaskQuery("");
    setIsLoadingTasks(true);
    setError("");
    try {
      const availableTasks = await listTasks(project.id);
      setTasks(availableTasks);
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not load tasks.");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  function closeLinkModal() {
    setLinkTarget(null);
    setSelectedTaskId("");
    setTaskQuery("");
  }

  function openFile(file: FileResourceSummary) {
    if (file.kind === "doc") {
      navigate(`/projects/${project.slug}/file-hub/${file.id}`);
    } else if (file.url) {
      window.open(file.url, "_blank", "noreferrer");
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || isCreating) {
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const payload = modal === "doc" ? { kind: "doc" as const, title } : { kind: "link" as const, title, url };
      const created = await createFileResource(project.id, payload);
      setFiles((currentFiles) => [created, ...currentFiles]);
      closeModal();
      if (modal === "doc") {
        toast.success("Doc created.");
        navigate(`/projects/${project.slug}/file-hub/${created.id}`);
      } else {
        toast.success("Link added.");
      }
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not create resource.");
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFile || isUpdating) {
      return;
    }
    setIsUpdating(true);
    setError("");
    try {
      const updated = await updateFileResource(project.id, editingFile.id, {
        title: editTitle,
        url: editingFile.kind === "link" ? editUrl : undefined,
      });
      setFiles((currentFiles) => currentFiles.map((file) => (file.id === updated.id ? updated : file)));
      closeEditModal();
      toast.success("Resource updated.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not update the resource.");
      setError(message);
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) {
      return;
    }
    setIsDeleting(true);
    setError("");
    try {
      await deleteFileResource(project.id, deleteTarget.id);
      setFiles((currentFiles) => currentFiles.filter((file) => file.id !== deleteTarget.id));
      if (editingFile?.id === deleteTarget.id) {
        closeEditModal();
      }
      closeDeleteModal();
      toast.success("Resource deleted.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not delete the resource.");
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleLinkToTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!linkTarget || !selectedTaskId || isLinkingTask) {
      return;
    }
    setIsLinkingTask(true);
    setError("");
    try {
      const task = await linkExistingTaskFile(project.id, selectedTaskId, linkTarget.id);
      setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === task.id ? task : currentTask)));
      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          file.id === linkTarget.id && !file.linked_tasks.some((linkedTask) => linkedTask.id === task.id)
            ? { ...file, linked_tasks: [{ id: task.id, title: task.title, status: task.status }, ...file.linked_tasks] }
            : file,
        ),
      );
      closeLinkModal();
      toast.success("Resource linked to task.");
    } catch (caughtError) {
      const message = getToastErrorMessage(caughtError, "Could not link the resource to this task.");
      setError(message);
      toast.error(message);
    } finally {
      setIsLinkingTask(false);
    }
  }

  const linkableTasks = useMemo(() => {
    if (!linkTarget) {
      return [];
    }
    const linkedTaskIds = new Set(linkTarget.linked_tasks.map((task) => task.id));
    const normalizedQuery = taskQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (linkedTaskIds.has(task.id)) {
        return false;
      }
      if (!canLinkResourceToTask(task, user.id, project.role)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return `${task.title} ${task.status}`.toLowerCase().includes(normalizedQuery);
    });
  }, [linkTarget, project.role, taskQuery, tasks, user.id]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Resources</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">Teamy Docs, shared links, and task-connected resources for this project.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className={`${labelFont} inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-2.5 text-xs font-bold text-white uppercase transition-all duration-200 hover:bg-[#a855f7]/20 active:scale-95`}
            onClick={() => setModal("link")}
            type="button"
          >
            <LinkIcon aria-hidden="true" size={16} />
            Add Link
          </button>
          <button
            className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase`}
            onClick={() => setModal("doc")}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Teamy Doc
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search aria-hidden="true" className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8e9192]" size={18} />
          <input className={`${inputClass} rounded-full pl-10 focus:border-[#a855f7]/50`} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources..." value={query} />
        </div>
        <ResourceFilterDropdown onChange={setFilter} options={filterOptions} value={filter} />
      </div>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      <FileHubTable
        filteredFiles={filteredFiles}
        isLoading={isLoading}
        longPressTriggeredRef={longPressTriggeredRef}
        onOpenFile={openFile}
        onResourceContextMenu={handleResourceContextMenu}
        onResourceKeyDown={handleResourceKeyDown}
        onResourceTouchEnd={handleResourceTouchEnd}
        onResourceTouchStart={handleResourceTouchStart}
      />

      {resourceMenu && typeof document !== "undefined"
        ? createPortal(
            <div className={`${panelClass} fixed z-80 w-44 overflow-hidden p-1`} onClick={(event) => event.stopPropagation()} style={{ left: resourceMenu.x, top: resourceMenu.y }}>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => startEdit(resourceMenu.file)} type="button">
                <Pencil aria-hidden="true" size={16} />
                Edit
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => void startLinkToTask(resourceMenu.file)} type="button">
                <ClipboardList aria-hidden="true" size={16} />
                Link to Task
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#ffb4ab] hover:bg-[#ffb4ab]/10" onClick={() => startDelete(resourceMenu.file)} type="button">
                <Trash2 aria-hidden="true" size={16} />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}

      <CreateFileModal
        isCreating={isCreating}
        modal={modal}
        onClose={closeModal}
        onSubmit={handleCreate}
        setTitle={setTitle}
        setUrl={setUrl}
        title={title}
        url={url}
      />

      <AnimatePresence>
        {editingFile ? (
          <AnimatedModal className="z-70" contentClassName="w-full max-w-lg" onBackdropClick={closeEditModal}>
            <form className={`${panelClass} flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden`} onSubmit={handleUpdate}>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
                <div>
                  <h2 className="m-0 text-xl font-bold text-white">Edit Resource</h2>
                  <p className="m-0 mt-1 text-sm text-[#8e9192]">{editingFile.kind === "doc" ? "Rename this Teamy Doc." : "Update this shared link."}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="grid size-9 place-items-center rounded-full border border-white/10 bg-transparent text-[#ffb4ab] hover:bg-[#ffb4ab]/10"
                    onClick={() => startDelete(editingFile)}
                    type="button"
                    title="Delete resource"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                  <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={closeEditModal} type="button">
                    <X aria-hidden="true" size={18} />
                  </button>
                </div>
              </div>
              <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                <label className="flex flex-col gap-2">
                  <span className={`${labelFont} text-[#c4c7c8] uppercase`}>Title</span>
                  <input className={inputClass} maxLength={240} onChange={(event) => setEditTitle(event.target.value)} required value={editTitle} />
                </label>
                {editingFile.kind === "link" ? (
                  <label className="flex flex-col gap-2">
                    <span className={`${labelFont} text-[#c4c7c8] uppercase`}>URL</span>
                    <input className={inputClass} maxLength={2048} onChange={(event) => setEditUrl(event.target.value)} placeholder="https://..." required type="url" value={editUrl} />
                  </label>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
                <button className={`${labelFont} rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={closeEditModal} type="button">
                  Cancel
                </button>
                <button
                  className={`${labelFont} inline-flex items-center gap-2 rounded-lg border-0 bg-white px-4 py-3 text-[#09090b] uppercase hover:bg-[#c6c6c6] disabled:opacity-60`}
                  disabled={isUpdating}
                  type="submit"
                >
                  {isUpdating ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Pencil aria-hidden="true" size={16} />}
                  Save
                </button>
              </div>
            </form>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget ? (
          <AnimatedModal className="z-80" contentClassName="w-full max-w-md" onBackdropClick={closeDeleteModal}>
            <div className={`${panelClass} flex w-full max-w-md flex-col gap-5 p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-xl font-bold text-white">Delete Resource</h2>
                  <p className="m-0 mt-2 text-sm leading-relaxed text-[#c4c7c8]">
                    Delete <span className="font-semibold text-white">{deleteTarget.title}</span>? This removes it from Resources and any linked tasks.
                  </p>
                </div>
                <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={closeDeleteModal} type="button">
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="flex justify-end gap-3">
                <button className={`${labelFont} rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={closeDeleteModal} type="button">
                  Cancel
                </button>
                <button
                  className={`${labelFont} inline-flex items-center gap-2 rounded-lg border-0 bg-[#ffb4ab] px-4 py-3 text-[#3b0906] uppercase hover:bg-[#ffdad6] disabled:opacity-60`}
                  disabled={isDeleting}
                  onClick={handleDelete}
                  type="button"
                >
                  {isDeleting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
                  Delete
                </button>
              </div>
            </div>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {linkTarget ? (
          <AnimatedModal className="z-70" contentClassName="w-full max-w-xl" onBackdropClick={closeLinkModal}>
            <form className={`${panelClass} flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden`} onSubmit={handleLinkToTask}>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0e0e10]/95 px-6 py-5 backdrop-blur-xl">
                <div>
                  <h2 className="m-0 text-xl font-bold text-white">Link to Task</h2>
                  <p className="m-0 mt-2 text-sm leading-relaxed text-[#c4c7c8]">
                    Connect <span className="font-semibold text-white">{linkTarget.title}</span> to an existing task.
                  </p>
                </div>
                <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white" onClick={closeLinkModal} type="button">
                  <X aria-hidden="true" size={18} />
                </button>
              </div>

              <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                <div className="relative">
                  <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8e9192]" size={18} />
                  <input className={`${inputClass} pl-10`} onChange={(event) => setTaskQuery(event.target.value)} placeholder="Search tasks..." value={taskQuery} />
                </div>

                <div className="custom-scrollbar max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
                  {isLoadingTasks ? (
                    <div className="flex items-center gap-3 px-4 py-5 text-[#c4c7c8]">
                      <Loader2 aria-hidden="true" className="animate-spin" size={18} />
                      Loading tasks...
                    </div>
                  ) : linkableTasks.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-[#8e9192]">
                      {tasks.length === linkTarget.linked_tasks.length ? "This resource is already linked to every task." : "No available tasks found."}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {linkableTasks.map((task) => (
                        <label className="flex cursor-pointer items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 hover:bg-white/5" key={task.id}>
                          <input checked={selectedTaskId === task.id} name="taskId" onChange={() => setSelectedTaskId(task.id)} type="radio" value={task.id} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-white">{task.title}</span>
                            <span className={`${labelFont} mt-1 block text-[#8e9192] uppercase`}>{task.status.replaceAll("_", " ")}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 bg-[#0e0e10]/95 px-6 py-4 backdrop-blur-xl">
                <button className={`${labelFont} rounded-lg border border-white/10 bg-transparent px-4 py-3 text-white uppercase hover:bg-white/5`} onClick={closeLinkModal} type="button">
                  Cancel
                </button>
                <button
                  className={`${labelFont} inline-flex items-center gap-2 rounded-lg border-0 bg-white px-4 py-3 text-[#09090b] uppercase hover:bg-[#c6c6c6] disabled:opacity-60`}
                  disabled={!selectedTaskId || isLoadingTasks || isLinkingTask}
                  type="submit"
                >
                  {isLinkingTask ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <ClipboardList aria-hidden="true" size={16} />}
                  Link
                </button>
              </div>
            </form>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default FileHubPage;
