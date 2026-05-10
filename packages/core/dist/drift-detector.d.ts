export interface DriftResult {
    /** Files that exist but differ significantly from the current AI-Kit template */
    drifted: DriftedFile[];
    /** Files that are missing entirely */
    missing: string[];
    /** Files that match the current template closely */
    upToDate: string[];
}
export interface DriftedFile {
    relativePath: string;
    reason: string;
    /** Lines in template not found in project file (sample) */
    missingSignals: string[];
}
/** Key phrases that must be present in a file for it to be considered current */
declare const FILE_SIGNALS: Record<string, string[]>;
/** Check local files for the tracked key-phrase signals */
export declare function detectDrift(rootPath: string, filesToCheck?: string[]): Promise<DriftResult>;
/** Compare a project's AI setup against a remote team config snapshot */
export interface TeamConfig {
    version: string;
    /** Expected file keys that should exist */
    requiredFiles: string[];
    /** Signal phrases per file — overrides built-in signals */
    signals?: Record<string, string[]>;
    /** Human-readable description */
    description?: string;
}
export interface TeamSyncResult {
    configVersion: string;
    drifted: DriftedFile[];
    missing: string[];
    upToDate: string[];
    summary: string;
}
export declare function checkTeamSync(rootPath: string, teamConfig: TeamConfig): Promise<TeamSyncResult>;
/** Fetch a team config from a URL (for CLI/extension use). Returns null on failure. */
export declare function fetchTeamConfig(url: string): Promise<TeamConfig | null>;
export { FILE_SIGNALS };
//# sourceMappingURL=drift-detector.d.ts.map