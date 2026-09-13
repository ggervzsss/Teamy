import { Camera, Loader2 } from "lucide-react";
import type { AuthUser } from "@/features/auth";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const cardClass = "gpu-panel rounded-lg border border-white/15 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl";
const inputClass = "w-full rounded border border-white/15 bg-[#1a1a1e] px-4 py-3 text-white outline-none transition-colors focus:border-white disabled:cursor-not-allowed disabled:text-[#8e9192]";
const secondaryButton =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-white/20 bg-transparent px-6 py-3 text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

export function ProfileInfoForm({
  firstName,
  hasProfileChanges,
  isPending,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onSaveProfile,
  user,
}: {
  firstName: string;
  hasProfileChanges: boolean;
  isPending: boolean;
  lastName: string;
  onFirstNameChange: (val: string) => void;
  onLastNameChange: (val: string) => void;
  onSaveProfile: () => void;
  user: AuthUser;
}) {
  return (
    <section className={cardClass}>
      <h2 className={`${labelFont} m-0 mb-6 text-[#8e9192] uppercase`}>Personal Information</h2>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#8e9192] uppercase`}>First Name</span>
            <input className={inputClass} onChange={(event) => onFirstNameChange(event.target.value)} type="text" value={firstName} />
          </label>
          <label className="flex flex-col gap-2">
            <span className={`${labelFont} text-[#8e9192] uppercase`}>Last Name</span>
            <input className={inputClass} onChange={(event) => onLastNameChange(event.target.value)} type="text" value={lastName} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className={`${labelFont} text-[#8e9192] uppercase`}>Email Address</span>
          <input className={inputClass} disabled type="email" value={user.email} />
          <span className="text-xs text-[#8e9192]/70">Email cannot be changed directly. Contact support for assistance.</span>
        </label>

        <div className="mt-2 flex justify-end">
          <button className={secondaryButton} disabled={!hasProfileChanges || isPending} onClick={onSaveProfile} type="button">
            {isPending ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <Camera aria-hidden="true" size={16} />}
            Save Changes
          </button>
        </div>
      </div>
    </section>
  );
}
