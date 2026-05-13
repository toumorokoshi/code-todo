import * as fs from "fs";

/**
 * Mark a todo item as complete by replacing `- [ ]` with `- [x]` on the
 * given 1-based line number in the file.
 *
 * Returns true if the line was modified, false if the checkbox was not found
 * (e.g. it was already completed or the line changed since last scan).
 */
export function completeTodoItem(filePath: string, lineNumber: number): boolean {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const idx = lineNumber - 1; // convert to 0-based

  if (idx < 0 || idx >= lines.length) {
    return false;
  }

  const original = lines[idx];
  const updated = original.replace(/^(\s*-\s+)\[\s\]/, "$1[x]");

  if (updated === original) {
    // No open checkbox found on that line — already done or stale
    return false;
  }

  lines[idx] = updated;
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return true;
}
