import { Command } from 'commander';
import * as path from 'path';
import { planSetup, applySetup } from '@ai-kit-salesforce/core';
import * as ui from '../ui';

const SKILL_FILES = [
  '.cursor/skills/salesforce-apex/SKILL.md',
  '.cursor/skills/salesforce-lwc/SKILL.md',
  '.cursor/skills/salesforce-flow/SKILL.md',
  '.cursor/skills/salesforce-security-review/SKILL.md',
  '.cursor/skills/salesforce-agentforce/SKILL.md',
  '.cursor/skills/salesforce-data-cloud/SKILL.md',
  'docs/jags-skills.md',
  'docs/skills-ecosystem.md',
];

export function addJagsSkillsCommand(): Command {
  return new Command('add-jags-skills')
    .description('Add local AI-Kit Salesforce skill templates (Cursor-compatible)')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    .action(async (options: { path?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding AI-Kit Salesforce skill templates...');
      console.log('');
      ui.info('These are AI-Kit local Salesforce skill templates — compatible with Cursor skills workflow.');
      ui.info('They are NOT official Jag files. See docs/jags-skills.md for Jag installation options.');
      console.log('');

      const plan = await planSetup(rootPath, { preset: 'core', dryRun });
      const skillsPlan = {
        ...plan,
        files: plan.files.filter((f) => SKILL_FILES.includes(f.relativePath)),
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
        ui.success('Skill templates created.');
        console.log('');
        ui.info('TODO: To install Jag\'s actual Salesforce skills in the future:');
        ui.item('  npx skills add Jaganpro/sf-skills');
        ui.info('Review the source before running.');
      }
    });
}
