"use strict";
/**
 * DiagnosticsProvider — real-time inline diagnostics for Apex and LWC files.
 * Debounces change events and pushes to a VS Code DiagnosticCollection.
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
exports.DiagnosticsProvider = void 0;
const vscode = __importStar(require("vscode"));
const core_1 = require("@sf-ai-toolkit/core");
const DEBOUNCE_MS = 400;
class DiagnosticsProvider {
    constructor(collection) {
        this.disposables = [];
        this.debounceTimers = new Map();
        this.collection = collection;
    }
    static create(context) {
        const collection = vscode.languages.createDiagnosticCollection('sf-ai-toolkit-inline');
        context.subscriptions.push(collection);
        const provider = new DiagnosticsProvider(collection);
        // Register document event listeners
        provider.disposables.push(vscode.workspace.onDidOpenTextDocument((doc) => provider.updateDiagnostics(doc)), vscode.workspace.onDidChangeTextDocument((e) => provider.scheduleUpdate(e.document)), vscode.workspace.onDidCloseTextDocument((doc) => {
            collection.delete(doc.uri);
            provider.debounceTimers.delete(doc.uri.toString());
        }));
        // Run on already-open editors
        for (const doc of vscode.workspace.textDocuments) {
            provider.updateDiagnostics(doc);
        }
        return provider;
    }
    scheduleUpdate(document) {
        const key = document.uri.toString();
        const existing = this.debounceTimers.get(key);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => {
            this.debounceTimers.delete(key);
            this.updateDiagnostics(document);
        }, DEBOUNCE_MS);
        this.debounceTimers.set(key, timer);
    }
    updateDiagnostics(document) {
        const fileType = (0, core_1.detectFileType)(document.fileName);
        if (fileType === 'unknown')
            return;
        const content = document.getText();
        const aiKitDiags = (0, core_1.analyseFile)(content, fileType);
        const vsDiags = aiKitDiags.map((d) => {
            const lineCount = document.lineCount;
            const lineIndex = Math.min(d.line, lineCount - 1);
            const line = document.lineAt(lineIndex);
            const startCol = Math.min(d.startCol, line.text.length);
            const endCol = d.endCol === -1 ? line.text.length : Math.min(d.endCol, line.text.length);
            const range = new vscode.Range(lineIndex, startCol, lineIndex, endCol);
            const severity = d.severity === 'error'
                ? vscode.DiagnosticSeverity.Error
                : d.severity === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;
            const diag = new vscode.Diagnostic(range, d.message, severity);
            diag.source = `AI-Kit (${d.ruleFile})`;
            if (d.ruleId) {
                diag.code = d.ruleId;
            }
            return diag;
        });
        this.collection.set(document.uri, vsDiags);
    }
    /**
     * Returns the number of diagnostics for a given URI.
     */
    getDiagnosticCount(uri) {
        const diags = this.collection.get(uri);
        return diags ? diags.length : 0;
    }
    dispose() {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.collection.dispose();
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
//# sourceMappingURL=diagnostics-provider.js.map