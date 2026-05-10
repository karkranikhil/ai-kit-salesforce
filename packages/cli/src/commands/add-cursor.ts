import { Command } from 'commander';
import * as path from 'path';
import { planSetup, applySetup } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

const CURSOR_FILES = [
  '.cursor/rules/salesforce-mcp.mdc',
  '.cursor/rules/apex.mdc',
  '.cursor/rules/lwc.mdc',
  '.cursor/rules/deployment.mdc',
  '.cursor/rules/safety.mdc',
  '.cursor/skills/salesforce-apex/SKILL.md',
  '.cursor/skills/salesforce-lwc/SKILL.md',
  '.cursor/skills/salesforce-flow/SKILL.md',
  '.cursor/skills/salesforce-security-review/SKILL.md',
  '.cursor/skills/salesforce-agentforce/SKILL.md',
  '.cursor/skills/salesforce-data-cloud/SKILL.md',
];

export function addCursorCommand(): Command {
  return new Command('add-cursor')
    .description('Add Cursor rules and skill templates to the project')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    .action(async (options: { path?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding Cursor rules and skills...');

      const plan = await planSetup(rootPath, { preset: 'core', dryRun });
      const cursorPlan = {
        ...plan,
        files: plan.files.filter((f) => CURSOR_FILES.includes(f.relativePath)),
        packageJsonScripts: {},
        forceIgnoreLines: [],
      };

      const result = await applySetup(rootPath, cursorPlan);

      for (const f of result.filesCreated) ui.success(f);
      for (const f of result.filesSkipped) ui.info(`skipped: ${f}`);
      for (const e of result.errors) ui.error(e);

      if (dryRun) {
        ui.warn('Dry run — no files were created.');
      } else {
        ui.success('Cursor setup complete.');
      }
    });
}
