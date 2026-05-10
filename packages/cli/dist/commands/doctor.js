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
exports.doctorCommand = doctorCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@ai-kit-salesforce/core");
const ui = __importStar(require("../ui"));
function doctorCommand() {
    return new commander_1.Command('doctor')
        .description('Full health check — AI setup, org context, MCP config, and drift detection')
        .option('--path <path>', 'Path to project root')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('AI-Kit Doctor');
        console.log('');
        // ── Org context ───────────────────────────────────────────────────────
        const orgCtx = await (0, core_1.readOrgContext)(rootPath);
        if (orgCtx.source !== 'none') {
            ui.success(`Org context: ${orgCtx.defaultOrg}  (${orgCtx.source})`);
        }
        else {
            ui.warn('No org context detected (.sf/config.json, sfdx-project.json, .sfdx/)');
            ui.item('  Run: sf org list  to see available orgs');
            ui.item('  Run: ai-kit-sf bootstrap-mcp  to configure MCP with your org alias');
        }
        // ── AI setup scan ────────────────────────────────────────────────────
        console.log('');
        const result = await (0, core_1.scanProject)(rootPath);
        console.log((0, core_1.generateReadinessReport)(result));
        // ── MCP config validation ────────────────────────────────────────────
        const mcpPaths = [
            { label: '.cursor/mcp.json', p: path.join(rootPath, '.cursor', 'mcp.json') },
            { label: '.mcp.json', p: path.join(rootPath, '.mcp.json') },
        ];
        let anyMcpFound = false;
        for (const { label, p } of mcpPaths) {
            const validation = await (0, core_1.validateMcpConfig)(p);
            if (validation.issues[0] === 'Config file not found')
                continue;
            anyMcpFound = true;
            if (validation.valid) {
                ui.success(`${label}: valid`);
            }
            else {
                ui.section(`${label}: issues found`);
                for (const issue of validation.issues)
                    ui.warn(`  ${issue}`);
                for (const sug of validation.suggestions)
                    ui.item(`  → ${sug}`);
            }
        }
        if (!anyMcpFound) {
            ui.warn('No MCP config found.');
            ui.item('  Run: ai-kit-sf bootstrap-mcp  to create one');
        }
        // ── Drift detection ─────────────────────────────────────────────────
        console.log('');
        ui.bold('Drift check:');
        const drift = await (0, core_1.detectDrift)(rootPath);
        if (drift.drifted.length === 0 && drift.missing.length === 0) {
            ui.success(`All ${drift.upToDate.length} tracked template file(s) are current`);
        }
        else {
            if (drift.drifted.length > 0) {
                ui.warn(`${drift.drifted.length} file(s) have drifted from AI-Kit templates:`);
                for (const d of drift.drifted) {
                    ui.item(`  ${d.relativePath} — ${d.missingSignals.slice(0, 2).join(', ')}`);
                }
            }
            if (drift.missing.length > 0) {
                ui.warn(`${drift.missing.length} tracked template file(s) not found`);
            }
            ui.info('Run: ai-kit-sf check-drift  for full details');
        }
        // ── Summary ──────────────────────────────────────────────────────────
        const issues = result.missing.length + drift.drifted.length;
        console.log('');
        if (issues === 0 && orgCtx.source !== 'none' && anyMcpFound) {
            ui.success('Project is fully configured and healthy.');
        }
        else {
            if (result.missing.length > 0)
                ui.info('Fix setup: ai-kit-sf init --preset core');
            if (drift.drifted.length > 0)
                ui.info('Fix drift: ai-kit-sf check-drift');
            if (!anyMcpFound)
                ui.info('Bootstrap MCP: ai-kit-sf bootstrap-mcp');
        }
    });
}
//# sourceMappingURL=doctor.js.map