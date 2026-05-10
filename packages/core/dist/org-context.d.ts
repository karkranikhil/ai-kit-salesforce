export interface OrgContext {
    defaultOrg?: string;
    targetOrg?: string;
    /** Which file provided the org info */
    source: 'sfdx-project' | 'sf-config' | 'sfdx-config' | 'none';
}
export declare function readOrgContext(rootPath: string): Promise<OrgContext>;
export declare function formatOrgContext(ctx: OrgContext): string;
//# sourceMappingURL=org-context.d.ts.map