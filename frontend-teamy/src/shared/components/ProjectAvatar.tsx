import { Briefcase, Code2, Cpu, FolderKanban, Globe, Layers, Palette, Rocket, Shield, Sparkles, Terminal, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { getProjectTheme } from "@/shared/projectThemes";

const iconMap: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  Briefcase,
  Code2,
  Cpu,
  FolderKanban,
  Globe,
  Layers,
  Palette,
  Rocket,
  Shield,
  Sparkles,
  Terminal,
  Zap,
};

type ProjectAvatarProps = {
  className?: string;
  colorTheme?: string | null;
  iconUrl?: string | null;
  name: string;
  projectId?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const sizeClasses = {
  sm: "size-8 text-xs rounded-lg",
  md: "size-10 text-sm rounded-xl",
  lg: "size-12 text-base rounded-xl",
  xl: "size-16 text-xl rounded-2xl",
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 30,
};

export function ProjectAvatar({ className = "", colorTheme, iconUrl, name, projectId, size = "md" }: ProjectAvatarProps) {
  const theme = getProjectTheme(colorTheme, projectId);
  const initials = getInitials(name);
  const isImage = iconUrl && (iconUrl.startsWith("http://") || iconUrl.startsWith("https://") || iconUrl.startsWith("/"));
  const IconComponent = iconUrl && !isImage ? iconMap[iconUrl] : null;

  if (isImage) {
    return (
      <img
        alt={`${name} icon`}
        className={`object-cover border border-white/15 shadow-md ${sizeClasses[size]} ${className}`}
        src={iconUrl}
      />
    );
  }

  return (
    <div
      className={`grid shrink-0 place-items-center font-bold text-white shadow-md border border-white/15 ${sizeClasses[size]} ${className}`}
      style={{ background: theme.gradient }}
    >
      {IconComponent ? <IconComponent size={iconSizes[size]} /> : initials}
    </div>
  );
}

export default ProjectAvatar;
