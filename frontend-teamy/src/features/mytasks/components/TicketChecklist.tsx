import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, ChevronLeft, ChevronRight, Eye, EyeOff, GripVertical, Image as ImageIcon, Loader2, Pencil, Plus, Square, Trash2, Upload, X, ZoomIn } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import { deleteTaskImage, uploadTaskImage } from "@/features/taskboard/api";
import type { TaskImage, TeamyTask } from "@/features/taskboard/api";
import type { TaskViewer } from "@/shared/components/TaskViewerPresence";
import type { TicketItem } from "../utils/ticketHelpers";
import { makeTicketItem, MAX_TICKET_CHECKLIST_ITEMS, parseTicketItems, serializeTicketItems } from "../utils/ticketHelpers";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function AutoExpandingTextarea({
  autoFocus,
  className = "",
  onChange,
  onKeyDown,
  onBlur,
  placeholder,
  value,
}: {
  autoFocus?: boolean;
  className?: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  value: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      autoFocus={autoFocus}
      className={`${className} resize-none overflow-hidden`}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

function GalleryThumbnail({
  img,
  canDelete,
  onOpen,
  onDelete,
}: {
  img: TaskImage;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5 transition-all duration-200 hover:border-[#8fd3ff]/60 hover:shadow-[0_0_16px_rgba(143,211,255,0.18)]">
      <button
        type="button"
        className="relative h-full w-full cursor-pointer overflow-hidden"
        onClick={onOpen}
        title="View image full screen"
      >
        <img
          src={img.url}
          alt="Ticket attachment"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-200 backdrop-blur-[1px] group-hover:opacity-100">
          <ZoomIn className="text-white drop-shadow-md" size={18} />
        </div>
      </button>
      {canDelete && (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 grid size-6 cursor-pointer place-items-center rounded-full border border-white/20 bg-[#09090b]/85 text-[#ff8a80] opacity-0 backdrop-blur-md transition-all duration-150 hover:bg-[#ff8a80] hover:text-black group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete image"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function ImageLightbox({
  images,
  index,
  ticketItems,
  canDelete,
  onClose,
  onNavigate,
  onDelete,
}: {
  images: TaskImage[];
  index: number;
  ticketItems: TicketItem[] | null;
  canDelete: (img: TaskImage) => boolean;
  onClose: () => void;
  onNavigate: (idx: number) => void;
  onDelete: (img: TaskImage) => void;
}) {
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const currentTicketItem = current?.ticket_item_id && ticketItems
    ? ticketItems.find((t) => t.id === current.ticket_item_id)
    : null;

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  if (!current) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-xs text-[#c4c7c8] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {index + 1} / {images.length}
      </div>

      <button
        type="button"
        className="absolute right-4 top-4 grid size-9 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/50 text-[#c4c7c8] backdrop-blur-sm hover:bg-white/10 hover:text-white"
        onClick={onClose}
      >
        <X size={18} />
      </button>

      {canDelete(current) && (
        <button
          type="button"
          className="absolute left-4 top-4 grid size-9 cursor-pointer place-items-center rounded-full border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab] backdrop-blur-sm hover:bg-[#ffb4ab]/20"
          onClick={(e) => { e.stopPropagation(); onDelete(current); }}
          title="Delete image"
        >
          <Trash2 size={16} />
        </button>
      )}

      {hasPrev && (
        <button
          type="button"
          className="absolute left-4 top-1/2 -translate-y-1/2 grid size-10 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm hover:bg-white/15"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      <motion.img
        key={current.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        src={current.url}
        alt="Full-size ticket image"
        className="max-h-[82vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {currentTicketItem && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-2xl w-11/12 sm:w-auto rounded-xl border border-white/10 bg-[#0e0e10]/80 px-4 py-3 shadow-xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2.5">
            <CheckSquare className="mt-0.5 shrink-0 text-[#8fd3ff]" size={16} />
            <p className="m-0 text-sm leading-relaxed text-[#e0e0e0]">
              {currentTicketItem.text}
            </p>
          </div>
        </motion.div>
      )}

      {hasNext && (
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 grid size-10 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm hover:bg-white/15"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          <ChevronRight size={22} />
        </button>
      )}
    </motion.div>,
    document.body
  );
}

export function TicketChecklist({
  activeViewers,
  canEdit,
  canUpload = true,
  currentUserId,
  items: initialItems,
  onActivityChange,
  onDirtyChange,
  onUpdateDescription,
  onUpdateImages,
  projectId,
  task,
}: {
  activeViewers?: TaskViewer[];
  canEdit: boolean;
  canUpload?: boolean;
  currentUserId: string;
  items: TicketItem[];
  onActivityChange?: (activity: string | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onUpdateDescription: (newDesc: string) => Promise<void>;
  onUpdateImages?: (newImages: TaskImage[]) => void;
  projectId: string;
  task: TeamyTask;
}) {
  const [ticketItems, setTicketItems] = useState<TicketItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");

  const isSubtaskDirty = Boolean(newTaskText.trim() || (editingItemId !== null && editingText.trim() !== ""));

  useEffect(() => {
    onDirtyChange?.(isSubtaskDirty);
  }, [isSubtaskDirty, onDirtyChange]);

  const [images, setImages] = useState<TaskImage[]>(task.images || []);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [targetItemForUpload, setTargetItemForUpload] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      if (!isSaving) {
        setTicketItems(parseTicketItems(task.description) ?? []);
      }
    });
  }, [task.description, isSaving]);

  useEffect(() => {
    queueMicrotask(() => {
      setImages(task.images || []);
    });
  }, [task.images]);

  const saveItems = useCallback(
    async (nextItems: TicketItem[]) => {
      setIsSaving(true);
      try {
        await onUpdateDescription(serializeTicketItems(nextItems));
        setTicketItems(nextItems);
      } catch {
        toast.error("Could not update checklist items.");
      } finally {
        setIsSaving(false);
      }
    },
    [onUpdateDescription],
  );

  async function handleToggleItem(id: string) {
    const next = ticketItems.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
    await saveItems(next);
  }

  function startEditingItem(item: TicketItem) {
    setEditingItemId(item.id);
    setEditingText(item.text);
  }

  async function saveEditingItem() {
    if (!editingItemId) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      await handleDeleteItem(editingItemId);
    } else {
      const next = ticketItems.map((item) => (item.id === editingItemId ? { ...item, text: trimmed } : item));
      await saveItems(next);
    }
    setEditingItemId(null);
  }

  async function handleDeleteItem(id: string) {
    const next = ticketItems.filter((item) => item.id !== id);
    await saveItems(next);
  }

  const activityTimerRef = useRef<number | null>(null);

  function triggerAddingTaskActivity() {
    onActivityChange?.("adding_task");
    if (activityTimerRef.current) {
      window.clearTimeout(activityTimerRef.current);
    }
    activityTimerRef.current = window.setTimeout(() => {
      onActivityChange?.(null);
    }, 3000);
  }

  function clearAddingTaskActivity() {
    if (activityTimerRef.current) {
      window.clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    onActivityChange?.(null);
  }

  async function handleConfirmAddTask() {
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    if (ticketItems.length >= MAX_TICKET_CHECKLIST_ITEMS) {
      toast.error(`Maximum limit of ${MAX_TICKET_CHECKLIST_ITEMS} checklist items reached.`);
      return;
    }
    const next = [...ticketItems, makeTicketItem(trimmed)];
    await saveItems(next);
    setNewTaskText("");
    setIsAddingTask(false);
    clearAddingTaskActivity();
  }

  function handleCancelAddTask() {
    setNewTaskText("");
    setIsAddingTask(false);
    clearAddingTaskActivity();
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...ticketItems];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(index, 0, moved);
    setDraggedIndex(null);
    setDragOverIndex(null);
    await saveItems(next);
  }

  const handleFileUpload = useCallback(
    async (files: FileList | File[] | null, targetItemId?: string | null) => {
      if (!files || files.length === 0 || !canUpload) return;
      const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (validFiles.length === 0) {
        toast.error("Please select valid image files.");
        return;
      }

      setUploadingItemId(targetItemId || "general");
      const currentItemId = targetItemId || undefined;

      try {
        const uploadPromises = validFiles.map((file) => uploadTaskImage(projectId, task.id, file, currentItemId));
        const newUploadedImages = await Promise.all(uploadPromises);
        const nextImages = [...images, ...newUploadedImages];
        setImages(nextImages);
        onUpdateImages?.(nextImages);
        toast.success(`Uploaded ${newUploadedImages.length} image${newUploadedImages.length === 1 ? "" : "s"}.`);
      } catch {
        toast.error("Could not upload images.");
      } finally {
        setUploadingItemId(null);
      }
    },
    [canUpload, images, onUpdateImages, projectId, task.id],
  );

  useEffect(() => {
    if (!canUpload || !targetItemForUpload) return;

    function handlePaste(e: ClipboardEvent) {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < clipboardItems.length; i += 1) {
        const item = clipboardItems[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        void handleFileUpload(imageFiles, targetItemForUpload);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [canUpload, handleFileUpload, targetItemForUpload]);

  async function handleDeleteImage(img: TaskImage) {
    try {
      await deleteTaskImage(projectId, task.id, img.id);
      const nextImages = images.filter((i) => i.id !== img.id);
      setImages(nextImages);
      onUpdateImages?.(nextImages);
      if (lightboxIndex !== null && lightboxIndex >= nextImages.length) {
        setLightboxIndex(nextImages.length > 0 ? nextImages.length - 1 : null);
      }
      toast.success("Image deleted.");
    } catch {
      toast.error("Could not delete image.");
    }
  }

  function canDeleteImage(img: TaskImage) {
    return canEdit || img.uploaded_by.id === currentUserId;
  }

  const imagesByItemId = useMemo(() => {
    const map = new Map<string, TaskImage[]>();
    images.forEach((img) => {
      if (img.ticket_item_id) {
        const existing = map.get(img.ticket_item_id) || [];
        existing.push(img);
        map.set(img.ticket_item_id, existing);
      }
    });
    return map;
  }, [images]);

  const unlinkedImages = useMemo(() => images.filter((img) => !img.ticket_item_id), [images]);
  const ticketDone = ticketItems.filter((i) => i.checked).length;
  const ticketTotal = ticketItems.length;
  const ticketProgress = ticketTotal > 0 ? Math.round((ticketDone / ticketTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${labelFont} text-[#8e9192] uppercase`}>Ticket checklist</span>
          <span className={`${labelFont} rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white`}>
            {ticketDone}/{ticketTotal} ({ticketProgress}%)
          </span>
          <span className={`${labelFont} text-[11px] ${ticketTotal >= MAX_TICKET_CHECKLIST_ITEMS ? "text-[#ffb4ab]" : "text-[#8e9192]"}`}>
            ({ticketTotal}/{MAX_TICKET_CHECKLIST_ITEMS} max)
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {ticketDone > 0 && (
            <button
              type="button"
              onClick={() => setHideCompleted(!hideCompleted)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white"
              title={hideCompleted ? "Show completed tasks" : "Hide completed tasks"}
            >
              {hideCompleted ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>{hideCompleted ? "Show completed" : `Hide completed (${ticketDone})`}</span>
            </button>
          )}
          {isSaving && <Loader2 className="animate-spin text-[#8fd3ff]" size={15} />}
        </div>
      </div>

      {ticketTotal > 0 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${ticketProgress}%`,
              background: ticketProgress === 100 ? "#9be7b0" : "#8fd3ff",
            }}
          />
        </div>
      )}

      <input
        ref={itemFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (targetItemForUpload) {
            void handleFileUpload(e.target.files, targetItemForUpload);
            setTargetItemForUpload(null);
          }
          e.target.value = "";
        }}
      />

      <div className="flex flex-col gap-2">
        {ticketItems.length === 0 && !isAddingTask && (
          <p className="text-sm text-[#8e9192] italic m-0 py-1">No tasks in this ticket yet. Click Add Task below.</p>
        )}

        {ticketItems.map((item, index) => {
          if (hideCompleted && item.checked) return null;
          const itemImages = imagesByItemId.get(item.id) ?? [];
          const isDraggingThis = draggedIndex === index;
          const isDragOverThis = dragOverIndex === index;
          const isEditingThis = editingItemId === item.id;
          const isUploadingThis = uploadingItemId === item.id;
          const isTargetedForUpload = targetItemForUpload === item.id;

          return (
            <div
              key={item.id}
              draggable={canEdit && !isEditingThis}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => void handleDrop(e, index)}
              onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "SVG") {
                  setTargetItemForUpload(isTargetedForUpload ? null : item.id);
                }
              }}
              className={`group flex flex-col gap-2 rounded-lg border p-3 transition-all ${
                isDraggingThis ? "opacity-40 border-dashed border-white/40 bg-white/5" :
                isDragOverThis ? "border-white/50 bg-white/10" :
                isTargetedForUpload ? "border-[#8fd3ff]/70 bg-[#8fd3ff]/10 shadow-[0_0_15px_rgba(143,211,255,0.12)]" :
                "border-white/10 bg-[#09090b] hover:border-white/20"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                {canEdit && (
                  <div className="mt-0.5 cursor-grab text-[#8e9192] hover:text-white active:cursor-grabbing shrink-0" title="Drag to reorder">
                    <GripVertical size={16} />
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canEdit || isSaving}
                  onClick={() => void handleToggleItem(item.id)}
                  className="mt-0.5 shrink-0 cursor-pointer text-[#8e9192] hover:text-white"
                >
                  {item.checked ? (
                    <CheckSquare className="text-[#9be7b0]" size={18} />
                  ) : (
                    <Square className="text-[#8e9192] group-hover:text-[#c4c7c8]" size={18} />
                  )}
                </button>

                <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded border border-[#8fd3ff]/30 bg-[#8fd3ff]/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-[#8fd3ff] select-none">
                  {index + 1}
                </span>

                {isEditingThis ? (
                  <AutoExpandingTextarea
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#8fd3ff]/50"
                    value={editingText}
                    onChange={setEditingText}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void saveEditingItem();
                      } else if (e.key === "Escape") {
                        setEditingItemId(null);
                      }
                    }}
                    onBlur={() => void saveEditingItem()}
                  />
                ) : (
                  <span
                    onDoubleClick={() => canEdit && startEditingItem(item)}
                    className={`min-w-0 flex-1 text-sm leading-relaxed wrap-break-word cursor-pointer ${
                      item.checked ? "text-[#8e9192] line-through decoration-white/20" : "text-[#e4e4e7]"
                    }`}
                  >
                    {item.text}
                  </span>
                )}

                {canEdit && !isEditingThis && (
                  <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 opacity-80 transition-all group-hover:opacity-100">
                    {canUpload && (
                      <button
                        type="button"
                        className={`cursor-pointer rounded p-1 transition-colors ${
                          isTargetedForUpload ? "bg-[#8fd3ff]/20 text-[#8fd3ff]" : "text-[#8e9192] hover:bg-white/10 hover:text-white"
                        }`}
                        title="Upload image"
                        disabled={isUploadingThis}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isTargetedForUpload) {
                            setTargetItemForUpload(null);
                          } else {
                            setTargetItemForUpload(item.id);
                            itemFileInputRef.current?.click();
                          }
                        }}
                      >
                        {isUploadingThis ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                      </button>
                    )}
                    <button
                      type="button"
                      className="cursor-pointer rounded p-1 text-[#8e9192] hover:bg-white/10 hover:text-white"
                      title="Edit task text"
                      onClick={() => startEditingItem(item)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded p-1 text-[#8e9192] hover:bg-white/10 hover:text-[#ff8a80]"
                      title="Delete task"
                      onClick={() => void handleDeleteItem(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {itemImages.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/8 pl-6 sm:pl-13">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8e9192] mb-2 select-none">
                    <ImageIcon size={12} className="text-[#8fd3ff]" />
                    <span>Attached Images ({itemImages.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {itemImages.map((img: TaskImage) => {
                      const globalIdx = images.findIndex((i) => i.id === img.id);
                      return (
                        <GalleryThumbnail
                          key={img.id}
                          img={img}
                          canDelete={canDeleteImage(img)}
                          onOpen={() => setLightboxIndex(globalIdx)}
                          onDelete={() => void handleDeleteImage(img)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {hideCompleted && ticketDone > 0 && (
          <p className="text-xs text-[#8e9192] italic m-0 py-2 px-3 text-center bg-white/2 rounded-lg border border-white/5">
            Hiding {ticketDone} completed task{ticketDone > 1 ? "s" : ""}. Click{" "}
            <button
              type="button"
              onClick={() => setHideCompleted(false)}
              className="text-[#8fd3ff] underline hover:text-white cursor-pointer font-medium"
            >
              Show Completed
            </button>{" "}
            to view all.
          </p>
        )}

        {activeViewers && (() => {
          const otherActiveViewer = activeViewers.find((v) => v.id !== currentUserId && Boolean(v.activity));
          if (!otherActiveViewer) return null;
          const actorName = otherActiveViewer.full_name || otherActiveViewer.username || otherActiveViewer.email.split("@")[0];
          return (
            <div className="flex items-center gap-2 rounded-lg border border-[#8fd3ff]/30 bg-[#8fd3ff]/10 px-3 py-2 text-xs font-semibold text-[#bfe6ff] shadow-[0_0_12px_rgba(143,211,255,0.15)]">
              <Pencil aria-hidden="true" className="size-3 shrink-0 animate-bounce text-[#8fd3ff]" />
              <span>{actorName} is adding a task...</span>
            </div>
          );
        })()}

        {canEdit && (
          ticketTotal >= MAX_TICKET_CHECKLIST_ITEMS ? (
            <div className={`${labelFont} mt-1 inline-flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#8e9192]`}>
              Maximum limit reached ({MAX_TICKET_CHECKLIST_ITEMS}/{MAX_TICKET_CHECKLIST_ITEMS} items)
            </div>
          ) : isAddingTask ? (
            <div className="flex flex-col gap-2 rounded-lg border border-white/20 bg-white/4 p-3">
              <AutoExpandingTextarea
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-[#8e9192] focus:border-white"
                onChange={(val) => {
                  setNewTaskText(val);
                  triggerAddingTaskActivity();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleConfirmAddTask();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancelAddTask();
                  }
                }}
                placeholder="Type task title or description..."
                value={newTaskText}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelAddTask}
                  className={`${labelFont} cursor-pointer rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-white uppercase hover:bg-white/5`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAddTask()}
                  disabled={!newTaskText.trim() || isSaving}
                  className={`${labelFont} cursor-pointer rounded-md bg-white px-3 py-1.5 text-[#09090b] uppercase hover:bg-[#c6c6c6] disabled:opacity-50`}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={13} /> : "Add Task"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className={`${labelFont} mt-1 inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-dashed border-white/15 bg-transparent px-3 py-2 text-[#8e9192] uppercase transition-colors hover:border-white/30 hover:text-white`}
              onClick={() => {
                setIsAddingTask(true);
                triggerAddingTaskActivity();
              }}
              type="button"
            >
              <Plus aria-hidden="true" size={14} />
              Add Task
            </button>
          )
        )}
      </div>

      {unlinkedImages.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-3 mt-1">
          <span className={`${labelFont} text-[#8e9192] uppercase flex items-center gap-1.5`}>
            <ImageIcon size={13} />
            General Images
          </span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {unlinkedImages.map((img: TaskImage) => {
              const globalIdx = images.findIndex((i) => i.id === img.id);
              return (
                <GalleryThumbnail
                  key={img.id}
                  img={img}
                  canDelete={canDeleteImage(img)}
                  onOpen={() => setLightboxIndex(globalIdx)}
                  onDelete={() => void handleDeleteImage(img)}
                />
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && images[lightboxIndex] && (
          <ImageLightbox
            images={images}
            index={lightboxIndex}
            ticketItems={ticketItems}
            canDelete={canDeleteImage}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
            onDelete={(img) => void handleDeleteImage(img)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
