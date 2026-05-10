#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const scan_1 = require("./commands/scan");
const init_1 = require("./commands/init");
const add_cursor_1 = require("./commands/add-cursor");
const add_claude_1 = require("./commands/add-claude");
const add_mcp_1 = require("./commands/add-mcp");
const add_afv_skills_1 = require("./commands/add-afv-skills");
const add_afv_library_1 = require("./commands/add-afv-library");
const add_hooks_1 = require("./commands/add-hooks");
const doctor_1 = require("./commands/doctor");
const bootstrap_mcp_1 = require("./commands/bootstrap-mcp");
const check_drift_1 = require("./commands/check-drift");
const add_claude_mem_1 = require("./commands/add-claude-mem");
const pick_skill_1 = require("./commands/pick-skill");
const deploy_preview_1 = require("./commands/deploy-preview");
const agentforce_scan_1 = require("./commands/agentforce-scan");
commander_1.program
    .name('sf-ai-toolkit')
    .description('AI-Kit for Salesforce — Make every Salesforce DX project AI-ready in minutes.')
    .version('0.1.0');
commander_1.program.addCommand((0, scan_1.scanCommand)());
commander_1.program.addCommand((0, init_1.initCommand)());
commander_1.program.addCommand((0, add_cursor_1.addCursorCommand)());
commander_1.program.addCommand((0, add_claude_1.addClaudeCommand)());
commander_1.program.addCommand((0, add_mcp_1.addMcpCommand)());
commander_1.program.addCommand((0, add_afv_skills_1.addAfvSkillsCommand)());
commander_1.program.addCommand((0, add_afv_library_1.addAfvLibraryCommand)());
commander_1.program.addCommand((0, add_hooks_1.addHooksCommand)());
commander_1.program.addCommand((0, doctor_1.doctorCommand)());
commander_1.program.addCommand((0, bootstrap_mcp_1.bootstrapMcpCommand)());
commander_1.program.addCommand((0, check_drift_1.checkDriftCommand)());
commander_1.program.addCommand((0, add_claude_mem_1.addClaudeMemCommand)());
commander_1.program.addCommand((0, pick_skill_1.pickSkillCommand)());
commander_1.program.addCommand((0, deploy_preview_1.deployPreviewCommand)());
commander_1.program.addCommand((0, agentforce_scan_1.agentforceScanCommand)());
commander_1.program.parse(process.argv);
//# sourceMappingURL=index.js.map