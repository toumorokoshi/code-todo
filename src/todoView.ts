import * as vscode from "vscode";
import { TodoScanner } from "./todoScanner";
import { TodoItem } from "./todoParser";
import { completeTodoItem } from "./todoCompleter";

/** Messages sent from the webview to the extension host. */
interface OpenFileMessage {
  command: "openFile";
  filePath: string;
  lineNumber: number;
}

interface CompleteItemMessage {
  command: "completeItem";
  filePath: string;
  lineNumber: number;
}

type WebviewMessage = OpenFileMessage | CompleteItemMessage;

/** Renders todo items as an HTML webview in the VSCode sidebar. */
export class TodoViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "codeTodo.todoView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _scanner: TodoScanner) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: vscode.WebviewViewResolveContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this._view = webviewView;

    // Scripts required for link clicks and checkbox completion.
    webviewView.webview.options = { enableScripts: true };

    // Handle messages posted from the webview.
    webviewView.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      if (msg.command === "openFile") {
        openFileAtLine(msg.filePath, msg.lineNumber);
      } else if (msg.command === "completeItem") {
        const changed = completeTodoItem(msg.filePath, msg.lineNumber);
        if (changed) {
          this.refresh();
        }
      }
    });

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

/** Open a file in the editor and reveal the target line. */
function openFileAtLine(filePath: string, lineNumber: number): void {
  const uri = vscode.Uri.file(filePath);
  // lineNumber is 1-based; VSCode Range is 0-based.
  const pos = new vscode.Position(lineNumber - 1, 0);
  vscode.window.showTextDocument(uri, {
    selection: new vscode.Range(pos, pos),
    preserveFocus: true,
  });
}

/** Build the full HTML document for the webview. */
function buildHtml(items: TodoItem[]): string {
  const rows = items.map((item) => buildRow(item)).join("\n");

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
      vertical-align: middle;
    }
    .todo-link {
      color: var(--vscode-foreground);
      text-decoration: none;
      cursor: pointer;
    }
    .todo-link:hover {
      color: var(--vscode-textLink-activeForeground);
      text-decoration: underline;
    }
    .overdue {
      color: var(--vscode-errorForeground);
    }
    .file-ref {
      color: var(--vscode-descriptionForeground);
      font-size: 0.8em;
      white-space: nowrap;
    }
    .todo-checkbox {
      cursor: pointer;
      width: 14px;
      height: 14px;
      accent-color: var(--vscode-checkbox-selectBackground, #007acc);
    }
    .empty {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 8px 6px;
    }
  </style>
</head>
<body>
  ${
    items.length === 0
      ? `<p class="empty">No open todo items found. Add a <code>#todo</code> suffix to open markdown checkboxes to track them here.</p>`
      : `<table>
    <thead>
      <tr>
        <th></th>
        <th>Todo</th>
        <th>Due</th>
        <th>File</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`
  }
  <script>
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('.todo-link').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        vscode.postMessage({
          command: 'openFile',
          filePath: el.dataset.filePath,
          lineNumber: parseInt(el.dataset.lineNumber, 10)
        });
      });
    });

    document.querySelectorAll('.todo-checkbox').forEach(el => {
      el.addEventListener('change', () => {
        vscode.postMessage({
          command: 'completeItem',
          filePath: el.dataset.filePath,
          lineNumber: parseInt(el.dataset.lineNumber, 10)
        });
      });
    });
  </script>
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
  const fpAttr = escapeAttr(item.filePath);
  const ln = item.lineNumber;

  const checkbox = `<input type="checkbox" class="todo-checkbox"
    data-file-path="${fpAttr}"
    data-line-number="${ln}"
    title="Mark as complete" />`;

  const link = `<a class="todo-link" href="#"
    data-file-path="${fpAttr}"
    data-line-number="${ln}">${escapeHtml(item.text)}
    <span class="file-ref">(${escapeHtml(filePart)}:${ln})</span></a>`;

  const due = `<span class="${dueCls}">${escapeHtml(dueDateStr)}</span>`;

  return `<tr>
    <td>${checkbox}</td>
    <td>${link}</td>
    <td>${due}</td>
  </tr>`;
}

/** Escape special HTML characters for use in text content. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Escape a string for use in a double-quoted HTML attribute value. */
function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
