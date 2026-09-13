import { ChevronDown, Crown, Edit3, Shield, ShieldCheck } from "lucide-react";
import type { TeamPresenceMember } from "@/features/teammanagement/api";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { toApiDate } from "@/shared/dateTime";
import { getUserDisplayName, getUserSecondaryName } from "@/shared/userDisplay";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function formatJoinDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(toApiDate(value));
}

export function TeamMemberRow({
  canEditNickname,
  canManageRoles,
  isCurrentUser,
  member,
  onEditNickname,
  onRequestRoleChange,
}: {
  canEditNickname: boolean;
  canManageRoles: boolean;
  isCurrentUser: boolean;
  member: TeamPresenceMember;
  onEditNickname: () => void;
  onRequestRoleChange: (member: TeamPresenceMember, nextRole: "co_leader" | "member") => void;
}) {
  const name = getUserDisplayName(member.user);
  const secondaryName = getUserSecondaryName(member.user);
  const isInteractiveRole = canManageRoles && !isCurrentUser && member.role !== "leader";

  const renderRoleIndicator = () => {
    if (member.role === "leader") {
      return (
        <span className={`${labelFont} inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-[11px] font-semibold text-amber-300 uppercase shadow-[0_0_12px_rgba(251,191,36,0.2)]`}>
          <Crown aria-hidden="true" size={15} />
          Workspace Leader
        </span>
      );
    }
    if (member.role === "co_leader") {
      if (isInteractiveRole) {
        return (
          <button
            className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/15 px-3 py-1.5 text-[11px] font-semibold text-[#d8b4fe] uppercase transition-all hover:border-[#ffb4ab]/40 hover:bg-[#ffb4ab]/10 hover:text-[#ffb4ab] shadow-[0_0_12px_rgba(168,85,247,0.2)]`}
            onClick={() => onRequestRoleChange(member, "member")}
            title="Click to demote Co-leader to Member"
            type="button"
          >
            <ShieldCheck aria-hidden="true" size={15} />
            Co-leader
            <ChevronDown aria-hidden="true" className="opacity-60" size={14} />
          </button>
        );
      }
      return (
        <span className={`${labelFont} inline-flex items-center gap-2 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/15 px-3 py-1.5 text-[11px] font-semibold text-[#d8b4fe] uppercase shadow-[0_0_12px_rgba(168,85,247,0.2)]`}>
          <ShieldCheck aria-hidden="true" size={15} />
          Co-leader
        </span>
      );
    }

    if (isInteractiveRole) {
      return (
        <button
          className={`${labelFont} inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#c4c7c8] uppercase transition-all hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300`}
          onClick={() => onRequestRoleChange(member, "co_leader")}
          title="Click to promote member to Co-leader"
          type="button"
        >
          <Shield aria-hidden="true" size={15} />
          Project Member
          <ChevronDown aria-hidden="true" className="opacity-60" size={14} />
        </button>
      );
    }

    return (
      <span className={`${labelFont} inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#c4c7c8] uppercase`}>
        <Shield aria-hidden="true" size={15} />
        Project Member
      </span>
    );
  };

  return (
    <article className="group flex flex-col gap-4 p-6 transition-all duration-200 hover:border-l-2 hover:border-l-[#a855f7]/40 hover:bg-white/6 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <UserAvatarImage
          className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#353439] text-sm font-bold text-white shadow-sm"
          style={{
            background: "linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.96) 36%), #2a2a2e",
          }}
          user={member.user}
        >
          <span className={`absolute right-0 bottom-0 size-3 rounded-full border-2 border-[#1a1a1e] ${member.is_online ? "bg-[#9be7b0] shadow-[0_0_8px_rgba(155,231,176,0.8)]" : "bg-[#5f6264]"}`} />
        </UserAvatarImage>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="m-0 truncate font-medium text-white">{name}</h3>
            {isCurrentUser ? <span className={`${labelFont} rounded bg-white px-1.5 py-1 text-[#09090b] uppercase`}>You</span> : null}
            {canEditNickname ? (
              <button
                className="grid size-7 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/3 text-[#c4c7c8] transition-colors hover:bg-white/8 hover:text-white"
                onClick={onEditNickname}
                title="Change workspace nickname"
                type="button"
              >
                <Edit3 aria-hidden="true" size={14} />
              </button>
            ) : null}
          </div>
          <p className="m-0 truncate text-sm text-[#8e9192]">{member.nickname ? `${secondaryName} - ${member.user.email}` : secondaryName}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 md:justify-end">
        {renderRoleIndicator()}
        <span className={`${labelFont} text-[#8e9192] uppercase`}>Joined {formatJoinDate(member.joined_at)}</span>
      </div>
    </article>
  );
}
