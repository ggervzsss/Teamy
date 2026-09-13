import { toLocalDate } from "@/shared/dateTime";

export function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return "No due date";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(toLocalDate(dueDate));
}

export function getDueDateParts(dueDate: string | null) {
  if (!dueDate) {
    return null;
  }
  const date = toLocalDate(dueDate);
  const month = new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
  const day = new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(date);
  return { month, day };
}
