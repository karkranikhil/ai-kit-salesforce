import { Command } from 'commander';
import * as path from 'path';
import prompts from 'prompts';
import { bootstrapMcp, validateMcpConfig, readOrgContext } from '@ai-kit-salesforce/core';
import * as ui from '../ui';

export function bootstrapMcpCommand(): Command {
  return new Command('bootstrap-mcp')
    .description('Write correctly-formatted .cursor/mcp.json and .mcp.json for Salesforce DX MCP')
    .option('--path <path>', 'Path to project root')
    .option('--org <alias>', 'Salesforce org alias to configure')
    .option('--dry-run', 'Preview the config without writing files')
    .action(async (options: { path?: string; org?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('MCP Bootstrap');
      console.log('');

      // Try to detect org from project
      const orgCtx = await readOrgContext(rootPath);
      let orgAlias = options.org;

      if (!orgAlias) {
        if (orgCtx.defaultOrg && orgCtx.source !== 'none') {
          ui.info(`Detected org from ${orgCtx.source}: ${orgCtx.defaultOrg}`);
        }

        const response = await prompts({
          type: 'text',
          name: 'org',
          message: 'Enter your Salesforce org alias:',
          initial: orgCtx.defaultOrg ?? '',
          validate: (v: string) => (v.trim().length > 0 ? true : 'Org alias is required'),
        });

        if (!response.org) {
          ui.info('Cancelled.');
          process.exit(0);
        }
        orgAlias = response.org as string;
      }

      if (dryRun) {
        const { buildMcpConfig } = await import('@ai-kit-salesforce/core');
        const config = buildMcpConfig({ orgAlias: orgAlias! });
        console.log('');
        ui.warn('Dry run — would write these files:');
        ui.item('.cursor/mcp.json');
        ui.item('.mcp.json');
        console.log('');
        console.log(JSON.stringify(config, null, 2));
        return;
      }

      const result = await bootstrapMcp(rootPath, { orgAlias: orgAlias! });

      console.log('');
      if (!result.alreadyExisted.cursor) {
        ui.success('.cursor/mcp.json created');
      } else {
        ui.info('.cursor/mcp.json already exists — skipped');
      }

      if (!result.alreadyExisted.claude) {
        ui.success('.mcp.json created');
      } else {
        ui.info('.mcp.json already exists — skipped');
      }

      // Validate what was written
      console.log('');
      ui.info('Validating config...');
      const validation = await validateMcpConfig(result.cursorConfigPath);
      if (validation.valid) {
        ui.success('Config is valid');
      } else {
        for (const issue of validation.issues) ui.warn(issue);
        for (const sug of validation.suggestions) ui.item('  → ' + sug);
      }

      console.log('');
      ui.info(`Org alias configured: ${orgAlias}`);
      ui.info('Restart Cursor/Claude Code to activate MCP.');
    });
}
