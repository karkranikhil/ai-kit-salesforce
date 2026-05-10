"use strict";
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
const vitest_1 = require("vitest");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const agentforce_detector_1 = require("../agentforce-detector");
// ─── Temp dir helpers ─────────────────────────────────────────────────────────
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-agentforce-test-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
// ─── Tests ────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('detectAgentforceContext', () => {
    (0, vitest_1.it)('returns hasAgentforceMetadata: false for an empty project', async () => {
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.hasAgentforceMetadata).toBe(false);
        (0, vitest_1.expect)(ctx.invocableActions).toHaveLength(0);
        (0, vitest_1.expect)(ctx.promptTemplates).toHaveLength(0);
        (0, vitest_1.expect)(ctx.agentTopics).toHaveLength(0);
    });
    (0, vitest_1.it)('detects @InvocableMethod in an Apex class and sets hasAgentforceMetadata', async () => {
        const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
        await fs.ensureDir(classesDir);
        await fs.writeFile(path.join(classesDir, 'CreateCaseAction.cls'), `public with sharing class CreateCaseAction {
  @InvocableMethod(label='Create Case' description='Creates a new case')
  public static List<Id> execute(List<String> subjects) {
    List<Case> cases = new List<Case>();
    for (String s : subjects) {
      cases.add(new Case(Subject = s));
    }
    insert cases;
    List<Id> ids = new List<Id>();
    for (Case c : cases) ids.add(c.Id);
    return ids;
  }
}`);
        // Another class without @InvocableMethod — should not be included
        await fs.writeFile(path.join(classesDir, 'AccountService.cls'), 'public with sharing class AccountService { public void run() {} }');
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.hasAgentforceMetadata).toBe(true);
        (0, vitest_1.expect)(ctx.invocableActions).toContain('CreateCaseAction');
        (0, vitest_1.expect)(ctx.invocableActions).not.toContain('AccountService');
    });
    (0, vitest_1.it)('detects .prompt-meta.xml files', async () => {
        const promptsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'prompts');
        await fs.ensureDir(promptsDir);
        await fs.writeFile(path.join(promptsDir, 'CaseSummary.prompt-meta.xml'), '<PromptTemplate></PromptTemplate>');
        await fs.writeFile(path.join(promptsDir, 'LeadEmailDraft.prompt-meta.xml'), '<PromptTemplate></PromptTemplate>');
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.hasAgentforceMetadata).toBe(true);
        (0, vitest_1.expect)(ctx.promptTemplates).toContain('CaseSummary');
        (0, vitest_1.expect)(ctx.promptTemplates).toContain('LeadEmailDraft');
    });
    (0, vitest_1.it)('detects .agentTopic-meta.xml files', async () => {
        const topicsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'agentTopics');
        await fs.ensureDir(topicsDir);
        await fs.writeFile(path.join(topicsDir, 'ServiceTopic.agentTopic-meta.xml'), '<AgentTopic></AgentTopic>');
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.hasAgentforceMetadata).toBe(true);
        (0, vitest_1.expect)(ctx.agentTopics).toContain('ServiceTopic');
    });
    (0, vitest_1.it)('detects .bot-meta.xml files as agent topics', async () => {
        const botsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'bots');
        await fs.ensureDir(botsDir);
        await fs.writeFile(path.join(botsDir, 'ServiceBot.bot-meta.xml'), '<Bot></Bot>');
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.hasAgentforceMetadata).toBe(true);
        (0, vitest_1.expect)(ctx.agentTopics).toContain('ServiceBot');
    });
    (0, vitest_1.it)('includes AFV Library recommendation when invocable actions found and no AFV skills', async () => {
        const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
        await fs.ensureDir(classesDir);
        await fs.writeFile(path.join(classesDir, 'MyAction.cls'), 'public class MyAction { @InvocableMethod public static void run(List<String> args) {} }');
        // No .cursor/skills directory — afvLibraryInstalled should be false
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.afvLibraryInstalled).toBe(false);
        const afvRec = ctx.recommendations.find((r) => r.includes('AFV Library'));
        (0, vitest_1.expect)(afvRec).toBeDefined();
        (0, vitest_1.expect)(afvRec).toContain('npx skills add forcedotcom/afv-library');
    });
    (0, vitest_1.it)('does NOT add AFV Library recommendation when skills are already installed', async () => {
        const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
        await fs.ensureDir(classesDir);
        await fs.writeFile(path.join(classesDir, 'MyAction.cls'), 'public class MyAction { @InvocableMethod public static void run(List<String> args) {} }');
        // Simulate installed AFV skills
        const skillsDir = path.join(tmpDir, '.cursor', 'skills', 'agentforce');
        await fs.ensureDir(skillsDir);
        await fs.writeFile(path.join(skillsDir, 'SKILL.md'), '# Agentforce Skill');
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.afvLibraryInstalled).toBe(true);
        const afvRec = ctx.recommendations.find((r) => r.includes('AFV Library skills available'));
        (0, vitest_1.expect)(afvRec).toBeUndefined();
    });
    (0, vitest_1.it)('includes prompt template security recommendation when prompt templates found', async () => {
        const promptsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'prompts');
        await fs.ensureDir(promptsDir);
        await fs.writeFile(path.join(promptsDir, 'MyPrompt.prompt-meta.xml'), '<PromptTemplate></PromptTemplate>');
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        const secRec = ctx.recommendations.find((r) => r.includes('review-security'));
        (0, vitest_1.expect)(secRec).toBeDefined();
    });
    (0, vitest_1.it)('returns afvLibraryInstalled: false when skills dir does not exist', async () => {
        const ctx = await (0, agentforce_detector_1.detectAgentforceContext)(tmpDir);
        (0, vitest_1.expect)(ctx.afvLibraryInstalled).toBe(false);
    });
});
//# sourceMappingURL=agentforce-detector.test.js.map