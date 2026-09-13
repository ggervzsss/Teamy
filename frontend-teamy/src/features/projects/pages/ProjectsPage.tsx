import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowRight, KeyRound, Layers, Loader2, Plus, Shield, Upload, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "@/features/auth";
import { importProjectBackup } from "@/features/projects/api";
import { projectKeys, useProjects } from "@/features/projects/hooks";
import type { TeamyProject } from "@/features/projects/api";
import ProjectsTopBar from "@/features/projects/components/ProjectsTopBar";
import { Skeleton } from "@/shared/components/Skeleton";
import { PageAnimation } from "@/shared/components";
import { getRichTextPlainText } from "@/shared/richText";

import { CreateProjectModal } from "../components/CreateProjectModal";
import { JoinProjectModal } from "../components/JoinProjectModal";

type ProjectsPageProps = {
  onLogout: () => Promise<void>;
  onUnauthorized: () => void;
  user: AuthUser;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

import ProjectAvatar from "@/shared/components/ProjectAvatar";
import { getProjectTheme } from "@/shared/projectThemes";

function ProjectCard({ project }: { project: TeamyProject }) {
  const navigate = useNavigate();
  const isLeader = project.role === "leader" || project.role === "co_leader";
  const isArchived = project.archived_at !== null;
  const theme = getProjectTheme(project.color_theme, project.id);

  return (
    <article
      className="group relative flex cursor-pointer flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-5 transition-all duration-300 hover:border-[#a855f7]/40 hover:bg-white/6 hover:shadow-[0_12px_36px_rgba(168,85,247,0.15)] active:scale-[0.99]"
      onClick={() => navigate(`/projects/${project.slug}/dashboard`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/projects/${project.slug}/dashboard`);
      }}
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 opacity-90" style={{ background: `linear-gradient(90deg, transparent, ${theme.hex}, transparent)` }} />

      {/* Header row */}
      <div className="flex items-start gap-4">
        <ProjectAvatar colorTheme={project.color_theme} iconUrl={project.icon_url} name={project.name} projectId={project.id} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {isLeader && (
              <span className={`${labelFont} inline-flex items-center gap-1 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/20 px-2.5 py-0.5 text-[10px] font-semibold text-[#d8b4fe] uppercase shadow-[0_0_12px_rgba(168,85,247,0.2)]`}>
                <Shield size={11} />
                Leader
              </span>
            )}
            {isArchived && (
              <span className={`${labelFont} inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#f59e0b] uppercase`}>
                <Archive size={11} />
                Archived
              </span>
            )}
          </div>
          <h2 className="m-0 line-clamp-1 text-lg leading-tight font-bold text-white transition-colors group-hover:text-[#d8b4fe]">{project.name}</h2>
        </div>
      </div>

      {/* Description */}
      <p className="m-0 line-clamp-2 flex-1 text-sm leading-relaxed text-[#8e9192] transition-colors group-hover:text-[#c4c7c8]">{project.description ? getRichTextPlainText(project.description) : "No description provided."}</p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-4">
        <div className="flex items-center gap-4">
          <span className={`${labelFont} inline-flex items-center gap-1.5 font-medium text-[#8e9192] uppercase`}>
            <Users size={13} />
            {project.member_count} {project.member_count === 1 ? "member" : "members"}
          </span>
          <code className={`${labelFont} rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#c4c7c8]`}>{project.teamy_code}</code>
        </div>
        <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-[#8e9192] transition-all duration-200 group-hover:border-[#a855f7]/40 group-hover:bg-[#a855f7]/20 group-hover:text-[#d8b4fe]">
          <ArrowRight size={15} />
        </span>
      </div>
    </article>
  );
}

function ProjectsPage({ onLogout, user }: ProjectsPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading, error: queryError } = useProjects();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const triggerBufferRef = useRef("");
  const [isImportUnlocked, setIsImportUnlocked] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const error = queryError instanceof Error ? queryError.message : "";

  const activeProjects = projects.filter((p) => p.archived_at === null);
  const archivedProjects = projects.filter((p) => p.archived_at !== null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsImportUnlocked(false);
        triggerBufferRef.current = "";
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) {
        return;
      }
      triggerBufferRef.current = `${triggerBufferRef.current}${event.key.toLowerCase()}`.slice(-12);
      if (triggerBufferRef.current.endsWith("importbackup")) {
        setIsImportUnlocked(true);
        setImportError("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleImportBackup(file: File) {
    setIsImporting(true);
    setImportError("");
    try {
      const importedProject = await importProjectBackup(file);
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Project backup imported.");
      navigate(`/projects/${importedProject.slug}/dashboard`);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not import the project backup.";
      setImportError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#09090b] text-[#e4e1e7]">
      <ProjectsTopBar onLogout={onLogout} user={user} />

      <main className="custom-scrollbar flex-1 overflow-y-auto" id="main-scroll-container">
        <div className="mx-auto w-full max-w-275 px-6 py-12 max-[640px]:px-4">
          <PageAnimation className="flex flex-col gap-10">
            {/* Page header */}
            <header className="flex flex-col gap-2">
              <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Projects</h1>
              <p className="m-0 mt-1 text-sm text-[#8e9192]">Choose a project, create a new workspace, or join your team with a Teamy code.</p>
            </header>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-8">
              <button
                type="button"
                className={`${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center gap-2 rounded-lg px-5 py-3 text-xs font-bold uppercase`}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus aria-hidden="true" size={16} />
                Create Project
              </button>
              <button
                type="button"
                className={`${labelFont} inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center gap-2 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 px-5 py-3 text-xs font-bold text-white uppercase transition-all duration-200 hover:bg-[#a855f7]/20 active:scale-95`}
                onClick={() => setIsJoinModalOpen(true)}
              >
                <KeyRound aria-hidden="true" size={16} />
                Join with Code
              </button>
              {isImportUnlocked ? (
                <>
                  <button
                    className={`${labelFont} inline-flex items-center gap-2 rounded-lg border border-white/15 bg-linear-to-b from-white/8 to-white/2 px-5 py-3.5 text-[#c4c7c8] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all hover:border-white/25 hover:from-white/12 hover:to-white/5 hover:text-white disabled:opacity-60`}
                    disabled={isImporting}
                    onClick={() => importInputRef.current?.click()}
                    type="button"
                  >
                    {isImporting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Upload aria-hidden="true" size={16} />}
                    Import Backup
                  </button>
                  <input
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleImportBackup(file);
                      }
                    }}
                    ref={importInputRef}
                    type="file"
                  />
                </>
              ) : null}
            </div>

            {/* Error */}
            {error ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error}</div> : null}
            {importError ? <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{importError}</div> : null}

            {/* Loading skeletons */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div className="flex animate-pulse flex-col gap-4 rounded-2xl border border-white/10 bg-white/3 p-5" key={i}>
                    <div className="flex items-start gap-4">
                      <Skeleton className="size-12 rounded-xl" />
                      <div className="flex flex-1 flex-col gap-2 pt-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-3/4" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex items-center justify-between border-t border-white/6 pt-4">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="size-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Empty state */}
            {!isLoading && !error && projects.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/2 py-20 text-center">
                <div className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Layers size={32} className="text-white/30" />
                </div>
                <div>
                  <h3 className="m-0 text-xl font-bold text-white">No projects yet</h3>
                  <p className="m-0 mt-2 max-w-sm text-[#8e9192]">Create your first workspace or join one using a Teamy code.</p>
                </div>
              </div>
            ) : null}

            {/* Active projects */}
            {!isLoading && !error && activeProjects.length > 0 ? (
              <section className="flex flex-col gap-4">
                <h2 className={`${labelFont} m-0 text-[#6b7280] uppercase`}>Active — {activeProjects.length}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Archived projects */}
            {!isLoading && !error && archivedProjects.length > 0 ? (
              <section className="flex flex-col gap-4">
                <h2 className={`${labelFont} m-0 text-[#6b7280] uppercase`}>Archived — {archivedProjects.length}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            ) : null}
          </PageAnimation>
        </div>
      </main>

      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <JoinProjectModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </div>
  );
}

export default ProjectsPage;
