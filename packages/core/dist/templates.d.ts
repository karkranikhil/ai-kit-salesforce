/**
 * All template content is defined inline here so the package is self-contained
 * with no runtime template file dependencies.
 */
export declare const MARKER_START = "<!-- AI-KIT-SALESFORCE:START -->";
export declare const MARKER_END = "<!-- AI-KIT-SALESFORCE:END -->";
export interface TemplateMap {
    [key: string]: string;
}
export declare const TEMPLATES: TemplateMap;
export declare function getTemplate(key: string): string;
export declare function hasTemplate(key: string): boolean;
/** Returns template content wrapped in AI-KIT marker block */
export declare function wrapInMarker(content: string): string;
//# sourceMappingURL=templates.d.ts.map