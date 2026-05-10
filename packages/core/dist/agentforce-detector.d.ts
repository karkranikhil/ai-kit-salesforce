/**
 * Agentforce context detector.
 * Scans the project for Agentforce-related metadata and provides recommendations.
 */
export interface AgentforceContext {
    hasAgentforceMetadata: boolean;
    /** Class names with @InvocableMethod */
    invocableActions: string[];
    /** .prompt-meta.xml files found (filename without extension) */
    promptTemplates: string[];
    /** .agentTopic-meta.xml or .bot-meta.xml files found */
    agentTopics: string[];
    afvLibraryInstalled: boolean;
    recommendations: string[];
}
export declare function detectAgentforceContext(rootPath: string): Promise<AgentforceContext>;
//# sourceMappingURL=agentforce-detector.d.ts.map