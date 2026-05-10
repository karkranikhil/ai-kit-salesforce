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
exports.bootstrapMcpCommand = bootstrapMcpCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const prompts_1 = __importDefault(require("prompts"));
const core_1 = require("@sf-ai-toolkit/core");
const ui = __importStar(require("../ui"));
function bootstrapMcpCommand() {
    return new commander_1.Command('bootstrap-mcp')
        .description('Write correctly-formatted .cursor/mcp.json and .mcp.json for Salesforce DX MCP')
        .option('--path <path>', 'Path to project root')
        .option('--org <alias>', 'Salesforce org alias to configure')
        .option('--dry-run', 'Preview the config without writing files')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        const dryRun = options.dryRun ?? false;
        ui.header('MCP Bootstrap');
        console.log('');
        // Try to detect org from project
        const orgCtx = await (0, core_1.readOrgContext)(rootPath);
        let orgAlias = options.org;
        if (!orgAlias) {
            if (orgCtx.defaultOrg && orgCtx.source !== 'none') {
                ui.info(`Detected org from ${orgCtx.source}: ${orgCtx.defaultOrg}`);
            }
            const response = await (0, prompts_1.default)({
                type: 'text',
                name: 'org',
                message: 'Enter your Salesforce org alias:',
                initial: orgCtx.defaultOrg ?? '',
                validate: (v) => (v.trim().length > 0 ? true : 'Org alias is required'),
            });
            if (!response.org) {
                ui.info('Cancelled.');
                process.exit(0);
            }
            orgAlias = response.org;
        }
        if (dryRun) {
            const { buildMcpConfig } = await Promise.resolve().then(() => __importStar(require('@sf-ai-toolkit/core')));
            const config = buildMcpConfig({ orgAlias: orgAlias });
            console.log('');
            ui.warn('Dry run — would write these files:');
            ui.item('.cursor/mcp.json');
            ui.item('.mcp.json');
            console.log('');
            console.log(JSON.stringify(config, null, 2));
            return;
        }
        const result = await (0, core_1.bootstrapMcp)(rootPath, { orgAlias: orgAlias });
        console.log('');
        if (!result.alreadyExisted.cursor) {
            ui.success('.cursor/mcp.json created');
        }
        else {
            ui.info('.cursor/mcp.json already exists — skipped');
        }
        if (!result.alreadyExisted.claude) {
            ui.success('.mcp.json created');
        }
        else {
            ui.info('.mcp.json already exists — skipped');
        }
        // Validate what was written
        console.log('');
        ui.info('Validating config...');
        const validation = await (0, core_1.validateMcpConfig)(result.cursorConfigPath);
        if (validation.valid) {
            ui.success('Config is valid');
        }
        else {
            for (const issue of validation.issues)
                ui.warn(issue);
            for (const sug of validation.suggestions)
                ui.item('  → ' + sug);
        }
        console.log('');
        ui.info(`Org alias configured: ${orgAlias}`);
        ui.info('Restart Cursor/Claude Code to activate MCP.');
    });
}
//# sourceMappingURL=bootstrap-mcp.js.map