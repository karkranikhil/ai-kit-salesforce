import { Command } from 'commander';
import * as path from 'path';
import { listInstalledSkills } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

export function pickSkillCommand(): Command {
  return new Command('pick-skill')
    .description('List installed Cursor skills and show the @mention reference for each')
    .option('--path <path>', 'Path to project root')
    .action(async (options: { path?: string }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());

      const skills = await listInstalledSkills(rootPath);

      if (skills.length === 0) {
        ui.warn('No Cursor skills found under .cursor/skills/');
        ui.info('Run: ai-kit-sf add-cursor to install AI-Kit skill templates.');
        return;
      }

      ui.header('Installed Cursor Skills');
      console.log('');
      ui.info('Use these @mentions in Cursor chat to invoke a skill:');
      console.log('');

      const maxName = Math.max(...skills.map((s) => s.name.length)) + 1;
      for (const skill of skills) {
        const ref = `@${skill.name}`.padEnd(maxName + 1);
        console.log(`  ${ref}  ${skill.description || '(no description)'}`);
      }

      console.log('');
      ui.info('Example: "@salesforce-apex review this trigger for bulkification issues"');
    });
}
