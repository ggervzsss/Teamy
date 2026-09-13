const apiTimeZoneSuffix = /(?:Z|[+-]\d{2}:?\d{2})$/;

export type RelativeTimeOptions = {
  includeYesterday?: boolean;
  dateFormat?: Intl.DateTimeFormatOptions;
  now?: number;
};

export function normalizeApiDateTime(value: string) {
  return apiTimeZoneSuffix.test(value) ? value : `${value}Z`;
}

export function parseApiDateTime(value: string) {
  return Date.parse(normalizeApiDateTime(value));
}

export function toApiDate(value: string) {
  return new Date(normalizeApiDateTime(value));
}

export function toLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function parseLocalDate(value: string) {
  return toLocalDate(value).getTime();
}

export function formatRelativeTime(value: string, options: RelativeTimeOptions = {}) {
  const timestamp = toApiDate(value);
  const now = options.now ?? Date.now();
  const diffMs = now - timestamp.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Just now";
  }
  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }
  if ((options.includeYesterday ?? true) && diffMs < 2 * day) {
    return "Yesterday";
  }

  const dateFormat = options.dateFormat ?? { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, dateFormat).format(timestamp);
}
