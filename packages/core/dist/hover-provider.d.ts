/**
 * Provides hover explanation content for AI-Kit diagnostics.
 * Maps diagnostic ruleFile → human-readable explanation with a link to the rule file.
 */
export interface HoverContent {
    title: string;
    explanation: string;
    ruleFile: string;
    fixSuggestion: string;
    docsLink?: string;
}
/**
 * Returns appropriate HoverContent based on ruleId (preferred), message patterns, or ruleFile fallback.
 */
export declare function getHoverContent(ruleFile: string, message: string, ruleId?: string): HoverContent;
//# sourceMappingURL=hover-provider.d.ts.map