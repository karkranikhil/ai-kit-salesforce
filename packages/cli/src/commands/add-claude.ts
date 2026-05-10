import { Command } from 'commander';
import * as path from 'path';
import { planSetup, applySetup } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

const CLAUDE_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/commands/review-security.md',
  '.claude/commands/validate-deploy.md',
  '.claude/commands/write-tests.md',
  '.claude/commands/create-apex.md',
  '.claude/commands/create-lwc.md',
  '.claude/commands/prepare-pr.md',
  '.claude/agents/salesforce-architect.md',
  '.claude/agents/apex-developer.md',
  '.claude/agents/lwc-developer.md',
  '.claude/agents/qa-tester.md',
  '.claude/agents/security-reviewer.md',
];

export function addClaudeCommand(): Command {
  return new Command('add-claude')
    .description('Add CLAUDE.md, Claude commands, and Claude subagents')
    .option('--path <path>', 'Path to project root')
    .option('--dry-run', 'Preview changes without applying them')
    .action(async (options: { path?: string; dryRun?: boolean }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      const dryRun = options.dryRun ?? false;

      ui.header('Adding Claude Code setup...');

      const plan = await planSetup(rootPath, { preset: 'core', dryRun });
      const claudePlan = {
        ...plan,
        files: plan.files.filter((f) => CLAUDE_FILES.includes(f.relativePath)),
        packageJsonScripts: {},
        forceIgnoreLines: [],
      };

      const result = await applySetup(rootPath, claudePlan);

      for (const f of result.filesCreated) ui.success(f);
      for (const f of result.filesSkipped) ui.info(`skipped: ${f}`);
      for (const e of result.errors) ui.error(e);

      if (dryRun) {
        ui.warn('Dry run — no files were created.');
      } else {
        ui.success('Claude Code setup complete.');
      }
    });
}
