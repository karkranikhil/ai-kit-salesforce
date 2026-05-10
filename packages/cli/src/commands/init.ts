import { Command } from 'commander';
import * as path from 'path';
import prompts from 'prompts';
import {
  scanProject,
  planSetup,
  applySetup,
  generateReadinessReport,
  Preset,
} from '@sf-ai-toolkit/core';
import * as ui from '../ui';

const PRESETS: { title: string; value: Preset; description: string }[] = [
  { title: 'core', value: 'core', description: 'Standard Salesforce DX project' },
  { title: 'lwc', value: 'lwc', description: 'Adds extra LWC rules and skills' },
  { title: 'agentforce', value: 'agentforce', description: 'Adds Agentforce / AFV Library support' },
  { title: 'data-cloud', value: 'data-cloud', description: 'Adds Data Cloud docs and rules' },
  { title: 'experience-cloud', value: 'experience-cloud', description: 'Adds Experience Cloud rules' },
];

export function initCommand(): Command {
  return new Command('init')
    .description('Initialise AI setup for the current Salesforce DX project')
    .option('--path <path>', 'Path to project root (defaults to current directory)')
    .option('--preset <preset>', 'Setup preset: core, lwc, agentforce, data-cloud, experience-cloud')
    .option('--dry-run', 'Preview what would be created without making changes')
    .option('--yes', 'Skip confirmation prompts')
    .action(async (options: { path?: string; preset?: string; dryRun?: boolean; yes?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('');

      // Scan first
      ui.info('Scanning project...');
      let scanResult;
      try {
        scanResult = await scanProject(rootPath);
      } catch (err) {
        ui.error('Scan failed: ' + String(err));
        process.exit(1);
      }

      console.log(generateReadinessReport(scanResult));

      if (!scanResult.isSalesforceDx) {
        ui.warn('No sfdx-project.json found. AI-Kit works best with Salesforce DX projects.');
        ui.warn('Continuing anyway...');
      }

      // Select preset
      let preset: Preset = (options.preset as Preset) ?? 'core';
      if (!options.preset && !options.yes) {
        const response = await prompts({
          type: 'select',
          name: 'preset',
          message: 'Select a setup preset:',
          choices: PRESETS.map((p) => ({
            title: `${p.title} — ${p.description}`,
            value: p.value,
          })),
          initial: 0,
        });
        if (!response.preset) {
          ui.info('Cancelled.');
          process.exit(0);
        }
        preset = response.preset as Preset;
      }

      ui.info(`Using preset: ${preset}${dryRun ? ' (dry run)' : ''}`);

      // Plan
      const plan = await planSetup(rootPath, { preset, dryRun });

      const toCreate = plan.files.filter((f) => f.action === 'create');
      const toSkip = plan.files.filter((f) => f.action === 'skip');

      ui.section('Proposed changes:');
      if (toCreate.length > 0) {
        console.log('');
        console.log('  Files to create:');
        for (const f of toCreate) {
          ui.item(`  + ${f.relativePath}`);
        }
      }
      if (toSkip.length > 0) {
        console.log('');
        console.log('  Files to skip (already exist):');
        for (const f of toSkip) {
          ui.item(`  ~ ${f.relativePath}`);
        }
      }
      if (plan.forceIgnoreLines.length > 0) {
        console.log('');
        console.log(`  .forceignore: ${plan.forceIgnoreLines.length} lines to add`);
      }
      if (Object.keys(plan.packageJsonScripts).length > 0) {
        console.log('');
        console.log(`  package.json scripts to add: ${Object.keys(plan.packageJsonScripts).join(', ')}`);
      }
      console.log('');

      if (dryRun) {
        ui.warn('Dry run — no files were created or modified.');
        return;
      }

      // Confirm
      if (!options.yes) {
        const confirm = await prompts({
          type: 'confirm',
          name: 'go',
          message: `Apply ${toCreate.length} file(s)? This will not overwrite existing files.`,
          initial: true,
        });
        if (!confirm.go) {
          ui.info('Cancelled.');
          process.exit(0);
        }
      }

      // Apply
      const result = await applySetup(rootPath, plan);

      console.log('');
      if (result.filesCreated.length > 0) {
        ui.section('Created:');
        for (const f of result.filesCreated) {
          ui.success(f);
        }
      }
      if (result.filesModified.length > 0) {
        ui.section('Modified:');
        for (const f of result.filesModified) {
          ui.success(f);
        }
      }
      if (result.filesSkipped.length > 0) {
        ui.section('Skipped (already exist):');
        for (const f of result.filesSkipped) {
          ui.info(f);
        }
      }
      if (result.forceIgnoreUpdated) {
        ui.success('.forceignore updated');
      }
      if (result.packageJsonUpdated) {
        ui.success('package.json scripts updated');
      }
      if (result.backupPath) {
        ui.info(`Backup created: ${result.backupPath}`);
      }
      if (result.errors.length > 0) {
        for (const e of result.errors) {
          ui.error(e);
        }
      }

      console.log('');
      ui.success(`AI-Kit setup complete! Your project is now AI-ready.`);
      ui.info('Next steps:');
      ui.item('1. Open AGENTS.md and CLAUDE.md and update the project placeholder sections.');
      ui.item('2. Configure .cursor/mcp.json with your org alias (see docs/mcp-usage.md).');
      ui.item('3. Review docs/skills-ecosystem.md for AFV Library and Jag skill options.');
    });
}
