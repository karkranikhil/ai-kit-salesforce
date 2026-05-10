import { Command } from 'commander';
import * as path from 'path';
import { detectDrift, checkTeamSync, fetchTeamConfig, TeamConfig } from '@sf-ai-toolkit/core';
import * as ui from '../ui';

export function checkDriftCommand(): Command {
  return new Command('check-drift')
    .description('Check if local AI setup has drifted from current AI-Kit templates or a team config')
    .option('--path <path>', 'Path to project root')
    .option('--team-config <url>', 'URL to a team config JSON file for team sync check')
    .option('--team-config-file <file>', 'Local path to a team config JSON file')
    .action(async (options: {
      path?: string;
      teamConfig?: string;
      teamConfigFile?: string;
    }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());

      ui.header('Drift Detection');
      console.log('');

      // ── Team sync mode ────────────────────────────────────────────────────
      if (options.teamConfig || options.teamConfigFile) {
        let teamCfg: TeamConfig | null = null;

        if (options.teamConfigFile) {
          try {
            const fs = await import('fs-extra');
            teamCfg = await fs.readJson(options.teamConfigFile) as TeamConfig;
          } catch {
            ui.error(`Could not read team config file: ${options.teamConfigFile}`);
            process.exit(1);
          }
        } else if (options.teamConfig) {
          ui.info(`Fetching team config from: ${options.teamConfig}`);
          teamCfg = await fetchTeamConfig(options.teamConfig);
          if (!teamCfg) {
            ui.error('Could not fetch team config. Check the URL and your network connection.');
            process.exit(1);
          }
        }

        const syncResult = await checkTeamSync(rootPath, teamCfg!);

        console.log('');
        ui.bold(`Team Config v${syncResult.configVersion}`);
        if (teamCfg?.description) ui.info(teamCfg.description);
        console.log('');

        if (syncResult.drifted.length === 0 && syncResult.missing.length === 0) {
          ui.success(syncResult.summary);
        } else {
          ui.warn(syncResult.summary);
          printDriftResults(syncResult.drifted, syncResult.missing, syncResult.upToDate);
        }
        return;
      }

      // ── Local template drift check ────────────────────────────────────────
      ui.info('Comparing project files against current AI-Kit templates...');
      const result = await detectDrift(rootPath);
      console.log('');

      if (result.drifted.length === 0 && result.missing.length === 0) {
        ui.success(`All ${result.upToDate.length} tracked file(s) are up to date.`);
        return;
      }

      printDriftResults(result.drifted, result.missing, result.upToDate);

      console.log('');
      ui.info('To refresh drifted files:');
      ui.item('  1. Back up your customisations first.');
      ui.item('  2. Delete the drifted file(s).');
      ui.item('  3. Run: sf-ai-toolkit init --preset core --yes');
      ui.item('  4. Re-apply your customisations.');
    });
}

function printDriftResults(
  drifted: { relativePath: string; reason: string; missingSignals: string[] }[],
  missing: string[],
  upToDate: string[]
): void {
  if (drifted.length > 0) {
    ui.section('Drifted files:');
    for (const d of drifted) {
      ui.warn(`  ${d.relativePath}`);
      ui.item(`    ${d.reason}`);
      for (const s of d.missingSignals) {
        ui.item(`    Missing: "${s}"`);
      }
    }
  }

  if (missing.length > 0) {
    ui.section('Missing files:');
    for (const m of missing) {
      ui.error(`  ${m}`);
    }
  }

  if (upToDate.length > 0) {
    ui.section('Up to date:');
    for (const f of upToDate) {
      ui.success(`  ${f}`);
    }
  }
}
