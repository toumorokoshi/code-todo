/** Represents a single TODO item parsed from a markdown file. */
export interface TodoItem {
  /** Absolute path of the file containing this item. */
  filePath: string;
  /** 1-based line number in the file. */
  lineNumber: number;
  /** The text of the TODO item (excluding the `- [ ]` prefix). */
  text: string;
  /** Due date parsed from a `(DUE: YYYY-MM-DD)` annotation, or undefined. */
  dueDate: Date | undefined;
}

/** Regex matching an open checkbox line, e.g. `- [ ] some text #todo`. */
const TODO_REGEX = /^\s*-\s+\[\s\]\s+(.+)$/;

/** Regex matching the required `#todo` tag anywhere in the item text. */
const TODO_TAG_REGEX = /#todo\b/i;

/** Regex matching an inline due-date annotation, e.g. `(DUE: 2026-05-13)`. */
const DUE_DATE_REGEX = /\(DUE:\s*(\d{4}-\d{2}-\d{2}(?:T[^)]*)?)\)/i;

/**
 * Parse a single line of markdown text into a TodoItem, or return undefined
 * if the line does not contain an open checkbox with a `#todo` tag.
 *
 * Only lines matching `- [ ] ... #todo ...` are considered todo items.
 * The `#todo` tag is stripped from the displayed text.
 */
export function parseTodoLine(
  line: string,
  filePath: string,
  lineNumber: number,
): TodoItem | undefined {
  const match = TODO_REGEX.exec(line);
  if (!match) {
    return undefined;
  }

  const rawText = match[1];

  // Only track items that carry the #todo tag.
  if (!TODO_TAG_REGEX.test(rawText)) {
    return undefined;
  }

  const dueDateMatch = DUE_DATE_REGEX.exec(rawText);
  const dueDate = dueDateMatch ? new Date(dueDateMatch[1]) : undefined;
  const text = rawText
    .replace(DUE_DATE_REGEX, "")
    .replace(TODO_TAG_REGEX, "")
    .trim();

  return { filePath, lineNumber, text, dueDate };
}

/**
 * Parse all TODO items from the full text content of a markdown file.
 */
export function parseTodoContent(content: string, filePath: string): TodoItem[] {
  const lines = content.split("\n");
  const items: TodoItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const item = parseTodoLine(lines[i], filePath, i + 1);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

export interface TodoCategory {
  id: string;
  title: string;
  /** Returns the max timestamp (ms) for this category. If undefined, acts as a catch-all. */
  getEndBoundary?: (now: Date) => number;
  defaultOpen: boolean;
}

export interface UpcomingGroup {
  category: TodoCategory;
  items: TodoItem[];
}

export interface GroupedTodoItems {
  noDue: TodoItem[];
  overdue: TodoItem[];
  upcoming: UpcomingGroup[];
}

function getEndOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  const day = date.getDay();
  // 0 is Sunday. Distance to end of week (Sunday).
  const dist = (7 - day) % 7;
  date.setDate(date.getDate() + dist);
  return date;
}

function getEndOfNextWeek(d: Date): Date {
  const date = getEndOfWeek(d);
  date.setDate(date.getDate() + 7);
  return date;
}

function getEndOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getEndOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 2, 0, 23, 59, 59, 999);
}

function getEndOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export const UPCOMING_CATEGORIES: TodoCategory[] = [
  {
    id: "thisWeek",
    title: "This Week",
    getEndBoundary: (now) => getEndOfWeek(now).getTime(),
    defaultOpen: true,
  },
  {
    id: "nextWeek",
    title: "Next Week",
    getEndBoundary: (now) => getEndOfNextWeek(now).getTime(),
    defaultOpen: false,
  },
  {
    id: "thisMonth",
    title: "This Month",
    // Ensure boundaries strictly advance to prevent overlapping negative buckets
    getEndBoundary: (now) => Math.max(getEndOfMonth(now).getTime(), getEndOfNextWeek(now).getTime()),
    defaultOpen: false,
  },
  {
    id: "nextMonth",
    title: "Next Month",
    getEndBoundary: (now) => Math.max(getEndOfNextMonth(now).getTime(), getEndOfMonth(now).getTime()),
    defaultOpen: false,
  },
  {
    id: "thisYear",
    title: "This Year",
    getEndBoundary: (now) => Math.max(getEndOfYear(now).getTime(), getEndOfNextMonth(now).getTime()),
    defaultOpen: false,
  },
  {
    id: "nextYearAndBeyond",
    title: "Next Year and Beyond",
    // No boundary; catches everything else
    defaultOpen: false,
  },
];

/**
 * Sort todo items according to the design spec:
 * 1. Items without due dates.
 * 2. Items that are due or past due (earliest first).
 * 3. Future items grouped by configured buckets (earliest first within each bucket).
 */
export function sortTodoItems(items: TodoItem[]): GroupedTodoItems {
  const now = new Date();
  
  const groups: GroupedTodoItems = {
    noDue: [],
    overdue: [],
    upcoming: UPCOMING_CATEGORIES.map((c) => ({ category: c, items: [] })),
  };

  for (const item of items) {
    if (item.dueDate === undefined) {
      groups.noDue.push(item);
    } else {
      const time = item.dueDate.getTime();
      if (time <= now.getTime()) {
        groups.overdue.push(item);
      } else {
        let placed = false;
        for (const group of groups.upcoming) {
          const boundary = group.category.getEndBoundary?.(now);
          if (boundary === undefined || time <= boundary) {
            group.items.push(item);
            placed = true;
            break;
          }
        }
        // Fallback if no catch-all and it exceeds all boundaries (shouldn't happen with our config)
        if (!placed) {
          groups.upcoming[groups.upcoming.length - 1].items.push(item);
        }
      }
    }
  }

  const sortFn = (a: TodoItem, b: TodoItem) => a.dueDate!.getTime() - b.dueDate!.getTime();
  groups.overdue.sort(sortFn);
  for (const group of groups.upcoming) {
    group.items.sort(sortFn);
  }

  return groups;
}
