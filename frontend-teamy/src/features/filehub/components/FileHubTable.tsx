import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, TouchEvent } from "react";
import type { FileResourceKind, FileResourceSummary } from "@/features/filehub/api";
import { Skeleton } from "@/shared/components/Skeleton";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getUserDisplayName } from "@/shared/userDisplay";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

export type Filter = "all" | FileResourceKind;
export type FilterOption = { id: Filter; label: string };

export function ResourceFilterDropdown({ onChange, options, value }: { onChange: (value: Filter) => void; options: FilterOption[]; value: Filter }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.id === value)?.label ?? options[0]?.label ?? "All Files";

  useEffect(() => {
    function handleOutsideClick(event: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="flex min-w-40 flex-col gap-2" ref={ref}>
      <span className={`${labelFont} text-[#8e9192] uppercase`}>Type</span>
      <div className="relative">
        <button
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-left text-white transition-colors outline-none hover:border-white/20"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className={labelFont}>{selectedLabel}</span>
          <ChevronDown aria-hidden="true" className={`shrink-0 text-[#8e9192] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} size={14} />
        </button>
        {isOpen ? (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#09090b] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {options.map((option) => (
              <button
                className={`${labelFont} w-full px-3 py-2.5 text-left transition-colors ${option.id === value ? "bg-white/10 text-white" : "text-[#c4c7c8] hover:bg-white/5 hover:text-white"}`}
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FileHubTable({
  filteredFiles,
  isLoading,
  longPressTriggeredRef,
  onOpenFile,
  onResourceContextMenu,
  onResourceKeyDown,
  onResourceTouchEnd,
  onResourceTouchStart,
}: {
  filteredFiles: FileResourceSummary[];
  isLoading: boolean;
  longPressTriggeredRef: React.MutableRefObject<boolean>;
  onOpenFile: (file: FileResourceSummary) => void;
  onResourceContextMenu: (event: MouseEvent<HTMLButtonElement>, file: FileResourceSummary) => void;
  onResourceKeyDown: (event: KeyboardEvent<HTMLButtonElement>, file: FileResourceSummary) => void;
  onResourceTouchEnd: () => void;
  onResourceTouchStart: (event: TouchEvent<HTMLButtonElement>, file: FileResourceSummary) => void;
}) {
  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="grid grid-cols-12 gap-4 border-b border-white/10 bg-black/30 px-6 py-3">
        <div className={`${labelFont} col-span-12 text-[#8e9192] uppercase md:col-span-5`}>Resource Title</div>
        <div className={`${labelFont} col-span-2 hidden text-[#8e9192] uppercase md:block`}>Category</div>
        <div className={`${labelFont} col-span-2 hidden text-[#8e9192] uppercase lg:block`}>Added By</div>
        <div className={`${labelFont} col-span-5 hidden text-[#8e9192] uppercase md:block lg:col-span-3`}>Related Task</div>
      </div>

      {isLoading ? (
        <div className="flex flex-col">
          {[1, 2, 3, 4, 5].map((i) => (
            <div className="grid grid-cols-12 items-center gap-4 border-b border-white/5 px-6 py-4 last:border-b-0" key={i}>
              <div className="col-span-12 flex items-center gap-4 md:col-span-5">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="col-span-2 hidden md:block">
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="col-span-2 hidden lg:block">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="col-span-5 hidden md:block lg:col-span-3">
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="px-6 py-10 text-center text-[#8e9192]">No resources found.</div>
      ) : (
        <div className="flex flex-col">
          {filteredFiles.map((file) => (
            <button
              className="group grid cursor-pointer grid-cols-12 items-center gap-4 border-b border-white/5 px-6 py-4 text-left transition-all duration-200 last:border-b-0 hover:border-l-2 hover:border-l-[#a855f7]/40 hover:bg-white/6"
              key={file.id}
              onClick={(event) => {
                if (longPressTriggeredRef.current) {
                  event.preventDefault();
                  longPressTriggeredRef.current = false;
                  return;
                }
                onOpenFile(file);
              }}
              onContextMenu={(event) => onResourceContextMenu(event, file)}
              onKeyDown={(event) => onResourceKeyDown(event, file)}
              onTouchCancel={onResourceTouchEnd}
              onTouchEnd={onResourceTouchEnd}
              onTouchMove={onResourceTouchEnd}
              onTouchStart={(event) => onResourceTouchStart(event, file)}
              type="button"
            >
              <div className="col-span-12 flex min-w-0 items-center gap-4 md:col-span-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#c4c7c8] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-[#a855f7]/40 group-hover:bg-[#a855f7]/20 group-hover:text-white">
                  {file.kind === "doc" ? <FileText aria-hidden="true" size={20} /> : <ExternalLink aria-hidden="true" size={20} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold text-white transition-colors group-hover:text-[#d8b4fe]">{file.title}</span>
                  <span className={`${labelFont} mt-1 block truncate text-[#8e9192] uppercase md:hidden`}>{file.kind === "doc" ? "Teamy Doc" : "Link"}</span>
                </span>
              </div>
              <div className="col-span-2 hidden md:block">
                <span
                  className={`${labelFont} inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${
                    file.kind === "doc" ? "border-[#a855f7]/40 bg-[#a855f7]/15 text-[#d8b4fe]" : "border-[#8fd3ff]/40 bg-[#8fd3ff]/15 text-[#bfe6ff]"
                  }`}
                >
                  {file.kind === "doc" ? "Teamy Doc" : "Link"}
                </span>
              </div>
              <div className="col-span-2 hidden min-w-0 items-center gap-2 lg:flex">
                <UserAvatarImage className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold text-white shadow-xs" user={file.created_by} />
                <span className="truncate text-sm font-medium text-[#c4c7c8]">{getUserDisplayName(file.created_by)}</span>
              </div>
              <div className="col-span-5 hidden min-w-0 text-sm text-[#c4c7c8] md:block lg:col-span-3">
                <span className="block truncate font-medium group-hover:text-white/90">{file.linked_tasks[0]?.title ?? "Unlinked"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
