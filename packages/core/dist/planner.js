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
exports.planSetup = planSetup;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const templates_1 = require("./templates");
const RECOMMENDED_SCRIPTS = {
    'lint:lwc': 'eslint force-app/main/default/lwc',
    'format': 'prettier --write "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
    'format:check': 'prettier --check "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
    'test:apex': 'sf apex run test --test-level RunLocalTests --wait 30 --result-format human',
    'validate': 'sf project deploy validate --source-dir force-app --test-level RunLocalTests --wait 60',
    'deploy': 'sf project deploy start --source-dir force-app --test-level RunLocalTests --wait 60',
    'org:list': 'sf org list',
};
const FORCE_IGNORE_LINES = [
    '.env',
    '.env.*',
    '.sf/',
    '.sfdx/',
    'node_modules/',
    'coverage/',
    '.localdevserver/',
    '**/profiles/**',
    '**/installedPackages/**',
    '**/*.mpd-meta.xml',
];
const CORE_FILES = [
    'AGENTS.md',
    'CLAUDE.md',
    'tasks/todo.md',
    'tasks/lessons.md',
    '.cursor/rules/project.mdc',
    '.cursor/rules/salesforce-mcp.mdc',
    '.cursor/rules/apex.mdc',
    '.cursor/rules/lwc.mdc',
    '.cursor/rules/deployment.mdc',
    '.cursor/rules/safety.mdc',
    '.cursor/skills/salesforce-apex/SKILL.md',
    '.cursor/skills/salesforce-lwc/SKILL.md',
    '.cursor/skills/salesforce-flow/SKILL.md',
    '.cursor/skills/salesforce-security-review/SKILL.md',
    '.cursor/skills/salesforce-agentforce/SKILL.md',
    '.cursor/skills/salesforce-data-cloud/SKILL.md',
    '.claude/commands/review-security.md',
    '.claude/commands/validate-deploy.md',
    '.claude/commands/write-tests.md',
    '.claude/commands/create-apex.md',
    '.claude/commands/create-lwc.md',
    '.claude/commands/prepare-pr.md',
    '.claude/agents/salesforce-architect.md',
    '.claude/agents/apex-developer.md',
    '.claude/agents/lwc-developer.md',
    '.claude/agents/qa-tester.md',
    '.claude/agents/security-reviewer.md',
    'docs/security.md',
    'docs/testing.md',
    'docs/deployment.md',
    'docs/mcp-usage.md',
    'docs/cursor-setup.md',
    'docs/claude-code-setup.md',
    'docs/jags-skills.md',
    'docs/afv-library.md',
    'docs/skills-ecosystem.md',
];
const PRESET_EXTRA_FILES = {
    core: [],
    lwc: [], // placeholder
    agentforce: [], // afv-library docs included via core for agentforce
    'data-cloud': [],
    'experience-cloud': [],
};
async function planSetup(rootPath, options) {
    const { preset = 'core', dryRun = false } = options;
    const allFiles = [...CORE_FILES, ...(PRESET_EXTRA_FILES[preset] ?? [])];
    const files = await Promise.all(allFiles.map(async (relativePath) => {
        const fullPath = path.join(rootPath, relativePath);
        const fileExists = await fs.pathExists(fullPath);
        const templateKey = relativePath;
        const hasTemplate = templateKey in templates_1.TEMPLATES;
        return {
            relativePath,
            action: fileExists ? 'skip' : 'create',
            reason: fileExists
                ? 'File already exists — will not overwrite'
                : hasTemplate
                    ? 'Will be created from template'
                    : 'Template placeholder — will be created empty',
            templateKey,
        };
    }));
    // Determine which scripts are missing from package.json
    const packageJsonScripts = {};
    const pkgPath = path.join(rootPath, 'package.json');
    const hasPkg = await fs.pathExists(pkgPath);
    if (hasPkg) {
        const raw = await fs.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        for (const [name, cmd] of Object.entries(RECOMMENDED_SCRIPTS)) {
            if (!pkg.scripts?.[name]) {
                packageJsonScripts[name] = cmd;
            }
        }
    }
    // Determine which .forceignore lines are missing
    const forceIgnoreLines = [];
    const fiPath = path.join(rootPath, '.forceignore');
    const hasFi = await fs.pathExists(fiPath);
    if (!hasFi) {
        forceIgnoreLines.push(...FORCE_IGNORE_LINES);
    }
    else {
        const content = await fs.readFile(fiPath, 'utf8');
        for (const line of FORCE_IGNORE_LINES) {
            if (!content.includes(line)) {
                forceIgnoreLines.push(line);
            }
        }
    }
    return {
        rootPath,
        preset,
        dryRun,
        files,
        packageJsonScripts,
        forceIgnoreLines,
    };
}
//# sourceMappingURL=planner.js.map