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

/** Regex matching an open checkbox line, e.g. `- [ ] some text`. */
const TODO_REGEX = /^\s*-\s+\[\s\]\s+(.+)$/;

/** Regex matching an inline due-date annotation, e.g. `(DUE: 2026-05-13)`. */
const DUE_DATE_REGEX = /\(DUE:\s*(\d{4}-\d{2}-\d{2}(?:T[^)]*)?)\)/i;

/**
 * Parse a single line of markdown text into a TodoItem, or return undefined
 * if the line does not contain an open checkbox.
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
  const dueDateMatch = DUE_DATE_REGEX.exec(rawText);
  const dueDate = dueDateMatch ? new Date(dueDateMatch[1]) : undefined;
  const text = rawText.replace(DUE_DATE_REGEX, "").trim();

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

/**
 * Sort todo items according to the design spec:
 * 1. Items without due dates.
 * 2. Items that are due or past due (earliest first).
 * 3. Items that are not yet due (earliest first).
 */
export function sortTodoItems(items: TodoItem[]): TodoItem[] {
  const now = new Date();
  const noDue = items.filter((i) => i.dueDate === undefined);
  const overdue = items
    .filter((i) => i.dueDate !== undefined && i.dueDate <= now)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  const upcoming = items
    .filter((i) => i.dueDate !== undefined && i.dueDate > now)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  return [...noDue, ...overdue, ...upcoming];
}
