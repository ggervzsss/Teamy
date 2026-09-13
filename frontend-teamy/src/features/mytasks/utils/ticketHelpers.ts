export const MAX_TICKET_CHECKLIST_ITEMS = 20;

export type TicketItem = { id: string; text: string; checked: boolean };

export function parseTicketItems(description: string | null): TicketItem[] | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.text === "string" &&
          typeof item.checked === "boolean",
      )
    ) {
      return parsed as TicketItem[];
    }
  } catch {
    // not a ticket checklist
  }
  return null;
}

export function serializeTicketItems(items: TicketItem[]): string {
  return JSON.stringify(items);
}

export function makeTicketItem(text = ""): TicketItem {
  return { id: crypto.randomUUID(), text, checked: false };
}
