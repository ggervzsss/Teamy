import { Mail } from "lucide-react";
import type { TeamyNotification } from "@/features/notifications/api";
import { toApiDate } from "@/shared/dateTime";
import { getRichTextPlainText } from "@/shared/richText";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(toApiDate(value));
}

export function NotificationRow({
  notification,
  onOpen,
  prominent = false,
}: {
  notification: TeamyNotification;
  onOpen: (notification: TeamyNotification) => Promise<void>;
  prominent?: boolean;
}) {
  const isUnread = !notification.read_at;

  return (
    <button
      className={`group flex w-full cursor-pointer gap-4 px-5 py-4 text-left transition-all duration-200 hover:border-l-2 hover:border-l-[#a855f7]/40 hover:bg-white/6 ${
        prominent ? "rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 shadow-[0_4px_20px_rgba(168,85,247,0.12)]" : "border-b border-white/5 last:border-b-0"
      } ${isUnread ? "bg-white/4" : ""}`}
      onClick={() => void onOpen(notification)}
      type="button"
    >
      <span
        className={`mt-1 grid size-10 shrink-0 place-items-center rounded-full border transition-all duration-300 group-hover:scale-105 ${
          notification.is_email_backed
            ? "border-[#a855f7]/40 bg-[#a855f7]/20 text-[#d8b4fe] shadow-[0_0_12px_rgba(168,85,247,0.25)]"
            : "border-white/10 bg-white/5 text-[#c4c7c8] group-hover:border-[#a855f7]/40 group-hover:bg-[#a855f7]/15 group-hover:text-white"
        }`}
      >
        <Mail aria-hidden="true" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {isUnread ? <span className="size-2 shrink-0 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" /> : null}
          <span className="truncate font-semibold text-white transition-colors group-hover:text-[#d8b4fe]">{notification.title}</span>
        </span>
        {notification.body ? <span className="mt-1 block text-sm leading-relaxed text-[#c4c7c8] group-hover:text-white/90">{getRichTextPlainText(notification.body)}</span> : null}
        <span className={`${labelFont} mt-2.5 block text-[11px] font-medium text-[#8e9192] uppercase`}>{formatDateTime(notification.created_at)}</span>
      </span>
    </button>
  );
}
