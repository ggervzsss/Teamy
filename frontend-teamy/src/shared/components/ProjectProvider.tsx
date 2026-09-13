import type { ReactNode } from "react";
import { ProjectContext } from "@/shared/components/projectContext";
import type { ProjectContextValue } from "@/shared/components/projectContext";

function ProjectProvider({ children, onProjectUpdated, onUserUpdated, project, user }: ProjectContextValue & { children: ReactNode }) {
  return <ProjectContext.Provider value={{ onProjectUpdated, onUserUpdated, project, user }}>{children}</ProjectContext.Provider>;
}

export default ProjectProvider;
