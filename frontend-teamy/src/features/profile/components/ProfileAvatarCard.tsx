import { useRef } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import type { AuthUser } from "@/features/auth";
import UserAvatarImage from "@/shared/components/UserAvatarImage";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const cardClass = "gpu-panel rounded-lg border border-white/15 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";

export function ProfileAvatarCard({
  isUpdatingAvatar,
  onAvatarSelected,
  onOpenConfirmDefault,
  onRestoreGoogleAvatar,
  user,
}: {
  isUpdatingAvatar: boolean;
  onAvatarSelected: (file: File | undefined) => Promise<void>;
  onOpenConfirmDefault: () => void;
  onRestoreGoogleAvatar: () => Promise<void>;
  user: AuthUser;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className={`${cardClass} relative overflow-hidden`}>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-black/50" />
      <div className="relative z-10">
        <h2 className={`${labelFont} m-0 mb-6 text-[#8e9192] uppercase`}>Profile Picture</h2>
        <div className="flex flex-col items-center gap-5">
          <UserAvatarImage className="grid size-32 place-items-center overflow-hidden rounded-full bg-[#2a2a2e] text-3xl font-bold text-white shadow-[0_20px_40px_rgba(0,0,0,0.5)]" user={user} />
          <input
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void onAvatarSelected(event.target.files?.[0]);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            type="file"
          />
          <div className="mt-2 flex w-full flex-col gap-2">
            <button
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded border-0 bg-white px-4 py-2 text-[#2f3131] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-[#8e9192]"
              disabled={isUpdatingAvatar}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {isUpdatingAvatar ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Camera aria-hidden="true" size={16} />}
              Upload New
            </button>
            <button
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/20 bg-transparent px-4 py-2 text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isUpdatingAvatar || !user.avatar_url}
              onClick={onOpenConfirmDefault}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
              Restore Default
            </button>
            {user.google_avatar_url ? (
              <button
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/20 bg-transparent px-4 py-2 text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isUpdatingAvatar || user.avatar_url === user.google_avatar_url}
                onClick={() => void onRestoreGoogleAvatar()}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={16} />
                Restore Google Photo
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
