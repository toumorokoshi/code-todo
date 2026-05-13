import * as vscode from "vscode";
import { TodoScanner } from "./todoScanner";
import { TodoItem } from "./todoParser";

/** Renders todo items as an HTML webview in the VSCode sidebar. */
export class TodoViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "codeTodo.todoView";

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _scanner: TodoScanner,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: vscode.WebviewViewResolveContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: false };
    this.refresh();
  }

  /** Re-scan the workspace and update the webview. */
  refresh(): void {
    this._scanner.scan().then((items) => {
      if (this._view) {
        this._view.webview.html = buildHtml(items);
      }
    });
  }
}

/** Build the full HTML document for the webview. */
function buildHtml(items: TodoItem[]): string {
  const rows = items.map((item) => buildRow(item)).join("\n");
  const emptyMessage =
    items.length === 0
      ? `<p class="empty">No open todo items found in markdown files.</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code Todo</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      margin: 0;
      padding: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid var(--vscode-panel-border);
      color: var(--vscode-descriptionForeground);
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 4px 6px;
      border-bottom: 1px solid var(--vscode-panel-border);
      vertical-align: top;
    }
    .overdue {
      color: var(--vscode-errorForeground);
    }
    .due-soon {
      color: var(--vscode-notificationsWarningIcon-foreground);
    }
    .file-ref {
      color: var(--vscode-descriptionForeground);
      font-size: 0.8em;
    }
    .empty {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
  </style>
</head>
<body>
  ${emptyMessage}
  ${
    items.length > 0
      ? `<table>
    <thead>
      <tr>
        <th>Todo</th>
        <th>Due</th>
        <th>File</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`
      : ""
  }
</body>
</html>`;
}

/** Build a single table row for a TodoItem. */
function buildRow(item: TodoItem): string {
  const now = new Date();
  const dueDateStr = item.dueDate
    ? item.dueDate.toISOString().slice(0, 10)
    : "";
  const isOverdue = item.dueDate !== undefined && item.dueDate <= now;
  const dueCls = isOverdue ? "overdue" : "";

  const filePart = TodoScanner.relativePath(item.filePath);
  const fileCell = `<span class="file-ref">${escapeHtml(filePart)}:${item.lineNumber}</span>`;

  return `<tr>
    <td>${escapeHtml(item.text)}</td>
    <td class="${dueCls}">${escapeHtml(dueDateStr)}</td>
    <td>${fileCell}</td>
  </tr>`;
}

/** Escape special HTML characters. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
