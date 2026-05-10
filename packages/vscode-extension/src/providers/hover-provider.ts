/**
 * AI-Kit Hover Provider — shows rule explanations and fix suggestions
 * when the cursor hovers over a position covered by an AI-Kit diagnostic.
 */

import * as vscode from 'vscode';
import { getHoverContent } from '@ai-kit-salesforce/core';

export class AiKitHoverProvider implements vscode.HoverProvider {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.diagnosticCollection = diagnosticCollection;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.Hover | undefined {
    // Find any AI-Kit diagnostic at this position
    const diags = this.diagnosticCollection.get(document.uri);
    if (!diags || diags.length === 0) return undefined;

    const matching = diags.filter((d) => d.range.contains(position));
    if (matching.length === 0) return undefined;

    // Use the first matching diagnostic
    const diag = matching[0];
    // Extract ruleFile from the source string "AI-Kit (.cursor/rules/apex.mdc)"
    const ruleFileMatch = diag.source?.match(/AI-Kit \((.+)\)$/);
    const ruleFile = ruleFileMatch ? ruleFileMatch[1] : '';

    const hoverContent = getHoverContent(ruleFile, diag.message);

    const md = new vscode.MarkdownString('', true);
    md.isTrusted = true;
    md.supportHtml = false;

    // Title (bold)
    md.appendMarkdown(`**${hoverContent.title}**\n\n`);

    // Explanation
    md.appendMarkdown(`${hoverContent.explanation}\n\n`);

    // Fix suggestion
    md.appendMarkdown(`**Fix:** ${hoverContent.fixSuggestion}\n\n`);

    // Rule file link
    if (hoverContent.ruleFile) {
      md.appendMarkdown(`[Open rule: ${hoverContent.ruleFile}](command:_vscode.open?${encodeURIComponent(JSON.stringify(vscode.Uri.file(hoverContent.ruleFile).toString()))})`);
    }

    // Optional docs link
    if (hoverContent.docsLink) {
      md.appendMarkdown(`  |  [Salesforce Docs](${hoverContent.docsLink})`);
    }

    return new vscode.Hover(md, diag.range);
  }
}

/**
 * Register the hover provider for Apex files.
 * Returns the disposable so the caller can add it to context.subscriptions.
 */
export function registerHoverProvider(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection
): vscode.Disposable {
  const provider = new AiKitHoverProvider(diagnosticCollection);

  const disposable = vscode.languages.registerHoverProvider(
    [
      { scheme: 'file', language: 'apex' },
      { scheme: 'file', pattern: '**/*.cls' },
      { scheme: 'file', pattern: '**/*.trigger' },
    ],
    provider
  );

  context.subscriptions.push(disposable);
  return disposable;
}
