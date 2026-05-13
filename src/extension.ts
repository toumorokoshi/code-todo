import * as vscode from "vscode";
import { TodoViewProvider } from "./todoView";
import { TodoScanner } from "./todoScanner";

export function activate(context: vscode.ExtensionContext) {
  const scanner = new TodoScanner();
  const provider = new TodoViewProvider(scanner);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TodoViewProvider.viewType,
      provider,
    ),
  );

  // Re-scan on markdown file saves
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === "markdown") {
        provider.refresh();
      }
    }),
  );
}

export function deactivate() {}
