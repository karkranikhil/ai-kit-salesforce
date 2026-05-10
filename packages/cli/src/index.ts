#!/usr/bin/env node
import { program } from 'commander';
import { scanCommand } from './commands/scan';
import { initCommand } from './commands/init';
import { addCursorCommand } from './commands/add-cursor';
import { addClaudeCommand } from './commands/add-claude';
import { addMcpCommand } from './commands/add-mcp';
import { addJagsSkillsCommand } from './commands/add-jags-skills';
import { addAfvLibraryCommand } from './commands/add-afv-library';
import { doctorCommand } from './commands/doctor';
import { bootstrapMcpCommand } from './commands/bootstrap-mcp';
import { checkDriftCommand } from './commands/check-drift';
import { addClaudeMemCommand } from './commands/add-claude-mem';
import { pickSkillCommand } from './commands/pick-skill';
import { deployPreviewCommand } from './commands/deploy-preview';
import { agentforceScanCommand } from './commands/agentforce-scan';

program
  .name('ai-kit-sf')
  .description('AI-Kit for Salesforce — Make every Salesforce DX project AI-ready in minutes.')
  .version('0.1.0');

program.addCommand(scanCommand());
program.addCommand(initCommand());
program.addCommand(addCursorCommand());
program.addCommand(addClaudeCommand());
program.addCommand(addMcpCommand());
program.addCommand(addJagsSkillsCommand());
program.addCommand(addAfvLibraryCommand());
program.addCommand(doctorCommand());
program.addCommand(bootstrapMcpCommand());
program.addCommand(checkDriftCommand());
program.addCommand(addClaudeMemCommand());
program.addCommand(pickSkillCommand());
program.addCommand(deployPreviewCommand());
program.addCommand(agentforceScanCommand());

program.parse(process.argv);
