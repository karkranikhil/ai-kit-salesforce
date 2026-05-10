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
exports.addClaudeMemCommand = addClaudeMemCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
function addClaudeMemCommand() {
    return new commander_1.Command('add-claude-mem')
        .description('Generate salesforce-dx.json claude-mem mode for cross-session memory')
        .option('--path <path>', 'Path to project root (default: current directory)')
        .option('--output <dir>', 'Output directory for the mode file (default: docs/claude-mem/)')
        .option('--claude-mem-dir <dir>', 'Path to local claude-mem plugin/modes/ folder to write directly')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('Adding claude-mem Salesforce DX mode...');
        console.log('');
        ui.info('This generates salesforce-dx.json — a claude-mem mode file that captures');
        ui.info('Apex patterns, deployment decisions, org config, and security findings');
        ui.info('as persistent memory across coding sessions.');
        console.log('');
        const json = (0, core_1.generateClaudeMemModeJson)();
        // Write to project docs so it's committed alongside the project
        const docsOutputDir = options.output
            ? path.resolve(options.output)
            : path.join(rootPath, 'docs', 'claude-mem');
        await fs.ensureDir(docsOutputDir);
        const docsOutputPath = path.join(docsOutputDir, 'salesforce-dx.json');
        if (await fs.pathExists(docsOutputPath)) {
            ui.info(`Already exists — skipped: ${path.relative(rootPath, docsOutputPath)}`);
        }
        else {
            await fs.writeFile(docsOutputPath, json, 'utf8');
            ui.success(`Created: ${path.relative(rootPath, docsOutputPath)}`);
        }
        // Optionally write directly into a local claude-mem installation
        if (options.claudeMemDir) {
            const targetPath = path.join(options.claudeMemDir, 'salesforce-dx.json');
            await fs.ensureDir(options.claudeMemDir);
            await fs.writeFile(targetPath, json, 'utf8');
            ui.success(`Written to claude-mem modes: ${targetPath}`);
        }
        console.log('');
        ui.info('To activate this mode in claude-mem:');
        ui.item(`  1. Copy docs/claude-mem/salesforce-dx.json to your claude-mem plugin/modes/ folder.`);
        ui.item(`  2. Or use: ai-kit-sf add-claude-mem --claude-mem-dir ~/.claude-mem/plugin/modes/`);
        ui.item(`  3. Set mode in claude-mem settings: "salesforce-dx"`);
        ui.item(`  4. Restart Claude Code.`);
        console.log('');
        ui.info('claude-mem captures: apex-pattern, deployment-issue, permission-rule,');
        ui.info('org-config, mcp-operation, security-finding, lwc-decision, test-strategy,');
        ui.info('agentforce-pattern — persisted across sessions.');
    });
}
//# sourceMappingURL=add-claude-mem.js.map