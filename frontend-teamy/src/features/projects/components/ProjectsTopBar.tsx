import { LogOut, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUser } from "@/features/auth";
import { NotificationBell } from "@/features/notifications";
import UserAvatarImage from "@/shared/components/UserAvatarImage";
import { getUserDisplayName, getUserSecondaryName } from "@/shared/userDisplay";

type ProjectsTopBarProps = {
  onLogout: () => Promise<void>;
  user: AuthUser;
};

function ProjectsTopBar({ onLogout, user }: ProjectsTopBarProps) {
  const navigate = useNavigate();
  const userLabel = getUserDisplayName(user);
  const userSecondaryName = getUserSecondaryName(user);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="z-60 flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-white/2 px-6 backdrop-blur-[20px] max-[640px]:px-4">
      <div className="flex items-center gap-12">
        <Link to="/projects" className="flex items-center gap-3 text-2xl leading-none font-extrabold text-white no-underline transition-opacity hover:opacity-80">
          <img src="/favicon.png" alt="" className="size-8 rounded-lg" />
          Teamy
        </Link>
      </div>

      <div className="flex items-center gap-6 max-[768px]:justify-end max-[640px]:w-full">
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="relative ml-2 flex items-center" ref={profileDropdownRef}>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-3 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-white/5"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <div className="max-w-36 pl-2 text-right max-[1040px]:hidden">
                <p className="m-0 truncate text-sm leading-tight font-medium text-white">{userLabel}</p>
                <p className="m-0 truncate text-xs leading-tight text-[#8e9192]">{userSecondaryName}</p>
              </div>
              <UserAvatarImage
                className="grid size-9 place-items-center overflow-hidden rounded-full text-[10px] font-medium text-white"
                aria-label="Profile"
                title={userLabel}
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
                      navigate("/profile");
                    }}
                    type="button"
                  >
                    <User size={16} className="text-[#8e9192]" />
                    Profile
                  </button>
                  <div className="mx-2 h-px bg-white/5"></div>
                  <button className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-white/5" onClick={() => void onLogout()}>
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
  );
}

export default ProjectsTopBar;
