"use strict";
/**
 * Agentforce context detector.
 * Scans the project for Agentforce-related metadata and provides recommendations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAgentforceContext = detectAgentforceContext;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const AFV_SKILL_NAMES = [
    'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
    'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];
async function detectAfvLibraryInstalled(rootPath) {
    const skillsDir = path.join(rootPath, '.cursor', 'skills');
    if (!(await fs.pathExists(skillsDir)))
        return false;
    try {
        const entries = await fs.readdir(skillsDir);
        return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
    }
    catch {
        return false;
    }
}
/**
 * Walk a directory recursively and collect all files matching a predicate.
 */
async function findFiles(dir, predicate) {
    const results = [];
    if (!(await fs.pathExists(dir)))
        return results;
    async function recurse(current) {
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await recurse(fullPath);
            }
            else if (predicate(entry.name)) {
                results.push(fullPath);
            }
        }
    }
    await recurse(dir);
    return results;
}
/**
 * Extract the Apex class name from a .cls file path or content.
 * Falls back to the file basename without extension.
 */
function extractClassName(filePath, content) {
    // Try to find the class declaration
    const match = content.match(/\bclass\s+(\w+)\b/);
    if (match)
        return match[1];
    return path.basename(filePath, '.cls');
}
async function detectAgentforceContext(rootPath) {
    const forceAppDir = path.join(rootPath, 'force-app');
    // Run all scans in parallel
    const [clsFiles, promptFiles, topicFiles, botFiles, afvLibraryInstalled] = await Promise.all([
        findFiles(forceAppDir, (name) => name.endsWith('.cls')),
        findFiles(forceAppDir, (name) => name.endsWith('.prompt-meta.xml')),
        findFiles(forceAppDir, (name) => name.endsWith('.agentTopic-meta.xml')),
        findFiles(forceAppDir, (name) => name.endsWith('.bot-meta.xml')),
        detectAfvLibraryInstalled(rootPath),
    ]);
    // Find classes with @InvocableMethod
    const invocableActions = [];
    await Promise.all(clsFiles.map(async (filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            if (/@InvocableMethod\b/i.test(content)) {
                invocableActions.push(extractClassName(filePath, content));
            }
        }
        catch {
            // skip unreadable files
        }
    }));
    // Prompt templates — filename without the double extension
    const promptTemplates = promptFiles.map((f) => path.basename(f).replace('.prompt-meta.xml', ''));
    // Agent topics — merge both kinds
    const agentTopics = [
        ...topicFiles.map((f) => path.basename(f).replace('.agentTopic-meta.xml', '')),
        ...botFiles.map((f) => path.basename(f).replace('.bot-meta.xml', '')),
    ];
    const hasAgentforceMetadata = invocableActions.length > 0 ||
        promptTemplates.length > 0 ||
        agentTopics.length > 0;
    const recommendations = [];
    if (invocableActions.length > 0 && !afvLibraryInstalled) {
        recommendations.push('AFV Library skills available for Agentforce development — run: npx skills add forcedotcom/afv-library');
    }
    if (promptTemplates.length > 0) {
        recommendations.push('Review Prompt Templates for security — use /review-security command');
    }
    return {
        hasAgentforceMetadata,
        invocableActions,
        promptTemplates,
        agentTopics,
        afvLibraryInstalled,
        recommendations,
    };
}
//# sourceMappingURL=agentforce-detector.js.map