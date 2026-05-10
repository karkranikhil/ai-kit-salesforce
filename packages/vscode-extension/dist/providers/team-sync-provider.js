"use strict";
/**
 * TeamSyncProvider — auto-checks team config on workspace open.
 * Reads the teamConfigUrl from VS Code settings and silently runs
 * drift detection in the background. Shows a notification if there is drift.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamSyncProvider = void 0;
const vscode = __importStar(require("vscode"));
const core_1 = require("@sf-ai-toolkit/core");
const CONFIG_KEY = 'sf-ai-toolkit.teamConfigUrl';
function isAllowedTeamConfigUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
class TeamSyncProvider {
    constructor() {
        this.disposables = [];
    }
    static create(context) {
        const provider = new TeamSyncProvider();
        context.subscriptions.push(new vscode.Disposable(() => provider.dispose()));
        return provider;
    }
    /**
     * Check team sync on startup.
     * Reads the teamConfigUrl from settings. If set, fetches and checks silently.
     * If drift is found, shows an info message with a "View Report" button.
     * If up to date, does nothing.
     */
    async checkOnStartup(rootPath) {
        if (!vscode.workspace.isTrusted)
            return;
        const config = vscode.workspace.getConfiguration();
        const teamConfigUrl = config.get(CONFIG_KEY, '');
        if (!teamConfigUrl || teamConfigUrl.trim() === '') {
            // No URL configured — nothing to do
            return;
        }
        if (!isAllowedTeamConfigUrl(teamConfigUrl.trim())) {
            return;
        }
        // Silently fetch in background
        try {
            const teamConfig = await (0, core_1.fetchTeamConfig)(teamConfigUrl.trim());
            if (!teamConfig) {
                // Network error or bad URL — don't bother the user
                return;
            }
            const result = await (0, core_1.checkTeamSync)(rootPath, teamConfig);
            const issueCount = result.drifted.length + result.missing.length;
            if (issueCount === 0) {
                // Up to date — no noise
                return;
            }
            // Show informational message with option to view the full report
            const action = await vscode.window.showInformationMessage(`AI-Kit: ${issueCount} drift issue(s) found vs team config v${result.configVersion}. ${result.drifted.length} drifted, ${result.missing.length} missing.`, 'View Report');
            if (action === 'View Report') {
                // Open a webview with the drift report
                const panel = vscode.window.createWebviewPanel('ai-kit-team-sync-auto', `AI-Kit Team Sync — v${result.configVersion}`, vscode.ViewColumn.One, { enableScripts: false });
                panel.webview.html = buildTeamSyncHtml(result);
            }
        }
        catch {
            // Silently ignore all errors — don't disturb the user on startup
        }
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.TeamSyncProvider = TeamSyncProvider;
// ─── Helper HTML builder ──────────────────────────────────────────────────────
function buildTeamSyncHtml(result) {
    const driftedRows = result.drifted
        .map((d) => `<tr><td><strong>${escapeHtml(d.relativePath)}</strong></td><td class="warn">${escapeHtml(d.reason)}</td><td>${d.missingSignals.map(escapeHtml).join('<br>')}</td></tr>`)
        .join('');
    const missingRows = result.missing
        .map((m) => `<tr><td><strong>${escapeHtml(m)}</strong></td><td class="error">File not found</td><td>—</td></tr>`)
        .join('');
    const okRows = result.upToDate
        .map((f) => `<tr><td>${escapeHtml(f)}</td><td colspan="2" class="ok">✓ Up to date</td></tr>`)
        .join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground)}
  h1{margin-bottom:8px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;padding:8px;background:#1e1e1e;border-bottom:2px solid #444}
  td{padding:8px;border-bottom:1px solid #333;vertical-align:top}
  .warn{color:#ff9800} .ok{color:#4caf50} .error{color:#f44336}
</style></head><body>
<h1>AI-Kit Team Sync — v${escapeHtml(result.configVersion)}</h1>
<p>${escapeHtml(result.summary)}</p>
<table>
  <thead><tr><th>File</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>${driftedRows}${missingRows}${okRows}</tbody>
</table>
${result.drifted.length > 0 ? '<p style="margin-top:16px;opacity:.7">To fix: delete drifted files and run AI-Kit: Apply Recommended Setup</p>' : ''}
</body></html>`;
}
//# sourceMappingURL=team-sync-provider.js.map