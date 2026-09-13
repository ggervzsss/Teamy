import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createTask, linkTaskFile, listProjectMembers, listTasks, reviewTask, submitTaskForReview, updateMyTaskStatus, updateTask } from "@/features/taskboard/api";
import type { TaskCreatePayload, TaskLinkedFileCreatePayload, TaskUpdatePayload, MyTaskStatusUpdate, TeamyTask } from "@/features/taskboard/api";

export const taskKeys = {
  tasks: (projectId: string) => ["tasks", projectId] as const,
  members: (projectId: string) => ["taskboard", "members", projectId] as const,
};

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.tasks(projectId),
    queryFn: () => listTasks(projectId),
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: taskKeys.members(projectId),
    queryFn: () => listProjectMembers(projectId),
  });
}

function useTaskMutation<TPayload>(projectId: string, mutationFn: (payload: TPayload) => Promise<TeamyTask>, errorMessage: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.tasks(projectId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : errorMessage);
    },
  });
}

export function useCreateTask(projectId: string) {
  return useTaskMutation<TaskCreatePayload>(projectId, (payload) => createTask(projectId, payload), "Could not create the task.");
}

export function useUpdateTask(projectId: string) {
  return useTaskMutation<{ taskId: string; payload: TaskUpdatePayload }>(projectId, ({ taskId, payload }) => updateTask(projectId, taskId, payload), "Could not edit the task.");
}

export function useLinkTaskFile(projectId: string) {
  return useTaskMutation<{ taskId: string; payload: TaskLinkedFileCreatePayload }>(projectId, ({ taskId, payload }) => linkTaskFile(projectId, taskId, payload), "Could not link the resource.");
}

export function useUpdateMyTaskStatus(projectId: string) {
  return useTaskMutation<{ taskId: string; status: MyTaskStatusUpdate }>(projectId, ({ taskId, status }) => updateMyTaskStatus(projectId, taskId, status), "Could not update your task status.");
}

export function useSubmitForReview(projectId: string) {
  return useTaskMutation<string>(projectId, (taskId) => submitTaskForReview(projectId, taskId), "Could not submit the task for review.");
}

export function useReviewTask(projectId: string) {
  return useTaskMutation<{ taskId: string; action: "approve" | "request_changes"; remarks?: string }>(
    projectId,
    ({ taskId, action, remarks }) => reviewTask(projectId, taskId, action, remarks),
    "Could not review the task.",
  );
}
