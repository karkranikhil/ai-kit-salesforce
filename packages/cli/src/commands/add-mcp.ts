import { Command } from 'commander';
import * as path from 'path';
import { planSetup, applySetup } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

const MCP_FILES = ['docs/mcp-usage.md', '.cursor/rules/salesforce-mcp.mdc'];

export function addMcpCommand(): Command {
  return new Command('add-mcp')
    .description('Add Salesforce DX MCP usage guide and MCP Cursor rule')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    .action(async (options: { path?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding MCP setup...');

      const plan = await planSetup(rootPath, { preset: 'core', dryRun });
      const mcpPlan = {
        ...plan,
        files: plan.files.filter((f) => MCP_FILES.includes(f.relativePath)),
        packageJsonScripts: {},
        forceIgnoreLines: [],
      };

      const result = await applySetup(rootPath, mcpPlan);

      for (const f of result.filesCreated) ui.success(f);
      for (const f of result.filesSkipped) ui.info(`skipped: ${f}`);
      for (const e of result.errors) ui.error(e);

      if (dryRun) {
        ui.warn('Dry run — no files were created.');
      } else {
        ui.success('MCP setup complete.');
        ui.info('Next: Copy the example config from docs/mcp-usage.md to .cursor/mcp.json');
        ui.info('Update DEFAULT_TARGET_ORG with your org alias.');
      }
    });
}
