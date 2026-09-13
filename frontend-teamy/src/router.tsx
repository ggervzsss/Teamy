import type { LucideIcon } from "lucide-react";
import { Activity, CalendarRange, ClipboardList, FolderSymlink, LayoutDashboard, ListTodo, Megaphone, Users } from "lucide-react";

export type AppRoute = {
  icon: LucideIcon;
  label: string;
  path: string;
  searchPlaceholder: string;
  hideFromNav?: boolean;
};

export type AppRouteDefinition = AppRoute & {
  componentName: "DashboardPage" | "TaskBoardPage" | "MyTasksPage" | "AnnouncementPage" | "TimelinePage" | "ActivityFeedPage" | "FileHubPage" | "TeamManagementPage";
};

export const appRouteDefinitions: AppRouteDefinition[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/dashboard",
    searchPlaceholder: "Search Teamy...",
    componentName: "DashboardPage",
  },
  {
    icon: ClipboardList,
    label: "Task Board",
    path: "/task-board",
    searchPlaceholder: "Search tasks...",
    componentName: "TaskBoardPage",
  },
  {
    icon: ListTodo,
    label: "My Tasks",
    path: "/my-tasks",
    searchPlaceholder: "Search my tasks...",
    componentName: "MyTasksPage",
  },
  {
    icon: Megaphone,
    label: "Announcements",
    path: "/announcements",
    searchPlaceholder: "Search announcements...",
    componentName: "AnnouncementPage",
  },
  {
    icon: CalendarRange,
    label: "Timeline",
    path: "/timeline",
    searchPlaceholder: "Search timeline...",
    componentName: "TimelinePage",
  },
  {
    icon: Activity,
    label: "Activity",
    path: "/activity",
    searchPlaceholder: "Search activity...",
    componentName: "ActivityFeedPage",
    hideFromNav: true,
  },
  {
    icon: FolderSymlink,
    label: "Resources",
    path: "/file-hub",
    searchPlaceholder: "Search resources...",
    componentName: "FileHubPage",
  },
  {
    icon: Users,
    label: "Team Management",
    path: "/team-management",
    searchPlaceholder: "Search members...",
    componentName: "TeamManagementPage",
  },
];

export const appRoutes: AppRoute[] = appRouteDefinitions
  .filter((route) => !route.hideFromNav)
  .map((route) => ({
    icon: route.icon,
    label: route.label,
    path: route.path,
    searchPlaceholder: route.searchPlaceholder,
  }));

export function getRouteByPath(pathname: string) {
  return appRouteDefinitions.find((route) => pathname.endsWith(route.path) || pathname.includes(`${route.path}/`)) ?? appRouteDefinitions[0];
}
