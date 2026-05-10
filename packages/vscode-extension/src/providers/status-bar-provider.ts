/**
 * StatusBarProvider — manages the AI-Kit status bar item.
 * Shows the readiness score and current org alias.
 */

import * as vscode from 'vscode';
import { scanProject, readOrgContext } from '@ai-kit-salesforce/core';

export class StatusBarProvider {
  private readonly statusBarItem: vscode.StatusBarItem;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(statusBarItem: vscode.StatusBarItem) {
    this.statusBarItem = statusBarItem;
  }

  static create(context: vscode.ExtensionContext): StatusBarProvider {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10
    );
    statusBarItem.command = 'ai-kit-sf.openReport';
    statusBarItem.tooltip = 'AI-Kit for Salesforce — click to open readiness report';
    statusBarItem.text = '$(loading~spin) AI-Kit';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    const provider = new StatusBarProvider(statusBarItem);
    context.subscriptions.push(
      new vscode.Disposable(() => provider.dispose())
    );

    return provider;
  }

  /**
   * Schedule a refresh after an optional delay (defaults to 2000ms).
   * Cancels any pending refresh first.
   */
  scheduleRefresh(delayMs = 2000): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.refresh();
    }, delayMs);
  }

  /**
   * Run scanProject + readOrgContext in parallel and update the status bar.
   */
  async refresh(): Promise<void> {
    const rootPath = this.getRootPath();
    if (!rootPath) {
      this.statusBarItem.text = '$(circle-slash) AI-Kit';
      this.statusBarItem.tooltip = 'AI-Kit: No workspace open';
      return;
    }

    try {
      const [result, orgCtx] = await Promise.all([
        scanProject(rootPath),
        readOrgContext(rootPath),
      ]);

      const score = result.score;
      const icon =
        score >= 80 ? '$(check)' : score >= 50 ? '$(warning)' : '$(error)';

      const orgAlias =
        orgCtx.source !== 'none' && orgCtx.defaultOrg
          ? orgCtx.defaultOrg
          : undefined;

      this.statusBarItem.text = orgAlias
        ? `${icon} AI-Kit ${score}% | ${orgAlias}`
        : `${icon} AI-Kit ${score}%`;

      // Build tooltip breakdown
      const missingCount = result.missing.length;
      const orgLine = orgAlias
        ? `\nOrg: ${orgAlias}  (from ${orgCtx.source})`
        : '';

      const scoreLabel =
        score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Critical';

      this.statusBarItem.tooltip =
        `AI-Kit for Salesforce\n` +
        `Readiness: ${score}/100 (${scoreLabel})${orgLine}\n` +
        (missingCount > 0
          ? `${missingCount} item(s) missing — click to see report`
          : 'All items present!');
    } catch {
      this.statusBarItem.text = '$(question) AI-Kit';
      this.statusBarItem.tooltip = 'AI-Kit: Error during scan';
    }
  }

  private getRootPath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return undefined;
    return folders[0].uri.fsPath;
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
