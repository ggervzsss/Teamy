import { ArrowLeft, CalendarClock, Filter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAnnouncementSocketTicket, getAnnouncementSocketUrl, listAnnouncements } from "@/features/announcement/api";
import type { AnnouncementSocketEvent, TeamyAnnouncement } from "@/features/announcement/api";
import { listFileResources } from "@/features/filehub/api";
import type { FileResourceSummary } from "@/features/filehub/api";
import { getTaskSocketTicket, getTaskSocketUrl, listTasks } from "@/features/taskboard/api";
import type { TaskSocketEvent, TeamyTask } from "@/features/taskboard/api";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { Skeleton } from "@/shared/components/Skeleton";
import { formatRelativeTime, parseApiDateTime, toApiDate } from "@/shared/dateTime";
import { activityKindIcons, activityKindLabels, buildActivityItems, formatActivityTimestamp } from "../utils/activityFeedUtils";
import type { ActivityItem, ActivityKind } from "../utils/activityFeedUtils";

type ActivityFilter = ActivityKind | "all";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-white outline-none transition-colors placeholder:text-[#8e9192] focus:border-white";

function upsertTask(tasks: TeamyTask[], nextTask: TeamyTask) {
  const existingIndex = tasks.findIndex((task) => task.id === nextTask.id);
  const nextTasks = existingIndex === -1 ? [nextTask, ...tasks] : tasks.map((task) => (task.id === nextTask.id ? nextTask : task));
  return nextTasks.sort((a, b) => parseApiDateTime(b.updated_at) - parseApiDateTime(a.updated_at));
}

function upsertAnnouncement(announcements: TeamyAnnouncement[], nextAnnouncement: TeamyAnnouncement, currentUserId: string) {
  const existing = announcements.find((announcement) => announcement.id === nextAnnouncement.id);
  const mergedAnnouncement = {
    ...nextAnnouncement,
    is_read: existing?.is_read ?? (nextAnnouncement.created_by.id === currentUserId || nextAnnouncement.is_read),
  };
  const nextAnnouncements = existing ? announcements.map((announcement) => (announcement.id === nextAnnouncement.id ? mergedAnnouncement : announcement)) : [mergedAnnouncement, ...announcements];
  return nextAnnouncements.sort((a, b) => parseApiDateTime(b.updated_at) - parseApiDateTime(a.updated_at));
}

function getDayLabel(timestamp: string) {
  const date = toApiDate(timestamp);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(date);
}

function ActivityFeedPage() {
  const { project, user } = useProjectContext();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<TeamyAnnouncement[]>([]);
  const [tasks, setTasks] = useState<TeamyTask[]>([]);
  const [files, setFiles] = useState<FileResourceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");

  useEffect(() => {
    let isMounted = true;

    Promise.all([listAnnouncements(project.id), listTasks(project.id), listFileResources(project.id)])
      .then(([nextAnnouncements, nextTasks, nextFiles]) => {
        if (isMounted) {
          setAnnouncements(nextAnnouncements.sort((a, b) => parseApiDateTime(b.updated_at) - parseApiDateTime(a.updated_at)));
          setTasks(nextTasks.sort((a, b) => parseApiDateTime(b.updated_at) - parseApiDateTime(a.updated_at)));
          setFiles(nextFiles);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load project activity.");
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

      void getTaskSocketTicket(project.id)
        .then((ticket) => {
          if (!isActive) {
            return;
          }
          socket = new WebSocket(getTaskSocketUrl(project.id, ticket));
          socket.addEventListener("message", (event) => {
            const data = JSON.parse(event.data as string) as TaskSocketEvent;
            if (data.task?.project_id === project.id) {
              setTasks((currentTasks) => upsertTask(currentTasks, data.task));
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

  useEffect(() => {
    let socket: WebSocket | null = null;
    let isActive = true;
    const connectTimer = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      void getAnnouncementSocketTicket(project.id)
        .then((ticket) => {
          if (!isActive) {
            return;
          }
          socket = new WebSocket(getAnnouncementSocketUrl(project.id, ticket));
          socket.addEventListener("message", (event) => {
            const data = JSON.parse(event.data as string) as AnnouncementSocketEvent;
            if ((data.event === "announcement.created" || data.event === "announcement.updated") && data.announcement.project_id === project.id) {
              setAnnouncements((currentAnnouncements) => upsertAnnouncement(currentAnnouncements, data.announcement, user.id));
            }
            if (data.event === "announcement.deleted") {
              setAnnouncements((currentAnnouncements) => currentAnnouncements.filter((announcement) => announcement.id !== data.announcement_id));
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
  }, [project.id, user.id]);

  const activityItems = useMemo(() => buildActivityItems(project.slug, announcements, tasks, files), [announcements, files, project.slug, tasks]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return activityItems.filter((item) => {
      const matchesKind = filter === "all" || item.kind === filter;
      const matchesQuery = !normalizedQuery || `${item.actor} ${item.description} ${item.title}`.toLowerCase().includes(normalizedQuery);
      return matchesKind && matchesQuery;
    });
  }, [activityItems, filter, query]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Array<{ label: string; items: ActivityItem[] }>>((groups, item) => {
      const label = getDayLabel(item.timestamp);
      const existingGroup = groups.find((group) => group.label === label);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
      return groups;
    }, []);
  }, [filteredItems]);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col items-start">
          <button
            className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            onClick={() => navigate(`/projects/${project.slug}/dashboard`)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Back
          </button>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Recent Activity Feed</h1>
          <p className="m-0 mt-1 text-sm text-[#8e9192]">A project-wide timeline of task, announcement, and resource changes visible to every member.</p>
        </div>
        <div className={`${labelFont} inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[#c4c7c8] uppercase`}>
          <CalendarClock aria-hidden="true" size={16} />
          {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="relative w-full max-w-md">
          <Search aria-hidden="true" className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8e9192]" size={18} />
          <input className={`${inputClass} rounded-full pl-10 focus:border-[#a855f7]/50`} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity..." value={query} />
        </div>
        <label className="flex w-full max-w-56 flex-col gap-2">
          <span className={`${labelFont} inline-flex items-center gap-2 text-[#8e9192] uppercase`}>
            <Filter aria-hidden="true" className="text-[#a855f7]" size={14} />
            Type
          </span>
          <select className={`${inputClass} focus:border-[#a855f7]/50`} onChange={(event) => setFilter(event.target.value as ActivityFilter)} value={filter}>
            {(["all", "task", "announcement", "file"] as ActivityFilter[]).map((kind) => (
              <option key={kind} value={kind}>
                {activityKindLabels[kind]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <div className={`${panelClass} flex flex-col overflow-hidden`}>
              {[1, 2, 3].map((i) => (
                <div className="flex w-full gap-4 border-b border-white/8 p-5 last:border-b-0" key={i}>
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : groupedItems.length === 0 ? (
        <div className={`${panelClass} px-6 py-12 text-center text-[#8e9192]`}>No activity found.</div>
      ) : (
        <div className="flex flex-col gap-8">
          {groupedItems.map((group) => (
            <section className="flex flex-col gap-3" key={group.label}>
              <h2 className={`${labelFont} m-0 font-semibold text-[#e4e1e7] uppercase`}>{group.label}</h2>
              <div className={`${panelClass} overflow-hidden`}>
                {group.items.map((item) => (
                  <ActivityRow item={item} key={item.id} onOpen={() => navigate(item.targetPath)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityRow({ item, onOpen }: { item: ActivityItem; onOpen: () => void }) {
  const Icon = activityKindIcons[item.kind];
  return (
    <button
      className="group flex w-full cursor-pointer gap-4 border-0 border-b border-l-2 border-white/8 border-l-transparent bg-transparent p-5 text-left transition-all duration-200 last:border-b-0 hover:border-l-[#a855f7] hover:bg-white/6"
      onClick={onOpen}
      type="button"
    >
      <span className="z-10 grid size-10 shrink-0 place-items-center rounded-full border border-[#a855f7]/30 bg-[#18181b] text-[#d8b4fe] shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-all duration-300 group-hover:scale-110 group-hover:border-[#a855f7]/60 group-hover:bg-[#a855f7]/20 group-hover:text-white">
        <Icon aria-hidden="true" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[#8e9192]">
          <strong className="font-semibold text-white">{item.actor}</strong> {item.description}{" "}
          <span className="font-medium text-[#e4e1e7] transition-colors group-hover:text-[#d8b4fe]">{item.title}</span>
        </span>
        <span className={`${labelFont} mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-[#8e9192]`}>
          <span>{formatRelativeTime(item.timestamp)}</span>
          <span>{"\u2022"}</span>
          <span>{formatActivityTimestamp(item.timestamp)}</span>
          <span>{"\u2022"}</span>
          <span className="rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d8b4fe] uppercase">{activityKindLabels[item.kind]}</span>
        </span>
      </span>
    </button>
  );
}

export default ActivityFeedPage;
