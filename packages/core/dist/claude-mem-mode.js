"use strict";
/**
 * Generates the salesforce-dx.json claude-mem mode file.
 * Drop it in the claude-mem plugin/modes/ directory to teach claude-mem
 * to capture Salesforce-specific observations across sessions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SALESFORCE_DX_MODE = void 0;
exports.generateClaudeMemModeJson = generateClaudeMemModeJson;
exports.SALESFORCE_DX_MODE = {
    name: 'salesforce-dx',
    description: 'Captures Salesforce DX development observations — Apex patterns, deployment decisions, org config, MCP operations, security rules, and permission model choices.',
    version: '1.0.0',
    observation_types: [
        {
            id: 'apex-pattern',
            label: 'Apex Pattern',
            description: 'A reusable Apex design decision — service layer, trigger handler, selector, domain pattern, bulk handling approach, or async strategy.',
            emoji: '⚡',
            work_emoji: '🔨',
        },
        {
            id: 'deployment-issue',
            label: 'Deployment Issue',
            description: 'A deployment decision, validation error, test failure, coverage gap, or rollback action encountered during deployment.',
            emoji: '🚀',
            work_emoji: '🔧',
        },
        {
            id: 'permission-rule',
            label: 'Permission Rule',
            description: 'A decision about Permission Sets, Profiles, CRUD/FLS enforcement, sharing rules, or guest user access configuration.',
            emoji: '🔒',
            work_emoji: '🛡️',
        },
        {
            id: 'org-config',
            label: 'Org Config',
            description: 'An org alias, scratch org definition, sandbox configuration, Connected App setting, Named Credential setup, or remote site setting.',
            emoji: '🏢',
            work_emoji: '⚙️',
        },
        {
            id: 'mcp-operation',
            label: 'MCP Operation',
            description: 'A Salesforce DX MCP tool use — org query, metadata retrieval, deployment via MCP, SOQL run, or LWC expert guidance call.',
            emoji: '🤖',
            work_emoji: '🔗',
        },
        {
            id: 'security-finding',
            label: 'Security Finding',
            description: 'A SOQL injection risk, missing CRUD/FLS check, sharing violation, exposed credential, guest user gap, or production safety concern.',
            emoji: '🚨',
            work_emoji: '🔍',
        },
        {
            id: 'lwc-decision',
            label: 'LWC Decision',
            description: 'A Lightning Web Component design choice — wire adapter selection, component decomposition, state management, Apex integration pattern, or UX state handling.',
            emoji: '⚡',
            work_emoji: '🎨',
        },
        {
            id: 'test-strategy',
            label: 'Test Strategy',
            description: 'An Apex test design decision — test data strategy, mock approach, coverage gap fix, bulk test pattern, or security test scenario.',
            emoji: '🧪',
            work_emoji: '✅',
        },
        {
            id: 'agentforce-pattern',
            label: 'Agentforce Pattern',
            description: 'An Agentforce agent design decision — topic scope, invocable action design, Prompt Template approach, or AFV Library skill usage.',
            emoji: '🧠',
            work_emoji: '🤖',
        },
    ],
    observation_concepts: [
        {
            id: 'governor-limit',
            label: 'Governor Limit',
            description: 'Relates to Apex governor limits — SOQL rows, DML statements, CPU time, heap size.',
        },
        {
            id: 'security-critical',
            label: 'Security Critical',
            description: 'Relates to CRUD/FLS, sharing, SOQL injection, secrets, or production safety.',
        },
        {
            id: 'production-risk',
            label: 'Production Risk',
            description: 'Affects production org — deployment, permission change, data mutation, or metadata deletion.',
        },
        {
            id: 'reusable-pattern',
            label: 'Reusable Pattern',
            description: 'A pattern worth applying to other areas of the codebase.',
        },
        {
            id: 'mcp-preferred',
            label: 'MCP Preferred',
            description: 'This operation should use Salesforce DX MCP rather than CLI commands.',
        },
        {
            id: 'org-specific',
            label: 'Org Specific',
            description: 'Only applies to a particular org alias, sandbox, or production configuration.',
        },
        {
            id: 'ai-kit-generated',
            label: 'AI-Kit Generated',
            description: 'Created or modified by AI-Kit for Salesforce scaffold.',
        },
    ],
    prompts: {
        system_identity: 'You are a senior Salesforce DX observer embedded in the development session. ' +
            'Your role is to capture high-signal observations about Salesforce Apex patterns, ' +
            'deployment decisions, permission model choices, org configuration, MCP operations, ' +
            'and security findings. You help the team build institutional memory about this org.',
        spatial_awareness: 'This is a Salesforce DX project. Source lives under force-app/. ' +
            'The team uses sf CLI, Salesforce DX MCP, Cursor with project rules, ' +
            'Claude Code with CLAUDE.md rules, and AI-Kit for Salesforce scaffolding. ' +
            'Org operations prefer MCP over direct CLI. Production is read-only by default.',
        observer_role: 'Observe the development session and capture decisions that would be valuable to remember ' +
            'across sessions — especially patterns that are non-obvious, project-specific, or that ' +
            'took effort to figure out. Prioritise: Apex design patterns, deployment learnings, ' +
            'security decisions, org-specific configuration, and MCP operation results.',
        recording_focus: 'Focus on: Apex patterns (bulkification, service layer, trigger handler), ' +
            'deployment outcomes (what failed, what worked, why), ' +
            'permission model decisions (which Permission Sets, which CRUD/FLS patterns), ' +
            'org config (org aliases, Connected Apps, Named Credentials), ' +
            'MCP operations (what was queried, what was deployed), ' +
            'security findings (SOQL injection risks, sharing decisions), ' +
            'LWC decisions (wire adapters, component decomposition), ' +
            'test strategies (test data approach, coverage gaps fixed).',
        skip_guidance: 'Skip: trivial variable renames, minor formatting changes, ' +
            'obvious syntax fixes that are not project-specific, ' +
            'standard boilerplate that any Salesforce developer would know, ' +
            'and file saves without meaningful code changes.',
        type_guidance: 'Use apex-pattern for any reusable Apex design decision. ' +
            'Use deployment-issue for any deployment action, validation result, or test failure. ' +
            'Use permission-rule for any CRUD/FLS, sharing, or Permission Set decision. ' +
            'Use org-config for any org alias, auth, or integration configuration. ' +
            'Use mcp-operation when MCP tools are used for org interaction. ' +
            'Use security-finding for any security risk identified or resolved. ' +
            'Use lwc-decision for any LWC design or integration choice. ' +
            'Use test-strategy for any test design or coverage decision. ' +
            'Use agentforce-pattern for any Agentforce agent or invocable action design.',
        concept_guidance: 'Tag governor-limit for anything that could hit Apex limits. ' +
            'Tag security-critical for CRUD/FLS, sharing, injection, or secrets. ' +
            'Tag production-risk for anything affecting production org. ' +
            'Tag reusable-pattern for patterns worth applying elsewhere. ' +
            'Tag mcp-preferred when MCP should be used instead of CLI. ' +
            'Tag org-specific when the observation only applies to one org.',
        field_guidance: 'Include the org alias when known. ' +
            'Reference the specific Apex class, trigger, or component when relevant. ' +
            'Include the sf CLI or MCP command used when it is part of the observation. ' +
            'Note whether this applies to sandbox, scratch org, or production.',
    },
};
function generateClaudeMemModeJson() {
    return JSON.stringify(exports.SALESFORCE_DX_MODE, null, 2) + '\n';
}
//# sourceMappingURL=claude-mem-mode.js.map