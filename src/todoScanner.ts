import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseTodoContent, sortTodoItems, TodoItem, GroupedTodoItems } from "./todoParser";

/** Finds all markdown files in the workspace and parses their TODO items. */
export class TodoScanner {
  /**
   * Scan all markdown files in the current workspace folders and return a
   * sorted list of todo items.
   */
  async scan(): Promise<GroupedTodoItems> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { noDue: [], overdue: [], thisWeek: [], nextWeek: [], thisMonth: [], nextMonth: [], thisYear: [], nextYearAndBeyond: [] };
    }

    const markdownUris = await vscode.workspace.findFiles(
      "**/*.md",
      "**/node_modules/**",
    );

    const allItems: TodoItem[] = [];
    for (const uri of markdownUris) {
      const filePath = uri.fsPath;
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const items = parseTodoContent(content, filePath);
        allItems.push(...items);
      } catch {
        // Skip files that cannot be read.
      }
    }

    return sortTodoItems(allItems);
  }

  /**
   * Return a workspace-relative display path for a file, falling back to the
   * basename if the file is outside the workspace.
   */
  static relativePath(filePath: string): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const rel = path.relative(folder.uri.fsPath, filePath);
        if (!rel.startsWith("..")) {
          return rel;
        }
      }
    }
    return path.basename(filePath);
  }
}
