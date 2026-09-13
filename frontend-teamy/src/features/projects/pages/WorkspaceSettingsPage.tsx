import { useMemo, useRef, useState } from "react";
import { Archive, Check, Download, Loader2, Palette, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import { AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router-dom";
import { downloadProjectBackup } from "@/features/projects/api";
import { useArchiveProject, useDeleteProject, useRemoveProjectIcon, useUpdateProject, useUploadProjectIcon } from "@/features/projects/hooks";
import ProjectAvatar from "@/shared/components/ProjectAvatar";
import { useProjectContext } from "@/shared/components/useProjectContext";
import { toApiDate } from "@/shared/dateTime";
import { PROJECT_ICON_OPTIONS, PROJECT_THEMES } from "@/shared/projectThemes";
import type { ProjectColorTheme } from "@/shared/projectThemes";
import { getUserDisplayName } from "@/shared/userDisplay";
import { useScrollLock } from "@/shared/useScrollLock";
import type { DialogMode } from "../components/WorkspaceConfirmDialog";
import { WorkspaceConfirmDialog } from "../components/WorkspaceConfirmDialog";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-bold leading-none tracking-wider";
const panelClass = "gpu-panel relative overflow-hidden rounded-xl border border-white/15 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30";
const primaryButton = `${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50`;
const dangerOutlineButton = `${labelFont} inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ffb4ab]/30 bg-transparent px-4 py-2.5 text-xs font-bold text-[#ffb4ab] uppercase transition-all duration-200 hover:bg-[#ffb4ab]/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
const dangerSolidButton = `${labelFont} inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ffb4ab] bg-[#ffb4ab] px-4 py-2.5 text-xs font-bold text-[#690005] uppercase transition-all duration-200 hover:bg-[#ffd5d0] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;


function WorkspaceSettingsPage() {
  const { onProjectUpdated, project, user } = useProjectContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [workspaceName, setWorkspaceName] = useState(project.name);
  const [workspaceDescription, setWorkspaceDescription] = useState(project.description ?? "");
  const [selectedTheme, setSelectedTheme] = useState<string>(project.color_theme || "purple");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(project.icon_url ?? null);
  const [customHex, setCustomHex] = useState(project.color_theme?.startsWith("#") ? project.color_theme : "");

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [dialogStep, setDialogStep] = useState(1);
  const [archivePhrase, setArchivePhrase] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [error, setError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [appearanceError, setAppearanceError] = useState("");
  const [backupError, setBackupError] = useState("");
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  const renameMutation = useUpdateProject(project.id);
  const archiveMutation = useArchiveProject(project.id);
  const deleteMutation = useDeleteProject(project.id);
  const uploadIconMutation = useUploadProjectIcon(project.id);
  const removeIconMutation = useRemoveProjectIcon(project.id);

  const isSubmitting = renameMutation.isPending || archiveMutation.isPending || deleteMutation.isPending || uploadIconMutation.isPending || removeIconMutation.isPending;

  const trimmedName = workspaceName.trim();
  const hasNameChanged = trimmedName !== project.name && trimmedName.length > 0;
  const trimmedDescription = workspaceDescription.trim();
  const initialDescription = (project.description ?? "").trim();
  const hasDescriptionChanged = trimmedDescription !== initialDescription;

  const activeColorTheme = customHex ? customHex : selectedTheme;
  const hasAppearanceChanged = activeColorTheme !== (project.color_theme || "purple") || (selectedIcon ?? "") !== (project.icon_url ?? "");
  const isImageAvatar = project.icon_url && (project.icon_url.startsWith("http://") || project.icon_url.startsWith("https://"));

  const isArchived = project.archived_at !== null;
  const createdDate = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(toApiDate(project.created_at)), [project.created_at]);
  const archivedDate = useMemo(
    () => (project.archived_at ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(toApiDate(project.archived_at)) : ""),
    [project.archived_at],
  );

  useScrollLock(dialogMode !== null);

  if (project.role !== "leader" && project.role !== "co_leader") {
    return <Navigate to={`/projects/${project.slug}/dashboard`} replace />;
  }

  function openDialog(mode: DialogMode) {
    setDialogMode(mode);
    setDialogStep(1);
    setArchivePhrase("");
    setDeleteName("");
    setDeletePhrase("");
    setError("");
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }
    setDialogMode(null);
  }

  async function handleRename() {
    setError("");
    try {
      const nextProject = await renameMutation.mutateAsync({ name: trimmedName });
      onProjectUpdated?.(nextProject);
      setWorkspaceName(nextProject.name);
      setDialogMode(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not rename the workspace.");
    }
  }

  async function handleSaveDescription() {
    setDescriptionError("");
    setIsSavingDescription(true);
    try {
      const nextProject = await renameMutation.mutateAsync({
        description: trimmedDescription || null,
      });
      onProjectUpdated?.(nextProject);
      setWorkspaceDescription(nextProject.description ?? "");
      toast.success("Workspace description updated.");
    } catch (caughtError) {
      setDescriptionError(caughtError instanceof Error ? caughtError.message : "Could not update description.");
    } finally {
      setIsSavingDescription(false);
    }
  }

  async function handleSaveAppearance() {
    setAppearanceError("");
    setIsSavingAppearance(true);
    try {
      const nextProject = await renameMutation.mutateAsync({
        color_theme: activeColorTheme,
        icon_url: selectedIcon,
      });
      onProjectUpdated?.(nextProject);
      toast.success("Workspace branding updated.");
    } catch (caughtError) {
      setAppearanceError(caughtError instanceof Error ? caughtError.message : "Could not update appearance.");
    } finally {
      setIsSavingAppearance(false);
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const nextProject = await uploadIconMutation.mutateAsync(file);
      setSelectedIcon(nextProject.icon_url ?? null);
      onProjectUpdated?.(nextProject);
    } catch {
      // Error handled by mutation toast
    }
  }

  async function handleRemoveImage() {
    try {
      const nextProject = await removeIconMutation.mutateAsync();
      setSelectedIcon(null);
      onProjectUpdated?.(nextProject);
    } catch {
      // Error handled by mutation toast
    }
  }

  async function handleArchive() {
    setError("");
    try {
      const nextProject = await archiveMutation.mutateAsync();
      onProjectUpdated?.(nextProject);
      setDialogMode(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not archive the workspace.");
    }
  }

  async function handleDelete() {
    setError("");
    try {
      await deleteMutation.mutateAsync(deleteName);
      navigate("/projects", { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete the workspace.");
    }
  }

  async function handleExportBackup() {
    setBackupError("");
    setIsExportingBackup(true);
    try {
      await downloadProjectBackup(project.id, project.name);
    } catch (caughtError) {
      setBackupError(caughtError instanceof Error ? caughtError.message : "Could not export the workspace backup.");
    } finally {
      setIsExportingBackup(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-360 flex-col gap-8">
      <header>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Workspace Settings</h1>
        <p className="m-0 mt-1 text-sm text-[#8e9192]">Manage your team workspace preferences and owner-only project controls.</p>
      </header>

      {isArchived ? (
        <div className="flex items-start gap-3 rounded-lg border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffdad6]">
          <Archive aria-hidden="true" className="mt-1 shrink-0" size={18} />
          <div>
            <p className="m-0 font-bold text-white">This workspace is archived.</p>
            <p className="m-0 text-sm text-[#ffdad6]">It became read-only on {archivedDate}. Members can still view existing project content.</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Workspace Branding & Customization */}
          <section className={panelClass}>
            <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-[#a855f7]/40 to-transparent" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="m-0 text-2xl leading-tight font-bold text-white">Workspace Appearance</h2>
                <p className="m-0 mt-1 text-sm text-[#8e9192]">Upload a workspace image or pick an icon and custom theme color.</p>
              </div>
              <ProjectAvatar colorTheme={activeColorTheme} iconUrl={selectedIcon} name={project.name} projectId={project.id} size="xl" />
            </div>

            <div className="flex flex-col gap-6">
              {/* Image Upload section */}
              <div className="flex flex-col gap-3">
                <label className={`${labelFont} text-[#8e9192] uppercase`}>Workspace Image / Avatar</label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={`${labelFont} inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white uppercase transition-all hover:bg-white/10`}
                    disabled={uploadIconMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {uploadIconMutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <Upload aria-hidden="true" size={15} />}
                    Upload Image
                  </button>

                  {isImageAvatar ? (
                    <button
                      className={`${labelFont} inline-flex items-center gap-2 rounded-lg border border-[#ffb4ab]/30 bg-transparent px-4 py-2.5 text-xs text-[#ffb4ab] uppercase hover:bg-[#ffb4ab]/10`}
                      disabled={removeIconMutation.isPending}
                      onClick={handleRemoveImage}
                      type="button"
                    >
                      {removeIconMutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <Trash2 aria-hidden="true" size={15} />}
                      Remove Image
                    </button>
                  ) : null}

                  <input accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelected} ref={fileInputRef} type="file" />
                </div>
                <p className="m-0 text-xs text-[#8e9192]">Upload a PNG, JPEG, or WebP file (up to 5MB) for your workspace logo.</p>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Icon Selector */}
              <div className="flex flex-col gap-3">
                <label className={`${labelFont} text-[#8e9192] uppercase`}>Preset Workspace Icon</label>
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                  <button
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all ${
                      selectedIcon === null ? "border-white bg-white/15 text-white shadow-md" : "border-white/10 bg-white/3 text-[#8e9192] hover:bg-white/6 hover:text-white"
                    }`}
                    onClick={() => setSelectedIcon(null)}
                    type="button"
                  >
                    <RotateCcw size={18} />
                    <span className="text-[10px] font-medium uppercase">Initials</span>
                  </button>
                  {PROJECT_ICON_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all ${
                        selectedIcon === item.id ? "border-white bg-white/15 text-white shadow-md" : "border-white/10 bg-white/3 text-[#8e9192] hover:bg-white/6 hover:text-white"
                      }`}
                      onClick={() => setSelectedIcon(item.id)}
                      type="button"
                    >
                      <ProjectAvatar colorTheme={activeColorTheme} iconUrl={item.id} name={project.name} projectId={project.id} size="sm" />
                      <span className="text-[10px] font-medium uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Color Theme Selector */}
              <div className="flex flex-col gap-3">
                <label className={`${labelFont} text-[#8e9192] uppercase`}>Workspace Color Theme</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(Object.keys(PROJECT_THEMES) as ProjectColorTheme[]).map((themeKey) => {
                    const themeObj = PROJECT_THEMES[themeKey];
                    const isSelected = !customHex && selectedTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                          isSelected ? "border-white bg-white/15 text-white shadow-md" : "border-white/10 bg-white/3 text-[#c4c7c8] hover:bg-white/6 hover:text-white"
                        }`}
                        onClick={() => {
                          setCustomHex("");
                          setSelectedTheme(themeKey);
                        }}
                        type="button"
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full shadow-inner" style={{ background: themeObj.gradient }}>
                          {isSelected ? <Check size={14} className="text-white drop-shadow-sm" /> : null}
                        </span>
                        <span className="truncate text-xs font-semibold">{themeObj.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span className={`${labelFont} text-[#8e9192] uppercase`}>Custom Hex:</span>
                  <input
                    className={`${inputClass} max-w-40 font-mono text-xs`}
                    onChange={(event) => setCustomHex(event.target.value)}
                    placeholder="#a855f7"
                    value={customHex}
                  />
                  {customHex ? (
                    <span className="grid size-8 place-items-center rounded-lg border border-white/15 shadow-md" style={{ background: customHex }}>
                      <Check size={14} className="text-white" />
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button className={primaryButton} disabled={!hasAppearanceChanged || isSubmitting || isSavingAppearance} onClick={handleSaveAppearance} type="button">
                  {isSavingAppearance ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Palette aria-hidden="true" size={16} />}
                  Save Appearance
                </button>
              </div>
              {appearanceError ? <div className="rounded border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-3 py-2 text-xs text-[#ffdad6]">{appearanceError}</div> : null}
            </div>
          </section>

          <section className={panelClass}>
            <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-white/20 to-transparent" />
            <h2 className="m-0 mb-6 text-2xl leading-tight font-bold text-white">General Settings</h2>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className={`${labelFont} text-[#8e9192] uppercase`} htmlFor="workspaceName">
                  Workspace Name
                </label>
                <div className="flex gap-4 max-[640px]:flex-col">
                  <input className={inputClass} id="workspaceName" maxLength={160} onChange={(event) => setWorkspaceName(event.target.value)} type="text" value={workspaceName} />
                  <button className={primaryButton} disabled={!hasNameChanged || isSubmitting} onClick={() => openDialog("rename")} type="button">
                    <Pencil aria-hidden="true" size={16} />
                    Save Name
                  </button>
                </div>
                <p className="m-0 text-sm text-[#8e9192]">Renaming updates the workspace name everywhere members see it.</p>
              </div>

              <div className="h-px w-full bg-white/10" />

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <label className={`${labelFont} text-[#8e9192] uppercase`} htmlFor="workspaceDescription">
                    Workspace Description
                  </label>
                  <span className="text-xs text-[#8e9192]">{workspaceDescription.length} / 2000</span>
                </div>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  id="workspaceDescription"
                  maxLength={2000}
                  onChange={(event) => setWorkspaceDescription(event.target.value)}
                  placeholder="Add a summary or overview of what this project workspace is about..."
                  rows={4}
                  value={workspaceDescription}
                />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="m-0 text-sm text-[#8e9192]">Provide details or context about the workspace goals, tech stack, or guidelines.</p>
                  <button
                    className={primaryButton}
                    disabled={!hasDescriptionChanged || isSubmitting || isSavingDescription}
                    onClick={handleSaveDescription}
                    type="button"
                  >
                    {isSavingDescription ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Pencil aria-hidden="true" size={16} />}
                    Save Description
                  </button>
                </div>
                {descriptionError ? <div className="rounded border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-3 py-2 text-xs text-[#ffdad6]">{descriptionError}</div> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 p-6 backdrop-blur-xl md:p-8">
            <h2 className="m-0 mb-2 text-2xl leading-tight font-bold text-[#ffb4ab]">Danger Zone</h2>
            <p className="m-0 mb-6 text-[#c4c7c8]">Irreversible actions for this workspace. Proceed with caution.</p>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4 border-b border-[#ffb4ab]/10 pb-5 max-[640px]:flex-col max-[640px]:items-start">
                <div>
                  <h3 className="m-0 mb-1 font-bold text-white">Archive Workspace</h3>
                  <p className="m-0 text-sm text-[#8e9192]">Make the workspace read-only for all members.</p>
                </div>
                <button className={dangerOutlineButton} disabled={isArchived || isSubmitting} onClick={() => openDialog("archive")} type="button">
                  <Archive aria-hidden="true" size={16} />
                  Archive
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 max-[640px]:flex-col max-[640px]:items-start">
                <div>
                  <h3 className="m-0 mb-1 font-bold text-[#ffb4ab]">Delete Workspace</h3>
                  <p className="m-0 text-sm text-[#8e9192]">Permanently delete all data, projects, and files.</p>
                </div>
                <button className={dangerSolidButton} disabled={isSubmitting} onClick={() => openDialog("delete")} type="button">
                  <Trash2 aria-hidden="true" size={16} />
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="m-0 mb-4 text-xl leading-tight font-bold text-white">Workspace Info</h2>
            <dl className="m-0 flex flex-col">
              <InfoRow label="Created" value={createdDate} />
              <InfoRow label="Owner" value={getUserDisplayName(user)} />
              <InfoRow label="Members" value={`${project.member_count}`} />
              <InfoRow label="Status" value={isArchived ? "Archived" : "Active"} last />
            </dl>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/2.5 p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center gap-2 text-[#8e9192]">
              <Download aria-hidden="true" size={14} />
              <h2 className={`${labelFont} m-0 uppercase`}>Backup & Export</h2>
            </div>
            <p className="m-0 mb-4 text-sm leading-relaxed text-[#8e9192]">Download a JSON snapshot for backup, transfer, or development testing.</p>
            <button
              className={`${labelFont} inline-flex w-full shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-[#c4c7c8] uppercase transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isExportingBackup}
              onClick={handleExportBackup}
              type="button"
            >
              {isExportingBackup ? <Loader2 aria-hidden="true" className="animate-spin" size={14} /> : <Download aria-hidden="true" size={14} />}
              Export Data
            </button>
            {backupError ? <div className="mt-3 rounded border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 px-3 py-2 text-xs text-[#ffdad6]">{backupError}</div> : null}
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {dialogMode ? (
          <WorkspaceConfirmDialog
            archivePhrase={archivePhrase}
            deleteName={deleteName}
            deletePhrase={deletePhrase}
            dialogMode={dialogMode}
            dialogStep={dialogStep}
            error={error}
            isSubmitting={isSubmitting}
            onArchive={handleArchive}
            onArchivePhraseChange={setArchivePhrase}
            onClose={closeDialog}
            onDelete={handleDelete}
            onDeleteNameChange={setDeleteName}
            onDeletePhraseChange={setDeletePhrase}
            onRename={handleRename}
            onStepChange={setDialogStep}
            projectName={project.name}
            renamedName={trimmedName}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function InfoRow({ label, last = false, value }: { label: string; last?: boolean; value: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-white/5"}`}>
      <dt className={`${labelFont} text-[#8e9192] uppercase`}>{label}</dt>
      <dd className="m-0 truncate text-right text-white">{value}</dd>
    </div>
  );
}

export default WorkspaceSettingsPage;
