import { createContext } from "react";
import type { AuthUser } from "@/features/auth";
import type { TeamyProject } from "@/features/projects";

export type ProjectContextValue = {
  project: TeamyProject;
  user: AuthUser;
  onProjectUpdated?: (project: TeamyProject) => void;
  onUserUpdated?: (user: AuthUser) => void;
};

export const ProjectContext = createContext<ProjectContextValue | null>(null);
