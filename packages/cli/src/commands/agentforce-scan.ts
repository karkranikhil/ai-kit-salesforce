import { Command } from 'commander';
import * as path from 'path';
import { detectAgentforceContext } from '@ai-kit-salesforce/core';
import * as ui from '../ui';

export function agentforceScanCommand(): Command {
  return new Command('agentforce-scan')
    .description('Scan the project for Agentforce metadata and show recommendations')
    .option('--path <path>', 'Path to project root (defaults to current directory)')
    .action(async (options: { path?: string }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());

      ui.header('Agentforce Scan');
      console.log('');
      ui.info('Scanning force-app/ for Agentforce metadata...');
      console.log('');

      let ctx;
      try {
        ctx = await detectAgentforceContext(rootPath);
      } catch (err) {
        ui.error(`Scan failed: ${String(err)}`);
        process.exit(1);
      }

      if (!ctx.hasAgentforceMetadata) {
        ui.info('No Agentforce metadata detected in force-app/');
        console.log('');
        return;
      }

      // Invocable Actions
      if (ctx.invocableActions.length > 0) {
        ui.section('Invocable Actions (@InvocableMethod):');
        for (const name of ctx.invocableActions) {
          ui.success(`  ${name}`);
        }
      }

      // Prompt Templates
      if (ctx.promptTemplates.length > 0) {
        ui.section('Prompt Templates (.prompt-meta.xml):');
        for (const name of ctx.promptTemplates) {
          ui.item(`  ${name}`);
        }
      }

      // Agent Topics
      if (ctx.agentTopics.length > 0) {
        ui.section('Agent Topics / Bots:');
        for (const name of ctx.agentTopics) {
          ui.item(`  ${name}`);
        }
      }

      // AFV Library status
      console.log('');
      if (ctx.afvLibraryInstalled) {
        ui.success('AFV Library skills: installed');
      } else {
        ui.warn('AFV Library skills: not installed');
      }

      // Recommendations
      if (ctx.recommendations.length > 0) {
        ui.section('Recommendations:');
        for (const rec of ctx.recommendations) {
          ui.warn(`  ${rec}`);
        }
      }

      console.log('');
    });
}
