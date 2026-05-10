import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { generateClaudeMemModeJson } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

export function addClaudeMemCommand(): Command {
  return new Command('add-claude-mem')
    .description('Generate salesforce-dx.json claude-mem mode for cross-session memory')
    .option('--path <path>', 'Path to project root (default: current directory)')
    .option(
      '--output <dir>',
      'Output directory for the mode file (default: docs/claude-mem/)'
    )
    .option('--claude-mem-dir <dir>', 'Path to local claude-mem plugin/modes/ folder to write directly')
    .action(async (options: { path?: string; output?: string; claudeMemDir?: string }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());

      ui.header('Adding claude-mem Salesforce DX mode...');
      console.log('');
      ui.info('This generates salesforce-dx.json — a claude-mem mode file that captures');
      ui.info('Apex patterns, deployment decisions, org config, and security findings');
      ui.info('as persistent memory across coding sessions.');
      console.log('');

      const json = generateClaudeMemModeJson();

      // Write to project docs so it's committed alongside the project
      const docsOutputDir = options.output
        ? path.resolve(options.output)
        : path.join(rootPath, 'docs', 'claude-mem');

      await fs.ensureDir(docsOutputDir);
      const docsOutputPath = path.join(docsOutputDir, 'salesforce-dx.json');

      if (await fs.pathExists(docsOutputPath)) {
        ui.info(`Already exists — skipped: ${path.relative(rootPath, docsOutputPath)}`);
      } else {
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
