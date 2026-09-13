import { useContext } from "react";
import { ProjectContext } from "@/shared/components/projectContext";

export function useProjectContext() {
  const value = useContext(ProjectContext);
  if (!value) {
    throw new Error("useProjectContext must be used inside ProjectProvider");
  }
  return value;
}
