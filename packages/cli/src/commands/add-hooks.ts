import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { applySetup, TOOLKIT_CONFIG_PATH } from '@sf-ai-toolkit/core';
import type { SetupPlan } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

const HOOK_FILES = new Set([
  'sf-ai-toolkit.config.json',
  '.githooks/pre-commit',
  '.githooks/commit-msg',
]);

export function addHooksCommand(): Command {
  return new Command('add-hooks')
    .description('Add configurable Git hooks (PMD pre-commit + commit message policy)')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    .action(async (options: { path?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding configurable Git hooks...');
      ui.info('Generates .githooks/pre-commit and .githooks/commit-msg.');
      ui.info(`Policy is controlled via ${TOOLKIT_CONFIG_PATH}.`);

      const files = await Promise.all(
        [...HOOK_FILES].map(async (relativePath) => {
          const fullPath = path.join(rootPath, relativePath);
          const fileExists = await fs.pathExists(fullPath);
          return {
            relativePath,
            action: (fileExists ? 'skip' : 'create') as 'skip' | 'create',
            reason: fileExists
              ? 'File already exists — will not overwrite'
              : 'Will be created from template',
            templateKey: relativePath,
          };
        })
      );

      const hooksPlan: SetupPlan = {
        rootPath,
        preset: 'core',
        dryRun,
        files,
        packageJsonScripts: {},
        forceIgnoreLines: [],
      };

      const result = await applySetup(rootPath, hooksPlan);

      if (!dryRun) {
        // Ensure hook files are executable.
        for (const hookPath of ['.githooks/pre-commit', '.githooks/commit-msg']) {
          const fullPath = path.join(rootPath, hookPath);
          if (await fs.pathExists(fullPath)) {
            await fs.chmod(fullPath, 0o755);
          }
        }
      }

      for (const f of result.filesCreated) ui.success(f);
      for (const f of result.filesSkipped) ui.info(`skipped: ${f}`);
      for (const e of result.errors) ui.error(e);

      if (dryRun) {
        ui.warn('Dry run — no files were created.');
      } else {
        ui.success('Hook files added.');
        ui.info('One-time setup required:');
        ui.item('  git config core.hooksPath .githooks');
        ui.info('Then customize sf-ai-toolkit.config.json for your team standards.');
      }
    });
}

