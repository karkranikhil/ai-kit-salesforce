"use strict";
/**
 * AI-Kit Hover Provider — shows rule explanations and fix suggestions
 * when the cursor hovers over a position covered by an AI-Kit diagnostic.
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
exports.AiKitHoverProvider = void 0;
exports.registerHoverProvider = registerHoverProvider;
const vscode = __importStar(require("vscode"));
const core_1 = require("@sf-ai-toolkit/core");
class AiKitHoverProvider {
    constructor(diagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }
    provideHover(document, position, _token) {
        // Find any AI-Kit diagnostic at this position
        const diags = this.diagnosticCollection.get(document.uri);
        if (!diags || diags.length === 0)
            return undefined;
        const matching = diags.filter((d) => d.range.contains(position));
        if (matching.length === 0)
            return undefined;
        // Use the first matching diagnostic
        const diag = matching[0];
        // Extract ruleFile from the source string "AI-Kit (.cursor/rules/apex.mdc)"
        const ruleFileMatch = diag.source?.match(/AI-Kit \((.+)\)$/);
        const ruleFile = ruleFileMatch ? ruleFileMatch[1] : '';
        const hoverContent = (0, core_1.getHoverContent)(ruleFile, diag.message);
        const md = new vscode.MarkdownString('', true);
        md.isTrusted = { enabledCommands: ['_vscode.open'] };
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
exports.AiKitHoverProvider = AiKitHoverProvider;
/**
 * Register the hover provider for Apex files.
 * Returns the disposable so the caller can add it to context.subscriptions.
 */
function registerHoverProvider(context, diagnosticCollection) {
    const provider = new AiKitHoverProvider(diagnosticCollection);
    const disposable = vscode.languages.registerHoverProvider([
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', pattern: '**/*.cls' },
        { scheme: 'file', pattern: '**/*.trigger' },
    ], provider);
    context.subscriptions.push(disposable);
    return disposable;
}
//# sourceMappingURL=hover-provider.js.map