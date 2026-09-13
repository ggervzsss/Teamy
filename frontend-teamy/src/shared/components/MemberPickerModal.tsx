import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import type { ProjectMember } from "@/features/taskboard/api";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getUserDisplayName, getUserSecondaryName } from "@/shared/userDisplay";

export type MemberPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  members: ProjectMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => Promise<void> | void;
  title?: string;
  subtitle?: string;
};

export function MemberPickerModal({
  isOpen,
  onClose,
  members,
  selectedIds,
  onChange,
  title = "Add Assignees",
  subtitle,
}: MemberPickerModalProps) {
  const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
  const [query, setQuery] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
  const [prevSelectedIds, setPrevSelectedIds] = useState<string[]>(selectedIds);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setLocalSelectedIds(selectedIds);
      setPrevSelectedIds(selectedIds);
    }
  } else if (selectedIds !== prevSelectedIds) {
    setPrevSelectedIds(selectedIds);
    setLocalSelectedIds(selectedIds);
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    const norm = query.toLowerCase().trim();
    if (!norm) return members;
    return members.filter(
      (m) =>
        getUserDisplayName(m.user).toLowerCase().includes(norm) ||
        m.user.username?.toLowerCase().includes(norm) ||
        m.user.email.toLowerCase().includes(norm),
    );
  }, [members, query]);

  async function toggleSelected(memberId: string) {
    const isSelected = localSelectedIds.includes(memberId);
    const nextIds = isSelected
      ? localSelectedIds.filter((id) => id !== memberId)
      : [...localSelectedIds, memberId];

    setLocalSelectedIds(nextIds);
    setIsUpdating(true);
    try {
      await onChange(nextIds);
    } catch {
      setLocalSelectedIds(selectedIds);
    } finally {
      setIsUpdating(false);
    }
  }

  const selectedMembers = members.filter((m) => localSelectedIds.includes(m.user.id));

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <AnimatedModal className="z-80" contentClassName="w-full max-w-md" onBackdropClick={onClose}>
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-white/15 bg-[#0e0e10]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className={`${labelFont} text-sm font-bold text-white uppercase`}>{title}</h3>
                <p className="mt-1 text-xs text-[#8e9192]">
                  {subtitle ?? `${localSelectedIds.length} member${localSelectedIds.length === 1 ? "" : "s"} selected`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isUpdating && <Loader2 className="animate-spin text-[#a855f7]" size={14} />}
                <button
                  type="button"
                  onClick={onClose}
                  className="grid size-7 cursor-pointer place-items-center rounded-lg text-[#8e9192] hover:bg-white/10 hover:text-white"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-lg border border-white/10 bg-[#09090b] pl-3 pr-8 py-2 text-sm text-white outline-none transition-all placeholder:text-[#8e9192] focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30"
                placeholder="Search team members..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8e9192] hover:text-white"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Selected Member Pills */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {selectedMembers.map((m) => (
                  <div
                    key={m.user.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/20 py-1 pl-1.5 pr-2 text-xs font-semibold text-[#d8b4fe] shadow-xs"
                  >
                    <UserAvatarImage className="size-4 overflow-hidden rounded-full bg-white/10 text-[9px] font-medium" user={m.user} />
                    <span className="max-w-28 truncate">{getUserDisplayName(m.user)}</span>
                    <button
                      type="button"
                      onClick={() => void toggleSelected(m.user.id)}
                      className="grid size-4 cursor-pointer place-items-center rounded-full text-[#d8b4fe] hover:bg-[#a855f7]/30 hover:text-white"
                      title={`Remove ${getUserDisplayName(m.user)}`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Members Checklist */}
            <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#09090b] p-1 custom-scrollbar">
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-[#8e9192]">No team members found</div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = localSelectedIds.includes(m.user.id);
                  return (
                    <button
                      type="button"
                      key={m.user.id}
                      onClick={() => void toggleSelected(m.user.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[#a855f7]/10 ${
                        isSelected ? "bg-[#a855f7]/15 font-semibold text-white" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="size-4 rounded border-white/20 accent-[#a855f7]"
                      />
                      <UserAvatarImage className="size-8 overflow-hidden rounded-full bg-white/10 text-xs font-medium" user={m.user} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{getUserDisplayName(m.user)}</div>
                        <div className="truncate text-xs text-[#8e9192]">{m.user.username ? getUserSecondaryName(m.user) : m.role}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </AnimatedModal>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
