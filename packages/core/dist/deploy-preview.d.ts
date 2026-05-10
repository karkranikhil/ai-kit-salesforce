/**
 * Org-aware deploy diff preview.
 * Walks the source directory, classifies components by file extension/name,
 * reads org context, and assembles a deploy preview report.
 */
export interface DeployPreviewOptions {
    rootPath: string;
    targetOrg?: string;
    /** defaults to 'force-app' */
    sourceDir?: string;
}
export interface DeployPreviewResult {
    targetOrg: string;
    isProduction: boolean;
    componentsToAdd: ComponentInfo[];
    componentsToModify: ComponentInfo[];
    componentsToDelete: ComponentInfo[];
    risks: string[];
    validationCommand: string;
    deployCommand: string;
}
export interface ComponentInfo {
    name: string;
    /** ApexClass, ApexTrigger, LightningComponentBundle, Flow, PermissionSet, Profile, etc. */
    type: string;
    filePath: string;
}
/**
 * Build a deploy preview for the given project root.
 * All found components are treated as "to add" (we don't have org-side state without auth).
 */
export declare function buildDeployPreview(options: DeployPreviewOptions): Promise<DeployPreviewResult>;
/**
 * Returns a markdown-formatted string suitable for a VS Code webview.
 */
export declare function formatDeployPreview(result: DeployPreviewResult): string;
//# sourceMappingURL=deploy-preview.d.ts.map