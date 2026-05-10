/**
 * AI-Kit Hover Provider — shows rule explanations and fix suggestions
 * when the cursor hovers over a position covered by an AI-Kit diagnostic.
 */
import * as vscode from 'vscode';
export declare class AiKitHoverProvider implements vscode.HoverProvider {
    private readonly diagnosticCollection;
    constructor(diagnosticCollection: vscode.DiagnosticCollection);
    provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.Hover | undefined;
}
/**
 * Register the hover provider for Apex files.
 * Returns the disposable so the caller can add it to context.subscriptions.
 */
export declare function registerHoverProvider(context: vscode.ExtensionContext, diagnosticCollection: vscode.DiagnosticCollection): vscode.Disposable;
//# sourceMappingURL=hover-provider.d.ts.map