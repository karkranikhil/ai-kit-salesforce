/**
 * TeamSyncProvider — auto-checks team config on workspace open.
 * Reads the teamConfigUrl from VS Code settings and silently runs
 * drift detection in the background. Shows a notification if there is drift.
 */

import * as vscode from 'vscode';
import { checkTeamSync, fetchTeamConfig } from '@ai-kit-salesforce/core';

const CONFIG_KEY = 'ai-kit-salesforce.teamConfigUrl';

export class TeamSyncProvider {
  private readonly disposables: vscode.Disposable[] = [];

  private constructor() {}

  static create(context: vscode.ExtensionContext): TeamSyncProvider {
    const provider = new TeamSyncProvider();
    context.subscriptions.push(
      new vscode.Disposable(() => provider.dispose())
    );
    return provider;
  }

  /**
   * Check team sync on startup.
   * Reads the teamConfigUrl from settings. If set, fetches and checks silently.
   * If drift is found, shows an info message with a "View Report" button.
   * If up to date, does nothing.
   */
  async checkOnStartup(rootPath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const teamConfigUrl = config.get<string>(CONFIG_KEY, '');

    if (!teamConfigUrl || teamConfigUrl.trim() === '') {
      // No URL configured — nothing to do
      return;
    }

    // Silently fetch in background
    try {
      const teamConfig = await fetchTeamConfig(teamConfigUrl.trim());
      if (!teamConfig) {
        // Network error or bad URL — don't bother the user
        return;
      }

      const result = await checkTeamSync(rootPath, teamConfig);

      const issueCount = result.drifted.length + result.missing.length;
      if (issueCount === 0) {
        // Up to date — no noise
        return;
      }

      // Show informational message with option to view the full report
      const action = await vscode.window.showInformationMessage(
        `AI-Kit: ${issueCount} drift issue(s) found vs team config v${result.configVersion}. ${result.drifted.length} drifted, ${result.missing.length} missing.`,
        'View Report'
      );

      if (action === 'View Report') {
        // Open a webview with the drift report
        const panel = vscode.window.createWebviewPanel(
          'ai-kit-team-sync-auto',
          `AI-Kit Team Sync — v${result.configVersion}`,
          vscode.ViewColumn.One,
          {}
        );
        panel.webview.html = buildTeamSyncHtml(result);
      }
    } catch {
      // Silently ignore all errors — don't disturb the user on startup
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

// ─── Helper HTML builder ──────────────────────────────────────────────────────

function buildTeamSyncHtml(result: Awaited<ReturnType<typeof checkTeamSync>>): string {
  const driftedRows = result.drifted
    .map(
      (d) =>
        `<tr><td><strong>${d.relativePath}</strong></td><td class="warn">${d.reason}</td><td>${d.missingSignals.join('<br>')}</td></tr>`
    )
    .join('');
  const missingRows = result.missing
    .map(
      (m) =>
        `<tr><td><strong>${m}</strong></td><td class="error">File not found</td><td>—</td></tr>`
    )
    .join('');
  const okRows = result.upToDate
    .map(
      (f) =>
        `<tr><td>${f}</td><td colspan="2" class="ok">✓ Up to date</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground)}
  h1{margin-bottom:8px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;padding:8px;background:#1e1e1e;border-bottom:2px solid #444}
  td{padding:8px;border-bottom:1px solid #333;vertical-align:top}
  .warn{color:#ff9800} .ok{color:#4caf50} .error{color:#f44336}
</style></head><body>
<h1>AI-Kit Team Sync — v${result.configVersion}</h1>
<p>${result.summary}</p>
<table>
  <thead><tr><th>File</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>${driftedRows}${missingRows}${okRows}</tbody>
</table>
${result.drifted.length > 0 ? '<p style="margin-top:16px;opacity:.7">To fix: delete drifted files and run AI-Kit: Apply Recommended Setup</p>' : ''}
</body></html>`;
}
