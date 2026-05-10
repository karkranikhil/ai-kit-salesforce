import { Command } from 'commander';
import * as path from 'path';
import { scanProject, generateReadinessReport, readOrgContext } from '@ai-kit-salesforce/core';
import * as ui from '../ui';

export function scanCommand(): Command {
  return new Command('scan')
    .description('Scan the current Salesforce DX project and show AI readiness score')
    .option('--path <path>', 'Path to project root (defaults to current directory)')
    .action(async (options: { path?: string }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());
      try {
        const [result, orgCtx] = await Promise.all([
          scanProject(rootPath),
          readOrgContext(rootPath),
        ]);

        if (orgCtx.source !== 'none') {
          console.log('');
          ui.info(`Working against org: ${orgCtx.defaultOrg}  (from ${orgCtx.source})`);
        }

        const report = generateReadinessReport(result);
        console.log(report);
      } catch (err) {
        console.error('Scan failed:', String(err));
        process.exit(1);
      }
    });
}
