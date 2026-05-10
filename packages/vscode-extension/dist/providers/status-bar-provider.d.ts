/**
 * StatusBarProvider — manages the AI-Kit status bar item.
 * Shows the readiness score and current org alias.
 */
import * as vscode from 'vscode';
export declare class StatusBarProvider {
    private readonly statusBarItem;
    private refreshTimer;
    private readonly disposables;
    private constructor();
    static create(context: vscode.ExtensionContext): StatusBarProvider;
    /**
     * Schedule a refresh after an optional delay (defaults to 2000ms).
     * Cancels any pending refresh first.
     */
    scheduleRefresh(delayMs?: number): void;
    /**
     * Run scanProject + readOrgContext in parallel and update the status bar.
     */
    refresh(): Promise<void>;
    private getRootPath;
    dispose(): void;
}
//# sourceMappingURL=status-bar-provider.d.ts.map