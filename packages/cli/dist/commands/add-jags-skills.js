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
exports.addJagsSkillsCommand = addJagsSkillsCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
const SKILL_FILES = [
    '.cursor/skills/salesforce-apex/SKILL.md',
    '.cursor/skills/salesforce-lwc/SKILL.md',
    '.cursor/skills/salesforce-flow/SKILL.md',
    '.cursor/skills/salesforce-security-review/SKILL.md',
    '.cursor/skills/salesforce-agentforce/SKILL.md',
    '.cursor/skills/salesforce-data-cloud/SKILL.md',
    'docs/jags-skills.md',
    'docs/skills-ecosystem.md',
];
function addJagsSkillsCommand() {
    return new commander_1.Command('add-jags-skills')
        .description('Add local AI-Kit Salesforce skill templates (Cursor-compatible)')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding AI-Kit Salesforce skill templates...');
        console.log('');
        ui.info('These are AI-Kit local Salesforce skill templates — compatible with Cursor skills workflow.');
        ui.info('They are NOT official Jag files. See docs/jags-skills.md for Jag installation options.');
        console.log('');
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const skillsPlan = {
            ...plan,
            files: plan.files.filter((f) => SKILL_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, skillsPlan);
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
            ui.success('Skill templates created.');
            console.log('');
            ui.info('TODO: To install Jag\'s actual Salesforce skills in the future:');
            ui.item('  npx skills add Jaganpro/sf-skills');
            ui.info('Review the source before running.');
        }
    });
}
//# sourceMappingURL=add-jags-skills.js.map