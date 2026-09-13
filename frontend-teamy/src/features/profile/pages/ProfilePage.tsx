import { ArrowLeft, Loader2, Shield, Trash2, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "@/features/auth";
import { useDeleteAvatar, useRestoreGoogleAvatar, useUpdateProfile, useUploadAvatar } from "@/features/auth/hooks";
import { AnimatedModal } from "@/shared/components/AnimatedModal";
import { useScrollLock } from "@/shared/useScrollLock";
import { ProfileAvatarCard } from "../components/ProfileAvatarCard";
import { ProfileInfoForm } from "../components/ProfileInfoForm";

const cardClass = "gpu-panel rounded-lg border border-white/15 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

type ProfilePageProps = {
  onUserUpdated?: (user: AuthUser) => void;
  user: AuthUser;
};

function ProfilePage({ onUserUpdated, user }: ProfilePageProps) {
  const navigate = useNavigate();
  const initialName = useMemo(() => splitFullName(user.full_name), [user.full_name]);
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [isConfirmingDefaultAvatar, setIsConfirmingDefaultAvatar] = useState(false);

  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();
  const restoreGoogleAvatarMutation = useRestoreGoogleAvatar();
  const isUpdatingAvatar = uploadAvatarMutation.isPending || deleteAvatarMutation.isPending || restoreGoogleAvatarMutation.isPending;

  useScrollLock(isConfirmingDefaultAvatar);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const hasProfileChanges = fullName !== user.full_name;

  async function handleSaveProfile() {
    if (!fullName) {
      return;
    }
    try {
      const nextUser = await updateProfileMutation.mutateAsync({
        full_name: fullName,
      });
      onUserUpdated?.(nextUser);
      setFirstName(splitFullName(nextUser.full_name).firstName);
      setLastName(splitFullName(nextUser.full_name).lastName);
    } catch {
      // Handled by hook toast
    }
  }

  async function handleAvatarSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const nextUser = await uploadAvatarMutation.mutateAsync(file);
      onUserUpdated?.(nextUser);
    } catch {
      // Handled by hook toast
    }
  }

  async function restoreDefaultAvatar() {
    try {
      const nextUser = await deleteAvatarMutation.mutateAsync();
      onUserUpdated?.(nextUser);
      setIsConfirmingDefaultAvatar(false);
    } catch {
      // Handled by hook toast
    }
  }

  async function restoreGoogleAvatar() {
    try {
      const nextUser = await restoreGoogleAvatarMutation.mutateAsync();
      onUserUpdated?.(nextUser);
    } catch {
      // Handled by hook toast
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-360 flex-col gap-8">
      <header>
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:shadow-md active:scale-[0.98]"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-white">Profile Settings</h1>
        <p className="m-0 mt-1 text-sm text-[#8e9192]">Manage your personal information, security preferences, and avatar.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="flex flex-col gap-6 lg:col-span-4">
          <ProfileAvatarCard
            isUpdatingAvatar={isUpdatingAvatar}
            onAvatarSelected={handleAvatarSelected}
            onOpenConfirmDefault={() => setIsConfirmingDefaultAvatar(true)}
            onRestoreGoogleAvatar={restoreGoogleAvatar}
            user={user}
          />
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-8">
          <ProfileInfoForm
            firstName={firstName}
            hasProfileChanges={hasProfileChanges}
            isPending={updateProfileMutation.isPending}
            lastName={lastName}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onSaveProfile={handleSaveProfile}
            user={user}
          />

          <section className="rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 p-5 text-[#c4c7c8] shadow-sm">
            <div className="flex items-start gap-3">
              <Shield aria-hidden="true" className="mt-0.5 shrink-0 text-[#a855f7]" size={18} />
              <p className="m-0 text-sm leading-relaxed">Profile changes appear across Teamy immediately. Workspace nicknames are managed per project from Team Management.</p>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {isConfirmingDefaultAvatar ? (
          <AnimatedModal className="z-70" contentClassName="w-full max-w-md" onBackdropClick={() => setIsConfirmingDefaultAvatar(false)}>
            <div className={`${cardClass} flex w-full max-w-md flex-col gap-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-xl font-bold text-white">Restore Default Avatar</h2>
                  <p className="m-0 mt-2 text-sm leading-relaxed text-[#c4c7c8]">This removes your current profile picture and restores the default avatar.</p>
                </div>
                <button
                  className="grid size-9 place-items-center rounded-full border border-white/10 bg-transparent text-[#c4c7c8] hover:text-white"
                  onClick={() => setIsConfirmingDefaultAvatar(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="rounded border border-white/20 bg-transparent px-4 py-3 text-white transition-colors hover:bg-white/5"
                  onClick={() => setIsConfirmingDefaultAvatar(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded border-0 bg-[#ffb4ab] px-4 py-3 text-[#3b0906] transition-colors hover:bg-[#ffdad6] disabled:opacity-60"
                  disabled={deleteAvatarMutation.isPending}
                  onClick={() => void restoreDefaultAvatar()}
                  type="button"
                >
                  {deleteAvatarMutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Trash2 aria-hidden="true" size={16} />}
                  Restore Default
                </button>
              </div>
            </div>
          </AnimatedModal>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default ProfilePage;
