export type Preset = 'core' | 'lwc' | 'agentforce' | 'data-cloud' | 'experience-cloud';
export interface ProjectScanResult {
    rootPath: string;
    isSalesforceDx: boolean;
    hasForceApp: boolean;
    hasPackageJson: boolean;
    hasAgentsMd: boolean;
    hasClaudeMd: boolean;
    hasCursorRules: boolean;
    hasCursorSkills: boolean;
    hasClaudeCommands: boolean;
    hasClaudeAgents: boolean;
    hasDocs: boolean;
    hasMcpGuide: boolean;
    hasForceIgnore: boolean;
    hasMcpConfig: boolean;
    hasAfvSkills: boolean;
    hasAfvLibraryDocs: boolean;
    hasAfvLibrarySkills: boolean;
    hasTasksTodo: boolean;
    hasTasksLessons: boolean;
    hasCursorProjectRule: boolean;
    score: number;
    missing: string[];
    warnings: string[];
    recommendations: string[];
}
export interface SetupOptions {
    preset: Preset;
    dryRun?: boolean;
    yes?: boolean;
    verbose?: boolean;
}
export type FileAction = 'create' | 'append' | 'merge' | 'skip';
export interface PlannedFile {
    relativePath: string;
    action: FileAction;
    reason: string;
    templateKey: string;
}
export interface SetupPlan {
    rootPath: string;
    preset: Preset;
    dryRun: boolean;
    files: PlannedFile[];
    packageJsonScripts: Record<string, string>;
    forceIgnoreLines: string[];
}
export interface WriteResult {
    path: string;
    action: FileAction;
    skipped: boolean;
    reason?: string;
}
export interface SafeWriteOptions {
    /** If true, do not write — only report what would happen */
    dryRun?: boolean;
    /** If false (default), never overwrite; append marker block or skip */
    overwrite?: boolean;
    /** Marker block label; if provided, content is wrapped in AI-KIT markers */
    markerLabel?: string;
}
export interface ApplyResult {
    filesCreated: string[];
    filesModified: string[];
    filesSkipped: string[];
    packageJsonUpdated: boolean;
    forceIgnoreUpdated: boolean;
    backupPath?: string;
    errors: string[];
}
export interface ToolkitConfig {
    quality?: {
        pmd?: {
            enabled?: boolean;
            /** Optional full command to run PMD or a wrapper script */
            runCommand?: string;
        };
    };
    git?: {
        commitMessage?: {
            enabled?: boolean;
            /**
             * JavaScript regex source string.
             * Example: "^(feat|fix|docs|chore)(\\([a-z0-9_-]+\\))?: .{1,72}$"
             */
            pattern?: string;
            helpText?: string;
        };
    };
}
//# sourceMappingURL=types.d.ts.map