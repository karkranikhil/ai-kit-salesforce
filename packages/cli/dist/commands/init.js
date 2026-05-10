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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = initCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const prompts_1 = __importDefault(require("prompts"));
const core_1 = require("@sf-ai-toolkit/core");
const ui = __importStar(require("../ui"));
const PRESETS = [
    { title: 'core', value: 'core', description: 'Standard Salesforce DX project' },
    { title: 'lwc', value: 'lwc', description: 'Adds extra LWC rules and skills' },
    { title: 'agentforce', value: 'agentforce', description: 'Adds Agentforce / AFV Library support' },
    { title: 'data-cloud', value: 'data-cloud', description: 'Adds Data Cloud docs and rules' },
    { title: 'experience-cloud', value: 'experience-cloud', description: 'Adds Experience Cloud rules' },
];
function initCommand() {
    return new commander_1.Command('init')
        .description('Initialise AI setup for the current Salesforce DX project')
        .option('--path <path>', 'Path to project root (defaults to current directory)')
        .option('--preset <preset>', 'Setup preset: core, lwc, agentforce, data-cloud, experience-cloud')
        .option('--dry-run', 'Preview what would be created without making changes')
        .option('--yes', 'Skip confirmation prompts')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('');
        // Scan first
        ui.info('Scanning project...');
        let scanResult;
        try {
            scanResult = await (0, core_1.scanProject)(rootPath);
        }
        catch (err) {
            ui.error('Scan failed: ' + String(err));
            process.exit(1);
        }
        console.log((0, core_1.generateReadinessReport)(scanResult));
        if (!scanResult.isSalesforceDx) {
            ui.warn('No sfdx-project.json found. AI-Kit works best with Salesforce DX projects.');
            ui.warn('Continuing anyway...');
        }
        // Select preset
        let preset = options.preset ?? 'core';
        if (!options.preset && !options.yes) {
            const response = await (0, prompts_1.default)({
                type: 'select',
                name: 'preset',
                message: 'Select a setup preset:',
                choices: PRESETS.map((p) => ({
                    title: `${p.title} — ${p.description}`,
                    value: p.value,
                })),
                initial: 0,
            });
            if (!response.preset) {
                ui.info('Cancelled.');
                process.exit(0);
            }
            preset = response.preset;
        }
        ui.info(`Using preset: ${preset}${dryRun ? ' (dry run)' : ''}`);
        // Plan
        const plan = await (0, core_1.planSetup)(rootPath, { preset, dryRun });
        const toCreate = plan.files.filter((f) => f.action === 'create');
        const toSkip = plan.files.filter((f) => f.action === 'skip');
        ui.section('Proposed changes:');
        if (toCreate.length > 0) {
            console.log('');
            console.log('  Files to create:');
            for (const f of toCreate) {
                ui.item(`  + ${f.relativePath}`);
            }
        }
        if (toSkip.length > 0) {
            console.log('');
            console.log('  Files to skip (already exist):');
            for (const f of toSkip) {
                ui.item(`  ~ ${f.relativePath}`);
            }
        }
        if (plan.forceIgnoreLines.length > 0) {
            console.log('');
            console.log(`  .forceignore: ${plan.forceIgnoreLines.length} lines to add`);
        }
        if (Object.keys(plan.packageJsonScripts).length > 0) {
            console.log('');
            console.log(`  package.json scripts to add: ${Object.keys(plan.packageJsonScripts).join(', ')}`);
        }
        console.log('');
        if (dryRun) {
            ui.warn('Dry run — no files were created or modified.');
            return;
        }
        // Confirm
        if (!options.yes) {
            const confirm = await (0, prompts_1.default)({
                type: 'confirm',
                name: 'go',
                message: `Apply ${toCreate.length} file(s)? This will not overwrite existing files.`,
                initial: true,
            });
            if (!confirm.go) {
                ui.info('Cancelled.');
                process.exit(0);
            }
        }
        // Apply
        const result = await (0, core_1.applySetup)(rootPath, plan);
        console.log('');
        if (result.filesCreated.length > 0) {
            ui.section('Created:');
            for (const f of result.filesCreated) {
                ui.success(f);
            }
        }
        if (result.filesModified.length > 0) {
            ui.section('Modified:');
            for (const f of result.filesModified) {
                ui.success(f);
            }
        }
        if (result.filesSkipped.length > 0) {
            ui.section('Skipped (already exist):');
            for (const f of result.filesSkipped) {
                ui.info(f);
            }
        }
        if (result.forceIgnoreUpdated) {
            ui.success('.forceignore updated');
        }
        if (result.packageJsonUpdated) {
            ui.success('package.json scripts updated');
        }
        if (result.backupPath) {
            ui.info(`Backup created: ${result.backupPath}`);
        }
        if (result.errors.length > 0) {
            for (const e of result.errors) {
                ui.error(e);
            }
        }
        console.log('');
        ui.success(`AI-Kit setup complete! Your project is now AI-ready.`);
        ui.info('Next steps:');
        ui.item('1. Open AGENTS.md and CLAUDE.md and update the project placeholder sections.');
        ui.item('2. Configure .cursor/mcp.json with your org alias (see docs/mcp-usage.md).');
        ui.item('3. Review docs/skills-ecosystem.md for AFV Library and Jag skill options.');
    });
}
//# sourceMappingURL=init.js.map