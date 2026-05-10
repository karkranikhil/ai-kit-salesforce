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
exports.agentforceScanCommand = agentforceScanCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const core_1 = require("@sf-ai-toolkit/core");
const ui = __importStar(require("../ui"));
function agentforceScanCommand() {
    return new commander_1.Command('agentforce-scan')
        .description('Scan the project for Agentforce metadata and show recommendations')
        .option('--path <path>', 'Path to project root (defaults to current directory)')
        .action(async (options) => {
        const rootPath = path.resolve(options.path ?? process.cwd());
        ui.header('Agentforce Scan');
        console.log('');
        ui.info('Scanning force-app/ for Agentforce metadata...');
        console.log('');
        let ctx;
        try {
            ctx = await (0, core_1.detectAgentforceContext)(rootPath);
        }
        catch (err) {
            ui.error(`Scan failed: ${String(err)}`);
            process.exit(1);
        }
        if (!ctx.hasAgentforceMetadata) {
            ui.info('No Agentforce metadata detected in force-app/');
            console.log('');
            return;
        }
        // Invocable Actions
        if (ctx.invocableActions.length > 0) {
            ui.section('Invocable Actions (@InvocableMethod):');
            for (const name of ctx.invocableActions) {
                ui.success(`  ${name}`);
            }
        }
        // Prompt Templates
        if (ctx.promptTemplates.length > 0) {
            ui.section('Prompt Templates (.prompt-meta.xml):');
            for (const name of ctx.promptTemplates) {
                ui.item(`  ${name}`);
            }
        }
        // Agent Topics
        if (ctx.agentTopics.length > 0) {
            ui.section('Agent Topics / Bots:');
            for (const name of ctx.agentTopics) {
                ui.item(`  ${name}`);
            }
        }
        // AFV Library status
        console.log('');
        if (ctx.afvLibraryInstalled) {
            ui.success('AFV Library skills: installed');
        }
        else {
            ui.warn('AFV Library skills: not installed');
        }
        // Recommendations
        if (ctx.recommendations.length > 0) {
            ui.section('Recommendations:');
            for (const rec of ctx.recommendations) {
                ui.warn(`  ${rec}`);
            }
        }
        console.log('');
    });
}
//# sourceMappingURL=agentforce-scan.js.map