import type { KeyboardEvent, MouseEvent, TouchEvent } from "react";
import { CalendarDays, ChevronRight, Pin, PinOff, Sparkles } from "lucide-react";
import type { TeamyAnnouncement } from "@/features/announcement/api";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { formatRelativeTime, toLocalDate } from "@/shared/dateTime";
import { getRichTextPlainText } from "@/shared/richText";
import { getUserDisplayName } from "@/shared/userDisplay";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const listItemClass = "gpu-panel rounded-lg border border-white/8 bg-white/2 backdrop-blur-2xl";

function formatTimestamp(value: string) {
  return formatRelativeTime(value, { includeYesterday: true, dateFormat: { month: "short", day: "numeric" } });
}

export function AuthorStamp({ announcement }: { announcement: TeamyAnnouncement }) {
  const authorName = getUserDisplayName(announcement.created_by);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <UserAvatarImage
        className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2a2a2e] text-[10px] font-bold text-white shadow-sm"
        style={{
          background: "linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.96) 36%), #2a2a2e",
        }}
        user={announcement.created_by}
      />
      <span className={`${labelFont} truncate font-semibold text-white uppercase`}>{authorName}</span>
      <span className={`${labelFont} text-[#8e9192]`}>{"\u2022"}</span>
      <time className={`${labelFont} text-[#8e9192]`}>{formatTimestamp(announcement.created_at)}</time>
      {!announcement.is_read ? (
        <span className={`${labelFont} inline-flex items-center gap-1 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/20 px-2.5 py-1 text-[10px] font-semibold text-[#d8b4fe] uppercase shadow-[0_0_12px_rgba(168,85,247,0.2)]`}>
          <Sparkles aria-hidden="true" size={13} />
          New
        </span>
      ) : null}
    </div>
  );
}

export function DeadlineStamp({ date }: { date: string }) {
  return (
    <span className={`${labelFont} inline-flex w-fit items-center gap-2 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-1 text-[11px] font-semibold text-[#d8b4fe] uppercase shadow-xs`}>
      <CalendarDays aria-hidden="true" size={14} />
      {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toLocalDate(date))}
    </span>
  );
}

export function PinnedAnnouncementCard({
  announcement,
  isPinPending,
  onContextMenu,
  onKeyDown,
  onOpen,
  onPinToggle,
  onTouchCancel,
  onTouchEnd,
  onTouchMove,
  onTouchStart,
}: {
  announcement: TeamyAnnouncement;
  isPinPending: boolean;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onPinToggle: () => void;
  onTouchCancel: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
}) {
  return (
    <article
      className={`${panelClass} group relative flex min-h-72 flex-col gap-4 overflow-hidden p-6 transition-all duration-300 hover:border-[#a855f7]/40 hover:bg-white/6 hover:shadow-[0_12px_36px_rgba(168,85,247,0.15)] active:scale-[0.99]`}
      onContextMenu={onContextMenu}
      onTouchCancel={onTouchCancel}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
      <div className="flex items-start justify-between gap-4 pl-2">
        <AuthorStamp announcement={announcement} />
        <button
          className={`${labelFont} inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/15 px-3 py-1.5 text-xs font-semibold text-[#d8b4fe] uppercase transition-all hover:bg-[#a855f7]/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={isPinPending}
          onClick={onPinToggle}
          type="button"
          title="Unpin announcement"
        >
          <PinOff aria-hidden="true" size={14} />
          Pinned
        </button>
      </div>
      <button className="flex flex-1 cursor-pointer flex-col gap-4 pl-2 text-left" onClick={onOpen} onKeyDown={onKeyDown} type="button">
        <h3 className="m-0 text-[clamp(22px,3vw,32px)] leading-tight font-bold text-white transition-colors group-hover:text-white">{announcement.title}</h3>
        <p className="m-0 line-clamp-4 text-base leading-relaxed text-[#c4c7c8] transition-colors group-hover:text-white/90">{getRichTextPlainText(announcement.body)}</p>
        {announcement.deadline_date ? <DeadlineStamp date={announcement.deadline_date} /> : null}
        <span className={`${labelFont} mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-2 text-xs font-bold text-[#d8b4fe] uppercase transition-all duration-200 group-hover:bg-[#a855f7] group-hover:text-white shadow-xs`}>
          Read Full Memo
          <ChevronRight aria-hidden="true" size={15} />
        </span>
      </button>
    </article>
  );
}

export function FeedAnnouncementItem({
  announcement,
  canPin = true,
  isPinPending,
  onContextMenu,
  onKeyDown,
  onOpen,
  onPinToggle,
  onTouchCancel,
  onTouchEnd,
  onTouchMove,
  onTouchStart,
}: {
  announcement: TeamyAnnouncement;
  canPin?: boolean;
  isPinPending: boolean;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  onPinToggle: () => void;
  onTouchCancel: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
}) {
  return (
    <article
      className={`${listItemClass} group flex flex-col gap-4 p-5 transition-all duration-300 hover:border-[#a855f7]/40 hover:bg-white/6 hover:shadow-[0_8px_30px_rgba(168,85,247,0.12)] sm:flex-row sm:items-center ${announcement.is_read ? "opacity-75 hover:opacity-100" : ""}`}
      onContextMenu={onContextMenu}
      onTouchCancel={onTouchCancel}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
    >
      <button className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 text-left" onClick={onOpen} onKeyDown={onKeyDown} type="button">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`size-2 rounded-full ${announcement.is_read ? "border border-[#8e9192]" : "bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.8)]"}`} />
          <span className={`${labelFont} font-semibold text-white uppercase`}>{getUserDisplayName(announcement.created_by)}</span>
          <span className={`${labelFont} text-[#8e9192]`}>{"\u2022"}</span>
          <time className={`${labelFont} text-[#8e9192]`}>{formatTimestamp(announcement.created_at)}</time>
        </div>
        <h3 className={`m-0 text-2xl leading-tight font-bold transition-colors ${announcement.is_read ? "text-[#c4c7c8]" : "text-white"} group-hover:text-[#d8b4fe]`}>{announcement.title}</h3>
        <p className="m-0 max-w-3xl truncate text-[#8e9192] transition-colors group-hover:text-[#c4c7c8]">{getRichTextPlainText(announcement.body)}</p>
        {announcement.deadline_date ? <DeadlineStamp date={announcement.deadline_date} /> : null}
      </button>
      <div className="flex shrink-0 items-center gap-3">
        {!announcement.is_read ? <span className={`${labelFont} rounded-full border border-[#a855f7]/40 bg-[#a855f7]/20 px-3 py-1.5 text-xs font-semibold text-[#d8b4fe] uppercase shadow-[0_0_12px_rgba(168,85,247,0.2)]`}>New</span> : null}
        {canPin ? (
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-transparent text-[#8e9192] transition-all hover:border-[#a855f7]/40 hover:bg-[#a855f7]/15 hover:text-[#d8b4fe] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPinPending}
            onClick={onPinToggle}
            type="button"
            title="Pin announcement"
          >
            <Pin aria-hidden="true" size={17} />
          </button>
        ) : null}
        <ChevronRight aria-hidden="true" className="text-[#8e9192] transition-colors group-hover:text-[#d8b4fe]" size={22} />
      </div>
    </article>
  );
}
