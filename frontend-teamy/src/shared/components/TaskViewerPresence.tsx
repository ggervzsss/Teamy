import { Pencil } from "lucide-react";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getUserDisplayName } from "@/shared/userDisplay";

export type TaskViewer = {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  activity?: string | null;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function formatActivityLabel(viewer: TaskViewer): string {
  const name = viewer.full_name?.split(" ")[0] || viewer.username || viewer.email.split("@")[0];
  if (viewer.activity === "adding_task") {
    return `${name} is adding a task...`;
  }
  if (viewer.activity === "typing") {
    return `${name} is typing...`;
  }
  return `${name} viewing`;
}

export function TaskViewerPresence({
  currentUserId,
  viewers,
}: {
  currentUserId: string;
  viewers: TaskViewer[] | undefined;
}) {
  if (!viewers || viewers.length === 0) {
    return null;
  }

  // Filter out current user to highlight other active collaborators viewing the ticket modal
  const otherViewers = viewers.filter((v) => v.id !== currentUserId);

  if (otherViewers.length === 0) {
    return null;
  }

  const activeActor = otherViewers.find((v) => Boolean(v.activity)) || otherViewers[0];
  const isActorActive = Boolean(activeActor.activity);
  const count = otherViewers.length;

  const tooltipText = otherViewers
    .map((v) => {
      const name = getUserDisplayName(v);
      if (v.activity === "adding_task") return `${name} (Adding task...)`;
      if (v.activity === "typing") return `${name} (Typing...)`;
      return `${name} (Viewing)`;
    })
    .join(", ");

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 transition-all duration-300 ${
        isActorActive
          ? "border-[#8fd3ff]/40 bg-[#8fd3ff]/15 text-[#bfe6ff] shadow-[0_0_12px_rgba(143,211,255,0.25)]"
          : "border-[#4ade80]/30 bg-[#4ade80]/10 text-[#c7f5d0] shadow-[0_0_12px_rgba(74,222,128,0.2)]"
      }`}
      title={`Active on this ticket: ${tooltipText}`}
    >
      {isActorActive ? (
        <Pencil aria-hidden="true" className="size-3 shrink-0 animate-bounce text-[#8fd3ff]" />
      ) : (
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-[#4ade80]" />
        </span>
      )}

      <div className="flex -space-x-1.5 overflow-hidden">
        {otherViewers.slice(0, 3).map((viewer) => (
          <UserAvatarImage
            className="inline-block size-4.5 rounded-full ring-1 ring-[#0e0e10]"
            key={viewer.id}
            title={`${getUserDisplayName(viewer)}${viewer.activity ? ` (${viewer.activity})` : ""}`}
            user={viewer}
          />
        ))}
      </div>

      <span className={`${labelFont} text-[11px] font-semibold uppercase`}>
        {count === 1
          ? formatActivityLabel(activeActor)
          : isActorActive
          ? `${activeActor.full_name?.split(" ")[0] || activeActor.email.split("@")[0]} active (+${count - 1})`
          : `${count} active viewers`}
      </span>
    </div>
  );
}
