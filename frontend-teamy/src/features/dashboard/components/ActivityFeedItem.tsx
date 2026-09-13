import { formatRelativeTime } from "@/shared/dateTime";
import type { ActivityItem } from "../utils/activityFeedUtils";
import { activityKindIcons } from "../utils/activityFeedUtils";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

export function ActivityKindIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const Icon = activityKindIcons[kind];
  return <Icon aria-hidden="true" size={16} />;
}

export function ActivityFeedItem({ item }: { item: ActivityItem }) {
  return (
    <div className="group relative flex gap-4 transition-all duration-200">
      <span className="z-10 grid size-8 shrink-0 place-items-center rounded-full border border-[#a855f7]/30 bg-[#18181b] text-[#d8b4fe] shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-all duration-300 group-hover:scale-110 group-hover:border-[#a855f7]/60 group-hover:bg-[#a855f7]/20 group-hover:text-white">
        <ActivityKindIcon kind={item.kind} />
      </span>
      <div className="min-w-0 pt-1">
        <p className="m-0 text-sm leading-snug text-[#8e9192]">
          <strong className="font-semibold text-white">{item.actor}</strong> {item.description.toLowerCase()}{" "}
          <span className="font-medium text-[#e4e1e7] transition-colors group-hover:text-[#d8b4fe]">{item.title}</span>
        </p>
        <p className={`${labelFont} m-0 mt-1.5 text-[11px] font-medium text-[#8e9192]/80`}>{formatRelativeTime(item.timestamp)}</p>
      </div>
    </div>
  );
}
