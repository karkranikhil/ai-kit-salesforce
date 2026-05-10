/**
 * Generates the salesforce-dx.json claude-mem mode file.
 * Drop it in the claude-mem plugin/modes/ directory to teach claude-mem
 * to capture Salesforce-specific observations across sessions.
 */
export interface ClaudeMemMode {
    name: string;
    description: string;
    version: string;
    observation_types: ObservationType[];
    observation_concepts: ObservationConcept[];
    prompts: ClaudeMemPrompts;
}
interface ObservationType {
    id: string;
    label: string;
    description: string;
    emoji: string;
    work_emoji: string;
}
interface ObservationConcept {
    id: string;
    label: string;
    description: string;
}
interface ClaudeMemPrompts {
    system_identity: string;
    spatial_awareness: string;
    observer_role: string;
    recording_focus: string;
    skip_guidance: string;
    type_guidance: string;
    concept_guidance: string;
    field_guidance: string;
}
export declare const SALESFORCE_DX_MODE: ClaudeMemMode;
export declare function generateClaudeMemModeJson(): string;
export {};
//# sourceMappingURL=claude-mem-mode.d.ts.map