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
exports.addHooksCommand = addHooksCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const core_1 = require("@sf-ai-toolkit/core");
const ui = __importStar(require("../ui"));
const HOOK_FILES = new Set([
    'sf-ai-toolkit.config.json',
    '.githooks/pre-commit',
    '.githooks/commit-msg',
]);
function addHooksCommand() {
    return new commander_1.Command('add-hooks')
        .description('Add configurable Git hooks (PMD pre-commit + commit message policy)')
        .option('--path <path>', 'Path to project root')
        .option('--dry-run', 'Preview changes without applying them')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('Adding configurable Git hooks...');
        ui.info('Generates .githooks/pre-commit and .githooks/commit-msg.');
        ui.info(`Policy is controlled via ${core_1.TOOLKIT_CONFIG_PATH}.`);
        const files = await Promise.all([...HOOK_FILES].map(async (relativePath) => {
            const fullPath = path.join(rootPath, relativePath);
            const fileExists = await fs.pathExists(fullPath);
            return {
                relativePath,
                action: (fileExists ? 'skip' : 'create'),
                reason: fileExists
                    ? 'File already exists — will not overwrite'
                    : 'Will be created from template',
                templateKey: relativePath,
            };
        }));
        const hooksPlan = {
            rootPath,
            preset: 'core',
            dryRun,
            files,
            packageJsonScripts: {},
            forceIgnoreLines: [],
        };
        const result = await (0, core_1.applySetup)(rootPath, hooksPlan);
        if (!dryRun) {
            // Ensure hook files are executable.
            for (const hookPath of ['.githooks/pre-commit', '.githooks/commit-msg']) {
                const fullPath = path.join(rootPath, hookPath);
                if (await fs.pathExists(fullPath)) {
                    await fs.chmod(fullPath, 0o755);
                }
            }
        }
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
            ui.success('Hook files added.');
            ui.info('One-time setup required:');
            ui.item('  git config core.hooksPath .githooks');
            ui.info('Then customize sf-ai-toolkit.config.json for your team standards.');
        }
    });
}
//# sourceMappingURL=add-hooks.js.map