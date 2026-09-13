import type { ReactNode } from "react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthPage, getCurrentUser, getGoogleLoginUrl, logout } from "@/features/auth";
import type { AuthUser } from "@/features/auth";
import { TOKEN_STORAGE_KEY } from "@/shared/api";
import { getProject, getProjectBySlug } from "@/features/projects";
import type { TeamyProject } from "@/features/projects";
import ProjectsTopBar from "@/features/projects/components/ProjectsTopBar";
import { appRouteDefinitions } from "@/router";
import { AppShell, PageAnimation, ScrollToTop } from "@/shared/components";
import { useAuthStore } from "@/shared/stores/authStore";

const AnnouncementPage = lazy(() => import("@/features/announcement").then((m) => ({ default: m.AnnouncementPage })));
const ActivityFeedPage = lazy(() => import("@/features/dashboard").then((m) => ({ default: m.ActivityFeedPage })));
const DashboardPage = lazy(() => import("@/features/dashboard").then((m) => ({ default: m.DashboardPage })));
const FileHubPage = lazy(() => import("@/features/filehub").then((m) => ({ default: m.FileHubPage })));
const MyTasksPage = lazy(() => import("@/features/mytasks").then((m) => ({ default: m.MyTasksPage })));
const TaskBoardPage = lazy(() => import("@/features/taskboard").then((m) => ({ default: m.TaskBoardPage })));
const TeamManagementPage = lazy(() => import("@/features/teammanagement").then((m) => ({ default: m.TeamManagementPage })));
const TimelinePage = lazy(() => import("@/features/timeline").then((m) => ({ default: m.TimelinePage })));

const FileHubDocPage = lazy(() => import("@/features/filehub").then((m) => ({ default: m.FileHubDocPage })));
const NotificationsPage = lazy(() => import("@/features/notifications").then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import("@/features/profile").then((m) => ({ default: m.ProfilePage })));
const ProjectsPage = lazy(() => import("@/features/projects").then((m) => ({ default: m.ProjectsPage })));
const WorkspaceSettingsPage = lazy(() => import("@/features/projects").then((m) => ({ default: m.WorkspaceSettingsPage })));

const routeComponents: Record<string, React.ComponentType> = {
  AnnouncementPage,
  ActivityFeedPage,
  DashboardPage,
  FileHubPage,
  MyTasksPage,
  TaskBoardPage,
  TeamManagementPage,
  TimelinePage,
};

function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center bg-[#09090b] text-white">Loading Teamy...</main>;
}

/**
 * Handles the redirect from the Google OAuth callback.
 * Reads the session JWT from the URL hash (#token=...) or query param, stores it in
 * localStorage, verifies it by fetching the current user, then navigates to /projects.
 */
function AuthCallbackPage() {
  const { setUser, clearUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search);
    const tokenFromUrl = hashParams.get("token") || searchParams.get("token");

    if (tokenFromUrl) {
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenFromUrl);
    }

    getCurrentUser()
      .then((user) => {
        setUser(user);
        navigate("/projects", { replace: true });
      })
      .catch(() => {
        clearUser();
        toast.error("Google authentication failed.");
        navigate("/login", { replace: true });
      });
  }, [location.hash, location.search, setUser, clearUser, navigate]);

  return <LoadingScreen />;
}

function ProjectShellRoute({
  children,
  onLogout,
  onUnauthorized,
  onUserUpdated,
  user,
}: {
  children: ReactNode;
  onLogout: () => Promise<void>;
  onUnauthorized: () => void;
  onUserUpdated: (user: AuthUser) => void;
  user: AuthUser;
}) {
  const { projectSlug } = useParams();
  const [project, setProject] = useState<TeamyProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!projectSlug) {
      return;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectSlug);
    const fetchProject = isUuid ? getProject(projectSlug) : getProjectBySlug(projectSlug);

    fetchProject
      .then((nextProject) => {
        if (isMounted) {
          setProject(nextProject);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          if (caughtError instanceof Error && caughtError.message === "Unauthorized") {
            onUnauthorized();
          } else {
            setProject(null);
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProject(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectSlug, onUnauthorized]);

  if (isLoadingProject) {
    return <LoadingScreen />;
  }

  if (!project) {
    return <Navigate replace to="/projects" />;
  }

  return (
    <AppShell onLogout={onLogout} onProjectUpdated={(nextProject) => setProject(nextProject)} onUserUpdated={onUserUpdated} project={project} user={user}>
      {children}
    </AppShell>
  );
}

function AppRoutes() {
  const { user, setUser, clearUser, isLoading: isAuthLoading } = useAuthStore();
  const location = useLocation();
  const isCallbackRoute = location.pathname === "/auth/callback";
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    if (window.location.pathname === "/auth/callback") {
      return false;
    }
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
  });

  useEffect(() => {
    let isMounted = true;

    if (location.pathname === "/auth/callback") {
      return;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      clearUser();
      return;
    }

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          clearUser();
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsInitialLoad(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname, setUser, clearUser]);

  async function handleLogout() {
    await logout();
    clearUser();
    toast.success("Logged out.");
  }

  const handleUnauthorized = useCallback(() => {
    clearUser();
  }, [clearUser]);

  function handleGoogleAuthenticate() {
    window.location.assign(getGoogleLoginUrl());
  }

  if (!isCallbackRoute && (isInitialLoad || (isAuthLoading && user === null))) {
    return <LoadingScreen />;
  }

  const isAuthenticated = user !== null;
  const authPage = <AuthPage onGoogleAuthenticate={handleGoogleAuthenticate} />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Auth callback must be first — always accessible, regardless of auth state */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={<Navigate replace to={isAuthenticated ? "/projects" : "/login"} />} />
        <Route path="/login" element={isAuthenticated ? <Navigate replace to="/projects" /> : authPage} />
        <Route path="/projects" element={isAuthenticated ? <ProjectsPage onLogout={handleLogout} onUnauthorized={handleUnauthorized} user={user} /> : <Navigate replace to="/login" />} />
        <Route path="/projects/create" element={<Navigate replace to="/projects" />} />
        <Route path="/projects/join" element={<Navigate replace to="/projects" />} />
        {appRouteDefinitions.map((route) => {
          const Component = routeComponents[route.componentName];
          return (
            <Route
              key={route.path}
              path={`/projects/:projectSlug${route.path}`}
              element={
                isAuthenticated ? (
                  <ProjectShellRoute onLogout={handleLogout} onUnauthorized={handleUnauthorized} onUserUpdated={setUser} user={user}>
                    <Component />
                  </ProjectShellRoute>
                ) : (
                  <Navigate replace state={{ from: location.pathname }} to="/login" />
                )
              }
            />
          );
        })}
        <Route
          path="/projects/:projectSlug/settings"
          element={
            isAuthenticated ? (
              <ProjectShellRoute onLogout={handleLogout} onUnauthorized={handleUnauthorized} onUserUpdated={setUser} user={user}>
                <WorkspaceSettingsPage />
              </ProjectShellRoute>
            ) : (
              <Navigate replace state={{ from: location.pathname }} to="/login" />
            )
          }
        />
        <Route
          path="/projects/:projectSlug/profile"
          element={
            isAuthenticated ? (
              <ProjectShellRoute onLogout={handleLogout} onUnauthorized={handleUnauthorized} onUserUpdated={setUser} user={user}>
                <ProfilePage user={user} onUserUpdated={setUser} />
              </ProjectShellRoute>
            ) : (
              <Navigate replace state={{ from: location.pathname }} to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <div className="flex h-screen flex-col bg-[#09090b] text-[#e4e1e7]">
                <ProjectsTopBar onLogout={handleLogout} user={user} />
                <main className="custom-scrollbar mx-auto flex w-full max-w-360 flex-1 flex-col gap-12 overflow-y-auto px-6 py-12 max-[640px]:px-4" id="main-scroll-container">
                  <PageAnimation className="flex flex-col gap-12 max-[640px]:gap-8">
                    <ProfilePage user={user} onUserUpdated={setUser} />
                  </PageAnimation>
                </main>
              </div>
            ) : (
              <Navigate replace state={{ from: location.pathname }} to="/login" />
            )
          }
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated ? (
              <div className="flex h-screen flex-col bg-[#09090b] text-[#e4e1e7]">
                <ProjectsTopBar onLogout={handleLogout} user={user} />
                <main className="custom-scrollbar mx-auto flex w-full max-w-360 flex-1 flex-col gap-12 overflow-y-auto px-6 py-12 max-[640px]:px-4" id="main-scroll-container">
                  <PageAnimation className="flex flex-col gap-12 max-[640px]:gap-8">
                    <NotificationsPage />
                  </PageAnimation>
                </main>
              </div>
            ) : (
              <Navigate replace state={{ from: location.pathname }} to="/login" />
            )
          }
        />
        <Route
          path="/projects/:projectSlug/file-hub/:resourceId"
          element={
            isAuthenticated ? (
              <ProjectShellRoute onLogout={handleLogout} onUnauthorized={handleUnauthorized} onUserUpdated={setUser} user={user}>
                <FileHubDocPage />
              </ProjectShellRoute>
            ) : (
              <Navigate replace state={{ from: location.pathname }} to="/login" />
            )
          }
        />
        <Route path="/dashboard" element={<Navigate replace to={isAuthenticated ? "/projects" : "/login"} />} />
        <Route path="*" element={<Navigate replace to={isAuthenticated ? "/projects" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
