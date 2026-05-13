# GAPS

Known gaps and remaining work items after the initial scaffold.

## code-todo-m1c — Implement todo scanning from workspace markdown files

Integration tests to verify end-to-end scanning in a real VSCode workspace
environment. The `TodoScanner` calls `vscode.workspace.findFiles` which
requires a running extension host; unit tests only cover the pure parser.

## code-todo-59w — Add webview refresh on workspace file changes

The sidebar currently refreshes only on `onDidSaveTextDocument`. It should
also react to:
- File renames / deletes (`onDidRenameFiles`, `onDidDeleteFiles`)
- New markdown files being created (`onDidCreateFiles`)

## code-todo-jm3 — Exclude test files from the .vsix package

The `out/test/` directory is currently bundled into the `.vsix`. A
`.vscodeignore` entry for `out/test/**` should be added to keep the package
lean.
