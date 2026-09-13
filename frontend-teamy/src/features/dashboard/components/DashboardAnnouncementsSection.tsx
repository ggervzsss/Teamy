import type { KeyboardEvent, MouseEvent } from "react";
import { Pin } from "lucide-react";
import type { TeamyAnnouncement } from "@/features/announcement/api";
import { formatRelativeTime } from "@/shared/dateTime";
import { getRichTextPlainText } from "@/shared/richText";
import { getUserDisplayName } from "@/shared/userDisplay";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

export function DashboardAnnouncementCard({
  announcement,
  onContextMenu,
  onKeyDown,
  onOpen,
}: {
  announcement: TeamyAnnouncement;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
}) {
  const isNew = !announcement.is_read;

  return (
    <button
      className={`${panelClass} group relative flex min-h-64 cursor-pointer flex-col overflow-hidden p-6 text-left transition-all duration-300 hover:border-[#a855f7]/40 hover:bg-white/6 hover:shadow-[0_12px_36px_rgba(168,85,247,0.15)] active:scale-[0.99]`}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      type="button"
    >
      {announcement.is_pinned ? (
        <div className="absolute top-5 right-5 text-[#d8b4fe] drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-transform duration-300 group-hover:scale-110">
          <Pin aria-hidden="true" size={18} />
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
        <span
          className={`${labelFont} inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            isNew
              ? "border-[#a855f7]/40 bg-[#a855f7]/20 text-[#d8b4fe] shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              : "border-white/10 bg-white/10 text-white/80"
          }`}
        >
          {isNew ? <span className="size-1.5 rounded-full bg-[#d8b4fe] animate-pulse" /> : null}
          {isNew ? "New" : "Broadcast"}
        </span>
      </div>

      <h3 className="m-0 mb-3 text-2xl leading-tight font-bold text-white transition-colors group-hover:text-white">{announcement.title}</h3>
      <p className="m-0 line-clamp-3 flex-1 text-sm leading-relaxed text-[#8e9192] transition-colors group-hover:text-[#c4c7c8]">
        {getRichTextPlainText(announcement.body)}
      </p>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <span className={`${labelFont} truncate font-semibold text-[#e4e1e7] uppercase transition-colors group-hover:text-white`}>
          By {getUserDisplayName(announcement.created_by)}
        </span>
        <time className={`${labelFont} shrink-0 text-[#8e9192]`}>{formatRelativeTime(announcement.created_at)}</time>
      </div>
    </button>
  );
}
