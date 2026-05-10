/**
 * DiagnosticsProvider — real-time inline diagnostics for Apex and LWC files.
 * Debounces change events and pushes to a VS Code DiagnosticCollection.
 */

import * as vscode from 'vscode';
import { analyseFile, detectFileType, Diagnostic as AiKitDiagnostic } from '@ai-kit-salesforce/core';

const DEBOUNCE_MS = 400;

export class DiagnosticsProvider {
  private readonly collection: vscode.DiagnosticCollection;
  private readonly disposables: vscode.Disposable[] = [];
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private constructor(collection: vscode.DiagnosticCollection) {
    this.collection = collection;
  }

  static create(context: vscode.ExtensionContext): DiagnosticsProvider {
    const collection = vscode.languages.createDiagnosticCollection('ai-kit-salesforce-inline');
    context.subscriptions.push(collection);

    const provider = new DiagnosticsProvider(collection);

    // Register document event listeners
    provider.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => provider.updateDiagnostics(doc)),
      vscode.workspace.onDidChangeTextDocument((e) => provider.scheduleUpdate(e.document)),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        collection.delete(doc.uri);
        provider.debounceTimers.delete(doc.uri.toString());
      }),
    );

    // Run on already-open editors
    for (const doc of vscode.workspace.textDocuments) {
      provider.updateDiagnostics(doc);
    }

    return provider;
  }

  private scheduleUpdate(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.updateDiagnostics(document);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  private updateDiagnostics(document: vscode.TextDocument): void {
    const fileType = detectFileType(document.fileName);
    if (fileType === 'unknown') return;

    const content = document.getText();
    const aiKitDiags = analyseFile(content, fileType);

    const vsDiags = aiKitDiags.map((d: AiKitDiagnostic) => {
      const lineCount = document.lineCount;
      const lineIndex = Math.min(d.line, lineCount - 1);
      const line = document.lineAt(lineIndex);
      const startCol = Math.min(d.startCol, line.text.length);
      const endCol = d.endCol === -1 ? line.text.length : Math.min(d.endCol, line.text.length);
      const range = new vscode.Range(lineIndex, startCol, lineIndex, endCol);

      const severity =
        d.severity === 'error'
          ? vscode.DiagnosticSeverity.Error
          : d.severity === 'warning'
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;

      const diag = new vscode.Diagnostic(range, d.message, severity);
      diag.source = `AI-Kit (${d.ruleFile})`;
      if (d.ruleId) {
        diag.code = d.ruleId;
      }
      return diag;
    });

    this.collection.set(document.uri, vsDiags);
  }

  /**
   * Returns the number of diagnostics for a given URI.
   */
  getDiagnosticCount(uri: vscode.Uri): number {
    const diags = this.collection.get(uri);
    return diags ? diags.length : 0;
  }

  dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.collection.dispose();
  }
}
