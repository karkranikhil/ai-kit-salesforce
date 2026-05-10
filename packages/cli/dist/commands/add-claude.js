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
exports.addClaudeCommand = addClaudeCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
const CLAUDE_FILES = [
    'AGENTS.md',
    'CLAUDE.md',
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
];
function addClaudeCommand() {
    return new commander_1.Command('add-claude')
        .description('Add CLAUDE.md, Claude commands, and Claude subagents')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding Claude Code setup...');
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const claudePlan = {
            ...plan,
            files: plan.files.filter((f) => CLAUDE_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, claudePlan);
        for (const f of result.filesCreated)
            ui.success(f);
        for (const f of result.filesSkipped)
            ui.info(`skipped: ${f}`);
        for (const e of result.errors)
            ui.error(e);
        if (dryRun) {
            ui.warn('Dry run — no files were created.');
        }
        else {
            ui.success('Claude Code setup complete.');
        }
    });
}
//# sourceMappingURL=add-claude.js.map