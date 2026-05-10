/**
 * TeamSyncProvider — auto-checks team config on workspace open.
 * Reads the teamConfigUrl from VS Code settings and silently runs
 * drift detection in the background. Shows a notification if there is drift.
 */
import * as vscode from 'vscode';
export declare class TeamSyncProvider {
    private readonly disposables;
    private constructor();
    static create(context: vscode.ExtensionContext): TeamSyncProvider;
    /**
     * Check team sync on startup.
     * Reads the teamConfigUrl from settings. If set, fetches and checks silently.
     * If drift is found, shows an info message with a "View Report" button.
     * If up to date, does nothing.
     */
    checkOnStartup(rootPath: string): Promise<void>;
    dispose(): void;
}
//# sourceMappingURL=team-sync-provider.d.ts.map