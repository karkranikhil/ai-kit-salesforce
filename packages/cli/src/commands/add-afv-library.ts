import { Command } from 'commander';
import * as path from 'path';
import { planSetup, applySetup } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

const AFV_FILES = ['docs/afv-library.md', 'docs/skills-ecosystem.md'];

export function addAfvLibraryCommand(): Command {
  return new Command('add-afv-library')
    .description('Add Salesforce AFV Library documentation and optional setup guide')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    // --install flag placeholder: not executed in MVP
    .option('--install', '[Future] Run npx skills add forcedotcom/afv-library (NOT active in MVP)')
    .action(async (options: { path?: string; dryRun?: boolean; install?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding Salesforce AFV Library support...');
      console.log('');
      ui.info('Salesforce AFV Library is Salesforce\'s curated collection of agent skills.');
      ui.info('Repository: https://github.com/forcedotcom/afv-library');
      console.log('');

      if (options.install) {
        console.log('');
        ui.warn('--install flag detected.');
        ui.warn('MVP: Auto-install is NOT active. Review the source before running:');
        ui.item('  npx skills add forcedotcom/afv-library');
        ui.warn('AI-Kit does not automatically install external skills.');
        console.log('');
      }

      const plan = await planSetup(rootPath, { preset: 'core', dryRun });
      const afvPlan = {
        ...plan,
        files: plan.files.filter((f) => AFV_FILES.includes(f.relativePath)),
        packageJsonScripts: {},
        forceIgnoreLines: [],
      };

      const result = await applySetup(rootPath, afvPlan);

      for (const f of result.filesCreated) ui.success(f);
      for (const f of result.filesSkipped) ui.info(`skipped: ${f}`);
      for (const e of result.errors) ui.error(e);

      if (dryRun) {
        ui.warn('Dry run — no files were created.');
      } else {
        ui.success('AFV Library docs created.');
        console.log('');
        ui.info('To install Salesforce AFV Library (review source first):');
        ui.item('  npx skills add forcedotcom/afv-library');
        ui.info('See docs/afv-library.md for details and security guidance.');
      }
    });
}
