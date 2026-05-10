/**
 * DiagnosticsProvider — real-time inline diagnostics for Apex and LWC files.
 * Debounces change events and pushes to a VS Code DiagnosticCollection.
 */
import * as vscode from 'vscode';
export declare class DiagnosticsProvider {
    private readonly collection;
    private readonly disposables;
    private debounceTimers;
    private constructor();
    static create(context: vscode.ExtensionContext): DiagnosticsProvider;
    private scheduleUpdate;
    private updateDiagnostics;
    /**
     * Returns the number of diagnostics for a given URI.
     */
    getDiagnosticCount(uri: vscode.Uri): number;
    dispose(): void;
}
//# sourceMappingURL=diagnostics-provider.d.ts.map