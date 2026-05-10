import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  scanProject,
  generateReadinessReport,
  readOrgContext,
  detectDrift,
  validateMcpConfig,
  loadToolkitConfig,
  TOOLKIT_CONFIG_PATH,
} from '@sf-ai-toolkit/core';
import * as ui from '../ui';

export function doctorCommand(): Command {
  return new Command('doctor')
    .description('Full health check — AI setup, org context, MCP config, and drift detection')
    .option('--path <path>', 'Path to project root')
    .action(async (options: { path?: string }) => {
      const rootPath = path.resolve(options.path ?? process.cwd());

      ui.header('AI-Kit Doctor');
      console.log('');

      // ── Org context ───────────────────────────────────────────────────────
      const orgCtx = await readOrgContext(rootPath);
      if (orgCtx.source !== 'none') {
        ui.success(`Org context: ${orgCtx.defaultOrg}  (${orgCtx.source})`);
      } else {
        ui.warn('No org context detected (.sf/config.json, sfdx-project.json, .sfdx/)');
        ui.item('  Run: sf org list  to see available orgs');
        ui.item('  Run: sf-ai-toolkit bootstrap-mcp  to configure MCP with your org alias');
      }

      // ── AI setup scan ────────────────────────────────────────────────────
      console.log('');
      const result = await scanProject(rootPath);
      console.log(generateReadinessReport(result));

      // ── Policy source ────────────────────────────────────────────────────
      const configPath = path.join(rootPath, TOOLKIT_CONFIG_PATH);
      const hasProjectConfig = await fs.pathExists(configPath);
      const cfg = await loadToolkitConfig(rootPath);
      ui.bold('Policy source:');
      ui.info(
        hasProjectConfig
          ? `Using project config: ${TOOLKIT_CONFIG_PATH}`
          : `Using built-in defaults (no ${TOOLKIT_CONFIG_PATH} found)`
      );
      ui.item(`  PMD hook: ${cfg.quality?.pmd?.enabled ? 'enabled' : 'disabled'}`);
      ui.item(`  Commit message policy: ${cfg.git?.commitMessage?.enabled ? 'enabled' : 'disabled'}`);

      // ── MCP config validation ────────────────────────────────────────────
      const mcpPaths = [
        { label: '.cursor/mcp.json', p: path.join(rootPath, '.cursor', 'mcp.json') },
        { label: '.mcp.json', p: path.join(rootPath, '.mcp.json') },
      ];

      let anyMcpFound = false;
      for (const { label, p } of mcpPaths) {
        const validation = await validateMcpConfig(p);
        if (validation.issues[0] === 'Config file not found') continue;
        anyMcpFound = true;
        if (validation.valid) {
          ui.success(`${label}: valid`);
        } else {
          ui.section(`${label}: issues found`);
          for (const issue of validation.issues) ui.warn(`  ${issue}`);
          for (const sug of validation.suggestions) ui.item(`  → ${sug}`);
        }
      }
      if (!anyMcpFound) {
        ui.warn('No MCP config found.');
        ui.item('  Run: sf-ai-toolkit bootstrap-mcp  to create one');
      }

      // ── Drift detection ─────────────────────────────────────────────────
      console.log('');
      ui.bold('Drift check:');
      const drift = await detectDrift(rootPath);
      if (drift.drifted.length === 0 && drift.missing.length === 0) {
        ui.success(`All ${drift.upToDate.length} tracked template file(s) are current`);
      } else {
        if (drift.drifted.length > 0) {
          ui.warn(`${drift.drifted.length} file(s) have drifted from AI-Kit templates:`);
          for (const d of drift.drifted) {
            ui.item(`  ${d.relativePath} — ${d.missingSignals.slice(0, 2).join(', ')}`);
          }
        }
        if (drift.missing.length > 0) {
          ui.warn(`${drift.missing.length} tracked template file(s) not found`);
        }
        ui.info('Run: sf-ai-toolkit check-drift  for full details');
      }

      // ── Summary ──────────────────────────────────────────────────────────
      const issues = result.missing.length + drift.drifted.length;
      console.log('');
      if (issues === 0 && orgCtx.source !== 'none' && anyMcpFound) {
        ui.success('Project is fully configured and healthy.');
      } else {
        if (result.missing.length > 0) ui.info('Fix setup: sf-ai-toolkit init --preset core');
        if (drift.drifted.length > 0) ui.info('Fix drift: sf-ai-toolkit check-drift');
        if (!anyMcpFound) ui.info('Bootstrap MCP: sf-ai-toolkit bootstrap-mcp');
      }
    });
}
