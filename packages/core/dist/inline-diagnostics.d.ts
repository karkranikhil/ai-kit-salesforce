/**
 * Inline rule annotations — detects Salesforce anti-patterns in source files
 * and maps them back to the Cursor rule that governs them.
 *
 * Each rule produces zero or more Diagnostic entries with a file range,
 * message, and the source rule file for quick navigation.
 */
export interface Diagnostic {
    /** 0-based line number */
    line: number;
    /** 0-based start column */
    startCol: number;
    /** 0-based end column (-1 means end of line) */
    endCol: number;
    message: string;
    /** Relative path to the rule that defines this */
    ruleFile: string;
    severity: 'error' | 'warning' | 'info';
    /** Optional rule identifier */
    ruleId?: string;
}
export type FileType = 'apex' | 'lwc-js' | 'lwc-html' | 'unknown';
export declare function detectFileType(filePath: string): FileType;
export declare function analyseFile(content: string, fileType: FileType): Diagnostic[];
/**
 * Returns a 1-line summary like "3 errors, 2 warnings" or "No issues"
 */
export declare function getDiagnosticSummary(diagnostics: Diagnostic[]): string;
//# sourceMappingURL=inline-diagnostics.d.ts.map