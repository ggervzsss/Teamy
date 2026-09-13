import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Copy, LogOut, Menu, Settings, Ticket, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import toast from "react-hot-toast";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "@/features/auth";
import type { TeamyProject } from "@/features/projects";
import { NotificationBell } from "@/features/notifications";
import { getTeamSocketTicket, getTeamSocketUrl, listTeamPresence } from "@/features/teammanagement/api";
import type { TeamPresenceMember, TeamSocketEvent } from "@/features/teammanagement/api";
import { listTasks } from "@/features/taskboard/api";
import type { TeamyTask } from "@/features/taskboard/api";
import { formatRelativeTime } from "@/shared/dateTime";
import { appRoutes } from "@/router";
import { AnimatedModal } from "./AnimatedModal";
import ProjectProvider from "@/shared/components/ProjectProvider";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { PageAnimation } from "./PageAnimation";
import { getUserDisplayName, getUserSecondaryName } from "@/shared/userDisplay";
import { useScrollLock } from "@/shared/useScrollLock";
import { AvatarBubble, MemberTaskModal } from "./shell/MemberTaskModal";
import { GlobalAnnouncementCreateModal, GlobalPrivateTaskCreateModal, GlobalTaskCreateModal } from "./shell/GlobalTaskCreateModal";
import type { GlobalCreateKind } from "./shell/GlobalTaskCreateModal";

type AppShellProps = {
  children: ReactNode;
  onLogout: () => Promise<void>;
  onProjectUpdated?: (project: TeamyProject) => void;
  onUserUpdated?: (user: AuthUser) => void;
  project: TeamyProject;
  user: AuthUser;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const sidebarLink =
  "flex w-full cursor-pointer items-center gap-4 border-y-0 border-r-0 border-l-4 border-transparent bg-transparent px-4 py-2 pl-3 text-left text-[#8e9192] transition-all duration-200 ease-out hover:bg-[#a855f7]/10 hover:text-white active:scale-[0.98]";
const activeSidebarStyle = "border-l-[#a855f7] bg-linear-to-r from-[#a855f7]/20 via-[#a855f7]/10 to-transparent text-white shadow-[inset_0_0_12px_rgba(168,85,247,0.2)] font-semibold";

function formatLastOnline(member: TeamPresenceMember) {
  if (member.is_online) {
    return "Online now";
  }
  if (!member.last_online_at) {
    return "No recent activity";
  }

  const relative = formatRelativeTime(member.last_online_at, {
    includeYesterday: false,
    dateFormat: { month: "short", day: "numeric" },
  });

  return relative === "Just now" ? "Last online just now" : `Last online ${relative}`;
}

function sortPresenceMembers(members: TeamPresenceMember[]) {
  return [...members].sort((a, b) => {
    if (a.is_online !== b.is_online) {
      return a.is_online ? -1 : 1;
    }
    return getUserDisplayName(a.user).localeCompare(getUserDisplayName(b.user)) || a.user.email.localeCompare(b.user.email);
  });
}

function AppShell({ children, onLogout, onProjectUpdated, onUserUpdated, project, user }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const projectBasePath = `/projects/${project.slug}`;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("teamy_sidebar_collapsed") === "true");
  const [isMyTasksExpanded, setIsMyTasksExpanded] = useState(() => location.pathname.includes("/my-tasks"));
  const [isMyTasksFlyoutOpen, setIsMyTasksFlyoutOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isOnlineUsersDropdownOpen, setIsOnlineUsersDropdownOpen] = useState(false);
  const [globalCreateKind, setGlobalCreateKind] = useState<GlobalCreateKind | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [presenceMembers, setPresenceMembers] = useState<TeamPresenceMember[]>([]);
  const [presenceError, setPresenceError] = useState("");
  const [selectedTaskMember, setSelectedTaskMember] = useState<TeamPresenceMember | null>(null);
  const [memberTasks, setMemberTasks] = useState<TeamyTask[]>([]);
  const [isMemberTasksLoading, setIsMemberTasksLoading] = useState(false);
  const [memberTasksError, setMemberTasksError] = useState("");
  const [isOnlineUsersModalOpen, setIsOnlineUsersModalOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const onlineUsersDropdownRef = useRef<HTMLDivElement>(null);
  const myTasksFlyoutRef = useRef<HTMLDivElement>(null);

  const [isHeaderCodeCopied, setIsHeaderCodeCopied] = useState(false);

  async function copyHeaderInviteCode() {
    try {
      await navigator.clipboard.writeText(project.teamy_code);
      setIsHeaderCodeCopied(true);
      toast.success("Workspace invite code copied!");
      window.setTimeout(() => setIsHeaderCodeCopied(false), 1800);
    } catch {
      toast.error("Could not copy invite code.");
    }
  }

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("teamy_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  useScrollLock(isMobileSidebarOpen || selectedTaskMember !== null || globalCreateKind !== null || isOnlineUsersModalOpen);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (onlineUsersDropdownRef.current && !onlineUsersDropdownRef.current.contains(event.target as Node)) {
        setIsOnlineUsersDropdownOpen(false);
      }
      if (myTasksFlyoutRef.current && !myTasksFlyoutRef.current.contains(event.target as Node)) {
        setIsMyTasksFlyoutOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isActive = true;
    let socket: WebSocket | null = null;

    void listTeamPresence(project.id)
      .then((members) => {
        if (isActive) {
          setPresenceMembers(sortPresenceMembers(members));
        }
      })
      .catch((caughtError) => {
        if (isActive) {
          setPresenceError(caughtError instanceof Error ? caughtError.message : "Could not load online members.");
        }
      });

    void getTeamSocketTicket(project.id)
      .then((ticket) => {
        if (!isActive) {
          return;
        }

        const socketUrl = getTeamSocketUrl(project.id, ticket);
        socket = new WebSocket(socketUrl);

        socket.addEventListener("message", (event) => {
          if (!isActive) {
            return;
          }
          const data = JSON.parse(event.data as string) as TeamSocketEvent;
          if (data.event === "team.presence") {
            setPresenceMembers(sortPresenceMembers(data.members));
            setPresenceError("");
          }
        });
        socket.addEventListener("error", () => {
          if (isActive) {
            setPresenceError("Presence is reconnecting.");
          }
        });
        socket.addEventListener("close", () => {
          if (isActive) {
            setPresenceError("Presence is offline.");
          }
        });
      })
      .catch((caughtError) => {
        if (isActive) {
          setPresenceError(caughtError instanceof Error ? caughtError.message : "Presence is offline.");
        }
      });

    return () => {
      isActive = false;
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        socket.close();
      }
    };
  }, [project.id]);

  const closeMemberTasksModal = useCallback(() => {
    setSelectedTaskMember(null);
    setMemberTasks([]);
    setIsMemberTasksLoading(false);
    setMemberTasksError("");
  }, []);

  useEffect(() => {
    if (!selectedTaskMember) {
      return;
    }

    let isActive = true;

    listTasks(project.id)
      .then((tasks) => {
        if (isActive) {
          setMemberTasks(tasks.filter((task) => task.assignees.some((assignee) => assignee.user.id === selectedTaskMember.user.id)));
          setMemberTasksError("");
        }
      })
      .catch((caughtError) => {
        if (isActive) {
          setMemberTasksError(caughtError instanceof Error ? caughtError.message : "Could not load member tasks.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsMemberTasksLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [project.id, selectedTaskMember]);

  const currentProjectUser = useMemo(() => {
    const presenceMember = presenceMembers.find((member) => member.user.id === user.id);
    return presenceMember?.user ?? user;
  }, [presenceMembers, user]);

  const userDisplayName = getUserDisplayName(currentProjectUser);
  const userSecondaryName = getUserSecondaryName(currentProjectUser);
  const sortedPresenceMembers = useMemo(() => sortPresenceMembers(presenceMembers), [presenceMembers]);
  const onlineMembers = sortedPresenceMembers.filter((member) => member.is_online);
  const visibleOnlineMembers = onlineMembers.slice(0, 6);

  function closeSidebarAndCollapseMyTasks() {
    setIsMobileSidebarOpen(false);
    setIsMyTasksExpanded(false);
  }

  const renderSidebarContent = (isCollapsed: boolean) => (
    <>
      <div className="mb-8 flex items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/favicon.png" alt="Teamy logo" className="size-10 shrink-0 rounded-lg" title="Teamy" />
          <h2
            className={`m-0 truncate text-2xl leading-none font-bold tracking-normal text-white transition-opacity duration-300 ease-in-out ${isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            Teamy
          </h2>
        </div>
        {!isCollapsed && (
          <button
            type="button"
            className="hidden cursor-pointer items-center -space-x-2 transition-transform duration-200 hover:scale-105 max-[768px]:flex"
            onClick={() => {
              setIsOnlineUsersModalOpen(true);
            }}
            title="View online members"
          >
            {visibleOnlineMembers.length === 0 ? (
              <div className="grid size-7 place-items-center rounded-full border-2 border-[#09090b] bg-[#2a2a2e] text-[10px] font-medium text-[#8e9192]">0</div>
            ) : (
              visibleOnlineMembers.map((member, index) => <AvatarBubble key={member.id} member={member} size="sm" zIndex={6 - index} />)
            )}
            {onlineMembers.length > 6 && (
              <div className="grid size-7 place-items-center rounded-full border-2 border-[#09090b] bg-[#2a2a2e] text-[10px] font-medium text-white" style={{ zIndex: 0 }}>
                +{onlineMembers.length - 6}
              </div>
            )}
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-2" aria-label="Primary navigation">
        {appRoutes.map((item) => {
          const Icon = item.icon;
          const isMyTasks = item.path === "/my-tasks";

          if (isMyTasks) {
            const isMyTasksActive = location.pathname.includes("/my-tasks");
            const isTicketsTab = location.search.includes("view=tickets");
            const isTasksTab = !isTicketsTab;

            if (isCollapsed) {
              return (
                <div key={item.path} className="relative" ref={myTasksFlyoutRef}>
                  <button
                    type="button"
                    onClick={() => setIsMyTasksFlyoutOpen((prev) => !prev)}
                    title="My Tasks"
                    className={`${sidebarLink} cursor-pointer ${isMyTasksActive ? activeSidebarStyle : ""}`}
                  >
                    <Icon aria-hidden="true" className="shrink-0" size={22} strokeWidth={isMyTasksActive ? 2.6 : 2} />
                  </button>

                  <AnimatePresence>
                    {isMyTasksFlyoutOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -6, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-0 left-full z-60 pl-3"
                      >
                        <div className="flex w-48 flex-col gap-1 rounded-xl border border-white/15 bg-[#121215] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                          <div className="border-b border-white/10 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-[#8e9192] uppercase">My Tasks</div>
                          <NavLink
                            to={`${projectBasePath}/my-tasks?view=tasks`}
                            onClick={() => {
                              setIsMyTasksFlyoutOpen(false);
                              closeSidebarAndCollapseMyTasks();
                            }}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                              isMyTasksActive && isTasksTab
                                ? "border border-[#a855f7]/30 bg-[#a855f7]/25 font-semibold text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
                            }`}
                          >
                            <ClipboardList className="shrink-0" size={16} />
                            <span>Assigned Tasks</span>
                          </NavLink>

                          <NavLink
                            to={`${projectBasePath}/my-tasks?view=tickets`}
                            onClick={() => {
                              setIsMyTasksFlyoutOpen(false);
                              closeSidebarAndCollapseMyTasks();
                            }}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                              isMyTasksActive && isTicketsTab
                                ? "border border-[#a855f7]/30 bg-[#a855f7]/25 font-semibold text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
                            }`}
                          >
                            <Ticket className="shrink-0" size={16} />
                            <span>Tickets</span>
                          </NavLink>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-1" key={item.path}>
                <button type="button" onClick={() => setIsMyTasksExpanded((prev) => !prev)} className={`${sidebarLink} cursor-pointer justify-between ${isMyTasksActive ? activeSidebarStyle : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon aria-hidden="true" className="shrink-0" size={22} strokeWidth={isMyTasksActive ? 2.6 : 2} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-300 ease-in-out">{item.label}</span>
                  </div>
                  <ChevronDown size={16} className={`shrink-0 text-[#8e9192] transition-transform duration-200 ${isMyTasksExpanded ? "rotate-180" : ""}`} />
                </button>

                {isMyTasksExpanded && (
                  <div className="ml-5 flex flex-col gap-1 border-l border-white/15 py-1 pl-3">
                    <NavLink
                      to={`${projectBasePath}/my-tasks?view=tasks`}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium tracking-wider uppercase transition-colors ${
                        isMyTasksActive && isTasksTab
                          ? "border border-[#a855f7]/30 bg-[#a855f7]/25 font-semibold text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                          : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
                      }`}
                    >
                      <ClipboardList className="shrink-0" size={15} />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">Assigned Tasks</span>
                    </NavLink>

                    <NavLink
                      to={`${projectBasePath}/my-tasks?view=tickets`}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium tracking-wider uppercase transition-colors ${
                        isMyTasksActive && isTicketsTab
                          ? "border border-[#a855f7]/30 bg-[#a855f7]/25 font-semibold text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                          : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
                      }`}
                    >
                      <Ticket className="shrink-0" size={15} />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">Tickets</span>
                    </NavLink>
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              className={({ isActive }) => `${sidebarLink} ${isActive ? activeSidebarStyle : ""}`}
              key={item.path}
              onClick={closeSidebarAndCollapseMyTasks}
              title={item.label}
              to={`${projectBasePath}${item.path}`}
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden="true" className="shrink-0" size={22} strokeWidth={isActive ? 2.6 : 2} />
                  <span className={`overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-300 ease-in-out ${isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <nav className="mt-auto flex flex-col gap-2" aria-label="Secondary navigation">
        {project.role === "leader" || project.role === "co_leader" ? (
          <NavLink
            className={({ isActive }) => `${sidebarLink} ${isActive ? "border-l-white bg-white/10 text-white" : ""}`}
            onClick={closeSidebarAndCollapseMyTasks}
            title="Settings"
            to={`${projectBasePath}/settings`}
          >
            {({ isActive }) => (
              <>
                <Settings aria-hidden="true" className="shrink-0" size={22} strokeWidth={isActive ? 2.6 : 2} />
                <span className={`overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-300 ease-in-out ${isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}>
                  Settings
                </span>
              </>
            )}
          </NavLink>
        ) : null}
        <NavLink className={({ isActive }) => `${sidebarLink} ${isActive ? "border-l-white bg-white/10 text-white" : ""}`} end onClick={closeSidebarAndCollapseMyTasks} title="Projects" to="/projects">
          {({ isActive }) => (
            <>
              <Briefcase aria-hidden="true" className="shrink-0" size={22} strokeWidth={isActive ? 2.6 : 2} />
              <span className={`overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-300 ease-in-out ${isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}>
                Projects
              </span>
            </>
          )}
        </NavLink>
      </nav>
    </>
  );

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Signature Teamy Ambient Purple Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_-10%,rgba(168,85,247,0.14),transparent)]" />
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#09090b]/90 py-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 ease-in-out max-[768px]:hidden ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
        aria-label="Teamy navigation"
      >
        {renderSidebarContent(isSidebarCollapsed)}

        {/* Hanging Floating Toggle Button in the middle of the sidebar edge */}
        <button
          type="button"
          className="absolute top-1/2 -right-3.5 z-60 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-[#18181b] text-[#c4c7c8] shadow-[0_4px_12px_rgba(0,0,0,0.6)] transition-all duration-200 hover:scale-110 hover:border-[#a855f7]/50 hover:bg-[#a855f7]/20 hover:text-white"
          onClick={toggleSidebarCollapse}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Mobile sidebar backdrop */}
      {isMobileSidebarOpen && <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm min-[769px]:hidden" onClick={() => setIsMobileSidebarOpen(false)} aria-hidden="true" />}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-70 flex w-72 flex-col border-r border-white/10 bg-[#09090b] py-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out min-[769px]:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Teamy mobile navigation"
      >
        {renderSidebarContent(false)}
      </aside>

      <div className={`flex h-screen flex-col transition-all duration-300 ease-in-out max-[768px]:ml-0 ${isSidebarCollapsed ? "ml-20" : "ml-64"}`}>
        <header className="z-60 flex min-h-18 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b]/60 px-8 backdrop-blur-xl max-[768px]:px-4">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="hidden min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-1 text-[#8e9192] transition-colors duration-200 ease-out hover:bg-white/5 hover:text-white max-[768px]:inline-flex"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="max-w-36 truncate text-sm font-bold tracking-tight text-white sm:max-w-64 sm:text-lg">{project.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyHeaderInviteCode()}
                  className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-200 hover:border-[#a855f7]/40 hover:bg-[#a855f7]/15 active:scale-95"
                  title="Click to copy workspace invite code for team members to join"
                >
                  <span className="hidden text-[10px] font-semibold tracking-wider text-[#8e9192] uppercase transition-colors group-hover:text-white/90 sm:inline-block">Invite Code</span>
                  <span className="font-mono text-[11px] font-bold tracking-wider text-[#d8b4fe] sm:text-xs">{project.teamy_code}</span>
                  {isHeaderCodeCopied ? (
                    <Check aria-hidden="true" className="text-[#b9f6ca]" size={12} />
                  ) : (
                    <Copy aria-hidden="true" className="text-[#8e9192] transition-colors group-hover:text-[#d8b4fe]" size={12} />
                  )}
                </button>
                <span className="hidden text-xs font-medium text-[#8e9192]/80 transition-colors xl:inline-block">
                  {isHeaderCodeCopied ? "Copied! Share with teammates" : "Share to invite members"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 max-[768px]:gap-3">
            {/* Online Users */}
            <div className="relative flex items-center max-[640px]:hidden" ref={onlineUsersDropdownRef}>
              <button
                type="button"
                className="flex cursor-pointer items-center -space-x-2 transition-transform duration-200 hover:scale-105"
                onClick={() => setIsOnlineUsersDropdownOpen(!isOnlineUsersDropdownOpen)}
                title="Online members"
              >
                {visibleOnlineMembers.length === 0 ? (
                  <div className="grid size-8 place-items-center rounded-full border-2 border-[#09090b] bg-[#2a2a2e] text-[10px] font-medium text-[#8e9192]">0</div>
                ) : (
                  visibleOnlineMembers.map((member, index) => <AvatarBubble key={member.id} member={member} zIndex={6 - index} />)
                )}
                {onlineMembers.length > 6 && (
                  <div className="grid size-8 place-items-center rounded-full border-2 border-[#09090b] bg-[#2a2a2e] text-[10px] font-medium text-white" style={{ zIndex: 0 }}>
                    +{onlineMembers.length - 6}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {isOnlineUsersDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full right-0 z-50 mt-3 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#18181b]/95 py-2 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="mb-1 border-b border-white/5 px-4 pt-1 pb-2 text-xs font-semibold tracking-wider text-[#8e9192] uppercase">
                      Members Online ({onlineMembers.length}/{sortedPresenceMembers.length})
                    </div>
                    <div className="custom-scrollbar max-h-60 overflow-y-auto">
                      {presenceError ? <div className="px-4 py-2 text-sm text-[#ffdad6]">{presenceError}</div> : null}
                      {sortedPresenceMembers.length === 0 && !presenceError ? <div className="px-4 py-2 text-sm text-[#8e9192]">Loading members...</div> : null}
                      {sortedPresenceMembers.map((member) => {
                        const name = getUserDisplayName(member.user);
                        const secondaryName = getUserSecondaryName(member.user);

                        return (
                          <button
                            key={member.id}
                            className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-2 text-left hover:bg-white/5"
                            onClick={() => {
                              setIsMemberTasksLoading(true);
                              setSelectedTaskMember(member);
                              setIsOnlineUsersDropdownOpen(false);
                            }}
                            type="button"
                          >
                            <AvatarBubble member={member} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-[#e4e1e7]">{name}</div>
                              <div className={`${labelFont} mt-1 truncate text-[#8e9192]`}>{secondaryName}</div>
                            </div>
                            <div className={`shrink-0 text-right text-xs ${member.is_online ? "text-[#b9f6ca]" : "text-[#8e9192]"}`}>{formatLastOnline(member)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-6 max-[768px]:border-l-0 max-[768px]:pl-0">
              <NotificationBell />
              <div className="relative ml-2 flex items-center" ref={profileDropdownRef}>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-3 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-white/5"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                >
                  <div className="max-w-36 pl-2 text-right max-[1040px]:hidden">
                    <p className="m-0 truncate text-sm leading-tight font-medium text-white">{userDisplayName}</p>
                    <p className="m-0 truncate text-xs leading-tight text-[#8e9192]">{userSecondaryName}</p>
                  </div>
                  <UserAvatarImage
                    className="grid size-9 place-items-center overflow-hidden rounded-full text-[10px] font-medium text-white"
                    aria-label="Profile"
                    style={{
                      background: "linear-gradient(150deg, rgba(255,255,255,0.92), rgba(255,255,255,0.12) 35%, rgba(0,0,0,0.96) 36%), #2a2a2e",
                    }}
                    user={user}
                  />
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#18181b]/95 shadow-2xl backdrop-blur-xl"
                    >
                      <button
                        className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-3 text-left text-sm text-[#e4e1e7] transition-colors hover:bg-white/5"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          navigate(`${projectBasePath}/profile`);
                        }}
                        type="button"
                      >
                        <User size={16} className="text-[#8e9192]" />
                        Profile
                      </button>
                      <div className="mx-2 h-px bg-white/5"></div>
                      <button
                        className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-white/5"
                        onClick={() => void onLogout()}
                      >
                        <LogOut size={16} className="text-red-400/80" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
        <ProjectProvider onProjectUpdated={onProjectUpdated} onUserUpdated={onUserUpdated} project={project} user={user}>
          <main className="gpu-scroll custom-scrollbar flex flex-1 flex-col gap-12 overflow-y-auto p-8 max-[768px]:gap-8 max-[768px]:p-4" id="main-scroll-container">
            <PageAnimation className="flex flex-col gap-12 max-[768px]:gap-8">{children}</PageAnimation>
          </main>
        </ProjectProvider>
      </div>

      <AnimatePresence>
        {selectedTaskMember ? (
          <MemberTaskModal
            error={memberTasksError}
            isLoading={isMemberTasksLoading}
            key="member-task-modal"
            member={selectedTaskMember}
            onClose={closeMemberTasksModal}
            onOpenTaskBoard={(taskId) => {
              closeMemberTasksModal();
              navigate(`${projectBasePath}/task-board?highlight=${taskId || ""}`);
            }}
            tasks={memberTasks}
          />
        ) : null}
      </AnimatePresence>

      {/* Online Members Mini Modal for Mobile */}
      <AnimatePresence>
        {isOnlineUsersModalOpen && (
          <AnimatedModal className="z-70" contentClassName="w-full max-w-sm" onBackdropClick={() => setIsOnlineUsersModalOpen(false)}>
            <div className="relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e10]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0e0e10]/95 px-5 py-4 backdrop-blur-xl">
                <div>
                  <h2 className="m-0 text-lg font-bold text-white">Online Members</h2>
                  <p className={`${labelFont} m-0 mt-0.5 text-xs text-[#8e9192] uppercase`}>
                    {onlineMembers.length}/{sortedPresenceMembers.length} active
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnlineUsersModalOpen(false)}
                  className="grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/5 text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="custom-scrollbar max-h-72 overflow-y-auto p-2">
                {presenceError ? <div className="px-4 py-3 text-sm text-[#ffdad6]">{presenceError}</div> : null}
                {sortedPresenceMembers.length === 0 && !presenceError ? <div className="px-4 py-3 text-sm text-[#8e9192]">Loading members...</div> : null}
                {sortedPresenceMembers.map((member) => {
                  const name = getUserDisplayName(member.user);
                  const secondaryName = getUserSecondaryName(member.user);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-white/10 hover:bg-white/5"
                      onClick={() => {
                        setIsMemberTasksLoading(true);
                        setSelectedTaskMember(member);
                        setIsOnlineUsersModalOpen(false);
                        setIsMobileSidebarOpen(false);
                      }}
                    >
                      <AvatarBubble member={member} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-white">{name}</p>
                        <p className={`${labelFont} m-0 truncate text-xs text-[#8e9192]`}>{secondaryName}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold ${member.is_online ? "text-[#b9f6ca]" : "text-[#8e9192]"}`}>
                        {member.is_online ? "Online" : formatLastOnline(member)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </AnimatedModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {globalCreateKind === "task" ? (
          <GlobalTaskCreateModal
            isLeader={project.role === "leader" || project.role === "co_leader"}
            key="global-task-modal"
            members={sortedPresenceMembers}
            onClose={() => setGlobalCreateKind(null)}
            projectId={project.id}
          />
        ) : null}
        {globalCreateKind === "private-task" ? (
          <GlobalPrivateTaskCreateModal key="global-private-task-modal" onClose={() => setGlobalCreateKind(null)} projectId={project.id} userId={user.id} />
        ) : null}
        {globalCreateKind === "announcement" ? (
          <GlobalAnnouncementCreateModal
            isLeader={project.role === "leader" || project.role === "co_leader"}
            key="global-announcement-modal"
            onClose={() => setGlobalCreateKind(null)}
            projectId={project.id}
            projectName={project.name}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default AppShell;
