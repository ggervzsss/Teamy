import { useQuery } from "@tanstack/react-query";
import { listTeamMembers, listTeamPresence } from "@/features/teammanagement/api";

export const teamKeys = {
  members: (projectId: string) => ["team", "members", projectId] as const,
  presence: (projectId: string) => ["team", "presence", projectId] as const,
};

export function useTeamMembers(projectId: string) {
  return useQuery({
    queryKey: teamKeys.members(projectId),
    queryFn: () => listTeamMembers(projectId),
  });
}

export function useTeamPresence(projectId: string) {
  return useQuery({
    queryKey: teamKeys.presence(projectId),
    queryFn: () => listTeamPresence(projectId),
  });
}
