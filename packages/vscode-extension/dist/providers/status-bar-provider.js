"use strict";
/**
 * StatusBarProvider — manages the AI-Kit status bar item.
 * Shows the readiness score and current org alias.
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
exports.StatusBarProvider = void 0;
const vscode = __importStar(require("vscode"));
const core_1 = require("@sf-ai-toolkit/core");
class StatusBarProvider {
    constructor(statusBarItem) {
        this.disposables = [];
        this.statusBarItem = statusBarItem;
    }
    static create(context) {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
        statusBarItem.command = 'ai-kit-sf.openReport';
        statusBarItem.tooltip = 'AI-Kit for Salesforce — click to open readiness report';
        statusBarItem.text = '$(loading~spin) AI-Kit';
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
        const provider = new StatusBarProvider(statusBarItem);
        context.subscriptions.push(new vscode.Disposable(() => provider.dispose()));
        return provider;
    }
    /**
     * Schedule a refresh after an optional delay (defaults to 2000ms).
     * Cancels any pending refresh first.
     */
    scheduleRefresh(delayMs = 2000) {
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
    async refresh() {
        const rootPath = this.getRootPath();
        if (!rootPath) {
            this.statusBarItem.text = '$(circle-slash) AI-Kit';
            this.statusBarItem.tooltip = 'AI-Kit: No workspace open';
            return;
        }
        try {
            const [result, orgCtx] = await Promise.all([
                (0, core_1.scanProject)(rootPath),
                (0, core_1.readOrgContext)(rootPath),
            ]);
            const score = result.score;
            const icon = score >= 80 ? '$(check)' : score >= 50 ? '$(warning)' : '$(error)';
            const orgAlias = orgCtx.source !== 'none' && orgCtx.defaultOrg
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
            const scoreLabel = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Critical';
            this.statusBarItem.tooltip =
                `AI-Kit for Salesforce\n` +
                    `Readiness: ${score}/100 (${scoreLabel})${orgLine}\n` +
                    (missingCount > 0
                        ? `${missingCount} item(s) missing — click to see report`
                        : 'All items present!');
        }
        catch {
            this.statusBarItem.text = '$(question) AI-Kit';
            this.statusBarItem.tooltip = 'AI-Kit: Error during scan';
        }
    }
    getRootPath() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0)
            return undefined;
        return folders[0].uri.fsPath;
    }
    dispose() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.StatusBarProvider = StatusBarProvider;
//# sourceMappingURL=status-bar-provider.js.map