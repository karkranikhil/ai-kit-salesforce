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
exports.addAfvLibraryCommand = addAfvLibraryCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
const AFV_FILES = ['docs/afv-library.md', 'docs/skills-ecosystem.md'];
function addAfvLibraryCommand() {
    return new commander_1.Command('add-afv-library')
        .description('Add Salesforce AFV Library documentation and optional setup guide')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        // --install flag placeholder: not executed in MVP
        .option('--install', '[Future] Run npx skills add forcedotcom/afv-library (NOT active in MVP)')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding Salesforce AFV Library support...');
        console.log('');
        ui.info('Salesforce AFV Library is Salesforce\'s curated collection of agent skills.');
        ui.info('Repository: https://github.com/forcedotcom/afv-library');
        console.log('');
        if (options.install) {
            console.log('');
            ui.warn('--install flag detected.');
            ui.warn('MVP: Auto-install is NOT active. Review the source before running:');
            ui.item('  npx skills add forcedotcom/afv-library');
            ui.warn('AI-Kit does not automatically install external skills.');
            console.log('');
        }
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun });
        const afvPlan = {
            ...plan,
            files: plan.files.filter((f) => AFV_FILES.includes(f.relativePath)),
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, afvPlan);
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
            ui.success('AFV Library docs created.');
            console.log('');
            ui.info('To install Salesforce AFV Library (review source first):');
            ui.item('  npx skills add forcedotcom/afv-library');
            ui.info('See docs/afv-library.md for details and security guidance.');
        }
    });
}
//# sourceMappingURL=add-afv-library.js.map