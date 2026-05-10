import { Command } from 'commander';
import * as path from 'path';
import { buildDeployPreview, ComponentInfo } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

export function deployPreviewCommand(): Command {
  return new Command('deploy-preview')
    .description('Preview what would be deployed to the target org, including risks')
    .option('--path <path>', 'Path to project root (defaults to current directory)')
    .option('--target-org <org>', 'Target org alias or username (overrides project default)')
    .option('--source-dir <dir>', 'Source directory to deploy from (default: force-app)')
    .option('--confirm-production', 'Required flag to proceed when target org is production')
    .action(async (options: {
      path?: string;
      targetOrg?: string;
      sourceDir?: string;
      confirmProduction?: boolean;
    }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());

      ui.header('Deploy Preview');
      console.log('');
      ui.info('Scanning source directory...');

      let result;
      try {
        result = await buildDeployPreview({
          rootPath,
          targetOrg: options.targetOrg,
          sourceDir: options.sourceDir,
        });
      } catch (err) {
        ui.error(`Failed to build deploy preview: ${String(err)}`);
        process.exit(1);
      }

      // Production safety gate
      if (result.isProduction && !options.confirmProduction) {
        console.log('');
        ui.error('━'.repeat(60));
        ui.error('  TARGET ORG APPEARS TO BE PRODUCTION');
        ui.error('━'.repeat(60));
        ui.error(`  Org: ${result.targetOrg}`);
        ui.error('  Deploying to production without validation is dangerous.');
        ui.error('  Re-run with --confirm-production to acknowledge this risk.');
        ui.error('━'.repeat(60));
        console.log('');
        process.exit(1);
      }

      // Org header
      console.log('');
      if (result.isProduction) {
        ui.warn(`Target Org: ${result.targetOrg}  ⚠  PRODUCTION`);
      } else {
        ui.info(`Target Org: ${result.targetOrg}`);
      }
      console.log('');

      // Component counts by type
      const allComponents = [
        ...result.componentsToAdd,
        ...result.componentsToModify,
        ...result.componentsToDelete,
      ];
      const byType = new Map<string, ComponentInfo[]>();
      for (const c of allComponents) {
        if (!byType.has(c.type)) byType.set(c.type, []);
        byType.get(c.type)!.push(c);
      }

      if (byType.size === 0) {
        ui.info('No components found in source directory.');
      } else {
        ui.section('Components by Type:');
        for (const [type, comps] of [...byType.entries()].sort()) {
          ui.item(`${type}: ${comps.length}`);
        }

        ui.section('Component Details:');
        if (result.componentsToAdd.length > 0) {
          console.log('');
          ui.bold('  To Add:');
          for (const c of result.componentsToAdd) {
            ui.item(`  + ${c.name}  (${c.type})  ${c.filePath}`);
          }
        }
        if (result.componentsToModify.length > 0) {
          console.log('');
          ui.bold('  To Modify:');
          for (const c of result.componentsToModify) {
            ui.item(`  ~ ${c.name}  (${c.type})  ${c.filePath}`);
          }
        }
        if (result.componentsToDelete.length > 0) {
          console.log('');
          ui.bold('  To Delete:');
          for (const c of result.componentsToDelete) {
            ui.item(`  - ${c.name}  (${c.type})  ${c.filePath}`);
          }
        }
      }

      // Risks
      if (result.risks.length > 0) {
        ui.section('Risks:');
        for (const risk of result.risks) {
          const isError =
            risk.toLowerCase().includes('production') ||
            risk.toLowerCase().includes('destructive');
          if (isError) {
            ui.error(`  ${risk}`);
          } else {
            ui.warn(`  ${risk}`);
          }
        }
      } else {
        console.log('');
        ui.success('No deployment risks detected.');
      }

      // Commands
      ui.section('Commands:');
      console.log('');
      ui.bold('  Validate:');
      ui.item(`  ${result.validationCommand}`);
      console.log('');
      ui.bold('  Deploy:');
      ui.item(`  ${result.deployCommand}`);
      console.log('');

      if (result.isProduction) {
        ui.warn('Remember: Always validate before deploying to production!');
        console.log('');
      }
    });
}
