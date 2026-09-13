import { Check, Copy, Search, SortAsc } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { getTeamSocketTicket, getTeamSocketUrl, listTeamPresence, updateTeamMemberNickname, updateTeamMemberRole } from "@/features/teammanagement/api";
import type { TeamMember, TeamPresenceMember, TeamSocketEvent } from "@/features/teammanagement/api";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { Skeleton } from "@/shared/components/Skeleton";
import { getUserDisplayName } from "@/shared/userDisplay";
import { useScrollLock } from "@/shared/useScrollLock";
import { TeamMemberRow } from "../components/TeamMemberRow";
import { RoleConfirmationModal } from "../components/RoleConfirmationModal";
import { NicknameModal } from "../components/NicknameModal";

const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-colors placeholder:text-[#8e9192] focus:border-white";

const rolePriority: Record<string, number> = {
  leader: 1,
  co_leader: 2,
  member: 3,
};

function sortMembers(members: TeamPresenceMember[]) {
  return [...members].sort((a, b) => {
    const priorityA = rolePriority[a.role] ?? 4;
    const priorityB = rolePriority[b.role] ?? 4;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return getUserDisplayName(a.user).localeCompare(getUserDisplayName(b.user)) || a.user.email.localeCompare(b.user.email);
  });
}

function toPresenceMember(member: TeamMember, existing?: TeamPresenceMember): TeamPresenceMember {
  return {
    ...member,
    is_online: existing?.is_online ?? false,
    last_online_at: existing?.last_online_at ?? null,
  };
}

function upsertMember(members: TeamPresenceMember[], nextMember: TeamMember) {
  const existingIndex = members.findIndex((member) => member.id === nextMember.id || member.user.id === nextMember.user.id);
  const nextPresenceMember = toPresenceMember(nextMember, existingIndex === -1 ? undefined : members[existingIndex]);
  const nextMembers = existingIndex === -1 ? [nextPresenceMember, ...members] : members.map((member) => (member.id === nextMember.id ? nextPresenceMember : member));
  return sortMembers(nextMembers);
}

function TeamManagementPage() {
  const { project, user } = useProjectContext();
  const [members, setMembers] = useState<TeamPresenceMember[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamPresenceMember | null>(null);
  const [nickname, setNickname] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [pendingRoleTarget, setPendingRoleTarget] = useState<{ member: TeamPresenceMember; nextRole: "co_leader" | "member" } | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useScrollLock(editingMember !== null || pendingRoleTarget !== null);

  useEffect(() => {
    let isMounted = true;

    listTeamPresence(project.id)
      .then((nextMembers) => {
        if (isMounted) {
          setMembers(sortMembers(nextMembers));
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load team members.");
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
    let socket: WebSocket | null = null;
    let isActive = true;

    const connectTimer = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      void getTeamSocketTicket(project.id)
        .then((ticket) => {
          if (!isActive) {
            return;
          }

          socket = new WebSocket(getTeamSocketUrl(project.id, ticket));
          socket.addEventListener("message", (event) => {
            const data = JSON.parse(event.data as string) as TeamSocketEvent;
            if (data.event === "team.member_joined" || data.event === "team.member_updated") {
              setMembers((currentMembers) => upsertMember(currentMembers, data.member));
            }
            if (data.event === "team.presence") {
              setMembers(sortMembers(data.members));
            }
          });
        })
        .catch(() => undefined);
    }, 100);

    return () => {
      isActive = false;
      window.clearTimeout(connectTimer);
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        socket.close();
      }
    };
  }, [project.id]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return members;
    }
    return members.filter((member) => `${member.user.full_name} ${member.user.username || ""} ${member.user.email} ${member.role}`.toLowerCase().includes(normalizedQuery));
  }, [members, query]);

  const isLeaderOrCoLeader = project.role === "leader" || project.role === "co_leader";
  const canEditMemberNickname = (member: TeamPresenceMember) => isLeaderOrCoLeader || member.user.id === user.id;

  async function handleConfirmedRoleChange() {
    if (!pendingRoleTarget || isUpdatingRole) {
      return;
    }
    const { member: targetMember, nextRole } = pendingRoleTarget;
    setIsUpdatingRole(true);
    try {
      const updatedMember = await updateTeamMemberRole(project.id, targetMember.id, nextRole);
      setMembers((currentMembers) => upsertMember(currentMembers, updatedMember));
      const targetName = getUserDisplayName(targetMember.user);
      toast.success(nextRole === "co_leader" ? `${targetName} promoted to Co-leader.` : `${targetName} demoted to Member.`);
      setPendingRoleTarget(null);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not update member role.";
      toast.error(message);
    } finally {
      setIsUpdatingRole(false);
    }
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(project.teamy_code);
    setIsCodeCopied(true);
    window.setTimeout(() => setIsCodeCopied(false), 1800);
  }

  function openNicknameModal(member: TeamPresenceMember) {
    setEditingMember(member);
    setNickname(member.nickname ?? "");
    setError("");
  }

  function closeNicknameModal() {
    if (isSavingNickname) {
      return;
    }
    setEditingMember(null);
    setNickname("");
  }

  async function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMember || isSavingNickname) {
      return;
    }

    const trimmedNickname = nickname.trim();
    setIsSavingNickname(true);
    setError("");
    try {
      const updatedMember = await updateTeamMemberNickname(project.id, editingMember.id, trimmedNickname || null);
      setMembers((currentMembers) => upsertMember(currentMembers, updatedMember));
      toast.success(trimmedNickname ? "Nickname updated." : "Nickname cleared.");
      setEditingMember(null);
      setNickname("");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not update the nickname.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingNickname(false);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Team Roster</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">Manage project access, share the Teamy code, and keep the roster updated as classmates join.</p>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => void copyInviteCode()}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-4 py-2.5 text-white transition-all hover:border-[#a855f7]/60 hover:bg-[#a855f7]/20 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
            title="Click to copy workspace invite code"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/20 text-[#d8b4fe] transition-colors group-hover:text-white">
              {isCodeCopied ? <Check aria-hidden="true" className="text-[#b9f6ca]" size={14} /> : <Copy aria-hidden="true" size={14} />}
            </span>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-mono text-sm font-bold tracking-wider text-white">{project.teamy_code}</span>
              <span className="text-[10px] font-medium text-[#8e9192] uppercase">{isCodeCopied ? "Copied to clipboard" : "Copy Invite Code"}</span>
            </div>
          </button>
        </div>
      </header>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      <section>
        <div className={`${panelClass} flex min-h-140 flex-col overflow-hidden`}>
          <div className="flex flex-col gap-4 border-b border-white/10 bg-white/2 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-[#8e9192]">
              <SortAsc aria-hidden="true" size={18} />
              <span className="text-sm font-medium">Sorted by: Role</span>
            </div>
            <div className="relative w-full md:w-64">
              <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8e9192]" size={16} />
              <input className={`${inputClass} rounded-full py-1.5 pl-9`} onChange={(event) => setQuery(event.target.value)} placeholder="Search members..." value={query} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col divide-y divide-white/8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between" key={i}>
                  <div className="flex min-w-0 items-center gap-4">
                    <Skeleton className="size-11 shrink-0 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-28 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-[#8e9192]">No members found.</div>
          ) : (
            <div className="flex flex-col divide-y divide-white/8">
              {filteredMembers.map((member) => (
                <TeamMemberRow
                  canEditNickname={canEditMemberNickname(member)}
                  canManageRoles={isLeaderOrCoLeader}
                  isCurrentUser={member.user.id === user.id}
                  key={member.id}
                  member={member}
                  onEditNickname={() => openNicknameModal(member)}
                  onRequestRoleChange={(m, nextRole) => setPendingRoleTarget({ member: m, nextRole })}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {editingMember ? (
          <NicknameModal
            isSaving={isSavingNickname}
            key="nickname-modal"
            member={editingMember}
            nickname={nickname}
            onClose={closeNicknameModal}
            onNicknameChange={setNickname}
            onSubmit={handleNicknameSubmit}
          />
        ) : null}
        {pendingRoleTarget ? (
          <RoleConfirmationModal
            isSubmitting={isUpdatingRole}
            key="role-confirmation-modal"
            member={pendingRoleTarget.member}
            nextRole={pendingRoleTarget.nextRole}
            onClose={() => !isUpdatingRole && setPendingRoleTarget(null)}
            onConfirm={() => void handleConfirmedRoleChange()}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default TeamManagementPage;
