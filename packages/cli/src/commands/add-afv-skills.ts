import { Command } from 'commander';
import * as path from 'path';
import { planSetup, applySetup } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

export function addAfvSkillsCommand(): Command {
  return new Command('add-afv-skills')
    .description('Add Salesforce AFV Library skill templates (40 skills: 11 architect-level + 29 AFV-compatible)')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    .action(async (options: { path?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding Salesforce skill templates...');
      console.log('');
      ui.info('These are SF AI Toolkit skill templates — 11 architect-level + 29 AFV-compatible, Cursor/Claude Code compatible.');
      ui.info('Source: forcedotcom/afv-library (bundled). Review docs/afv-library.md for more.');
      console.log('');

      const plan = await planSetup(rootPath, { preset: 'core', dryRun });
      const skillsPlan = {
        ...plan,
        files: plan.files.filter(
          (f) => f.relativePath.startsWith('.cursor/skills/') || f.relativePath === 'docs/afv-library.md' || f.relativePath === 'docs/skills-ecosystem.md'
        ),
        packageJsonScripts: {},
        forceIgnoreLines: [],
      };

      const result = await applySetup(rootPath, skillsPlan);

      for (const f of result.filesCreated) ui.success(f);
      for (const f of result.filesSkipped) ui.info(`skipped: ${f}`);
      for (const e of result.errors) ui.error(e);

      if (dryRun) {
        ui.warn('Dry run — no files were created.');
      } else {
        ui.success('Salesforce skill templates created (SF AI Toolkit + AFV-compatible set).');
        console.log('');
        ui.info('To install the full official AFV Library from Salesforce:');
        ui.item('  npx skills add forcedotcom/afv-library');
        ui.info('Review the source before running: https://github.com/forcedotcom/afv-library');
      }
    });
}
