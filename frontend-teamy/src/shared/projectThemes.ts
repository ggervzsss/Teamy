export type ProjectColorTheme = "purple" | "indigo" | "blue" | "cyan" | "emerald" | "amber" | "orange" | "rose" | "violet" | "pink";

export type ProjectThemeConfig = {
  id: ProjectColorTheme;
  name: string;
  badgeBg: string;
  border: string;
  gradient: string;
  hex: string;
  hslHue: number;
  text: string;
};

export const PROJECT_THEMES: Record<ProjectColorTheme, ProjectThemeConfig> = {
  purple: {
    id: "purple",
    name: "Teamy Purple",
    hex: "#a855f7",
    hslHue: 270,
    gradient: "linear-gradient(135deg, hsl(270,60%,30%), hsl(270,80%,55%))",
    border: "border-[#a855f7]/30",
    text: "text-[#d8b4fe]",
    badgeBg: "bg-[#a855f7]/15",
  },
  indigo: {
    id: "indigo",
    name: "Indigo Cyan",
    hex: "#6366f1",
    hslHue: 238,
    gradient: "linear-gradient(135deg, hsl(238,60%,30%), hsl(238,80%,58%))",
    border: "border-[#6366f1]/30",
    text: "text-[#c7d2fe]",
    badgeBg: "bg-[#6366f1]/15",
  },
  blue: {
    id: "blue",
    name: "Ocean Blue",
    hex: "#3b82f6",
    hslHue: 217,
    gradient: "linear-gradient(135deg, hsl(217,60%,30%), hsl(217,80%,55%))",
    border: "border-[#3b82f6]/30",
    text: "text-[#bfdbfe]",
    badgeBg: "bg-[#3b82f6]/15",
  },
  cyan: {
    id: "cyan",
    name: "Cyber Cyan",
    hex: "#06b6d4",
    hslHue: 188,
    gradient: "linear-gradient(135deg, hsl(188,60%,25%), hsl(188,80%,50%))",
    border: "border-[#06b6d4]/30",
    text: "text-[#a5f3fc]",
    badgeBg: "bg-[#06b6d4]/15",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Mint",
    hex: "#10b981",
    hslHue: 160,
    gradient: "linear-gradient(135deg, hsl(160,60%,25%), hsl(160,80%,45%))",
    border: "border-[#10b981]/30",
    text: "text-[#a7f3d0]",
    badgeBg: "bg-[#10b981]/15",
  },
  amber: {
    id: "amber",
    name: "Amber Gold",
    hex: "#f59e0b",
    hslHue: 38,
    gradient: "linear-gradient(135deg, hsl(38,60%,25%), hsl(38,80%,50%))",
    border: "border-[#f59e0b]/30",
    text: "text-[#fde68a]",
    badgeBg: "bg-[#f59e0b]/15",
  },
  orange: {
    id: "orange",
    name: "Sunset Orange",
    hex: "#f97316",
    hslHue: 25,
    gradient: "linear-gradient(135deg, hsl(25,60%,30%), hsl(25,80%,55%))",
    border: "border-[#f97316]/30",
    text: "text-[#fed7aa]",
    badgeBg: "bg-[#f97316]/15",
  },
  rose: {
    id: "rose",
    name: "Neon Rose",
    hex: "#f43f5e",
    hslHue: 350,
    gradient: "linear-gradient(135deg, hsl(350,60%,30%), hsl(350,80%,55%))",
    border: "border-[#f43f5e]/30",
    text: "text-[#fecdd3]",
    badgeBg: "bg-[#f43f5e]/15",
  },
  violet: {
    id: "violet",
    name: "Deep Violet",
    hex: "#8b5cf6",
    hslHue: 258,
    gradient: "linear-gradient(135deg, hsl(258,60%,30%), hsl(258,80%,60%))",
    border: "border-[#8b5cf6]/30",
    text: "text-[#ddd6fe]",
    badgeBg: "bg-[#8b5cf6]/15",
  },
  pink: {
    id: "pink",
    name: "Hot Pink",
    hex: "#ec4899",
    hslHue: 330,
    gradient: "linear-gradient(135deg, hsl(330,60%,30%), hsl(330,80%,55%))",
    border: "border-[#ec4899]/30",
    text: "text-[#fbcfe8]",
    badgeBg: "bg-[#ec4899]/15",
  },
};

export const PROJECT_ICON_OPTIONS = [
  { id: "FolderKanban", label: "Kanban" },
  { id: "Briefcase", label: "Work" },
  { id: "Code2", label: "Code" },
  { id: "Rocket", label: "Launch" },
  { id: "Sparkles", label: "Sparkle" },
  { id: "Terminal", label: "CLI" },
  { id: "Cpu", label: "System" },
  { id: "Globe", label: "Web" },
  { id: "Palette", label: "Design" },
  { id: "Shield", label: "Security" },
  { id: "Zap", label: "Fast" },
  { id: "Layers", label: "Layers" },
] as const;

export function getProjectTheme(colorTheme?: string | null, projectId?: string): ProjectThemeConfig {
  if (colorTheme && colorTheme in PROJECT_THEMES) {
    return PROJECT_THEMES[colorTheme as ProjectColorTheme];
  }
  if (colorTheme && colorTheme.startsWith("#")) {
    return {
      id: "purple",
      name: "Custom Color",
      hex: colorTheme,
      hslHue: 270,
      gradient: `linear-gradient(135deg, ${colorTheme}aa, ${colorTheme})`,
      border: "border-white/20",
      text: "text-white",
      badgeBg: "bg-white/10",
    };
  }
  if (projectId) {
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return {
      id: "purple",
      name: "Default",
      hex: `hsl(${hue},70%,60%)`,
      hslHue: hue,
      gradient: `linear-gradient(135deg, hsl(${hue},60%,30%), hsl(${hue},80%,55%))`,
      border: "border-white/20",
      text: "text-white",
      badgeBg: "bg-white/10",
    };
  }
  return PROJECT_THEMES.purple;
}
