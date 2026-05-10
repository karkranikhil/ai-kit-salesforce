import * as vscode from 'vscode';
import * as path from 'path';
import {
  scanProject,
  planSetup,
  applySetup,
  generateReadinessReport,
  readOrgContext,
  detectDrift,
  bootstrapMcp,
  validateMcpConfig,
  listInstalledSkills,
  generateClaudeMemModeJson,
  checkTeamSync,
  Preset,
} from '@sf-ai-toolkit/core';
import type { SetupPlan } from '@sf-ai-toolkit/core';
import * as fs from 'fs-extra';

import { DiagnosticsProvider } from './providers/diagnostics-provider';
import { registerHoverProvider } from './providers/hover-provider';
import { TeamSyncProvider } from './providers/team-sync-provider';
import { StatusBarProvider } from './providers/status-bar-provider';

// ─── State ───────────────────────────────────────────────────────────────────

let statusBarProvider: StatusBarProvider;
let diagnosticsProvider: DiagnosticsProvider;

// ─── Activate ────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  // Status bar — managed by StatusBarProvider
  statusBarProvider = StatusBarProvider.create(context);

  // Inline diagnostics — managed by DiagnosticsProvider
  diagnosticsProvider = DiagnosticsProvider.create(context);

  // Hover provider — shows rule explanations on hover
  // We need access to the internal collection; create a shared one
  const sharedDiagCollection = vscode.languages.createDiagnosticCollection('sf-ai-toolkit-hover');
  context.subscriptions.push(sharedDiagCollection);
  registerHoverProvider(context, sharedDiagCollection);

  // Team sync — auto-checks on startup
  const teamSyncProvider = TeamSyncProvider.create(context);
  const rootPath = getRootPath();
  if (rootPath) {
    // Run in background — don't await
    void teamSyncProvider.checkOnStartup(rootPath);
  }

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-kit-sf.scan', () => cmdScan()),
    vscode.commands.registerCommand('ai-kit-sf.init', () => cmdInit()),
    vscode.commands.registerCommand('ai-kit-sf.openReport', () => cmdScan()),
    vscode.commands.registerCommand('ai-kit-sf.addCursor', () => cmdAddFiles('cursor')),
    vscode.commands.registerCommand('ai-kit-sf.addCursorSkills', () => cmdAddFiles('cursor-skills')),
    vscode.commands.registerCommand('ai-kit-sf.addClaude', () => cmdAddFiles('claude')),
    vscode.commands.registerCommand('ai-kit-sf.addMcp', () => cmdAddFiles('mcp')),
    vscode.commands.registerCommand('ai-kit-sf.addHooks', () => cmdAddHooks()),
    vscode.commands.registerCommand('ai-kit-sf.addAfvSkills', () => cmdAddFiles('afv-skills')),
    vscode.commands.registerCommand('ai-kit-sf.addAfvLibrary', () => cmdAddFiles('afv-library')),
    vscode.commands.registerCommand('ai-kit-sf.bootstrapMcp', () => cmdBootstrapMcp()),
    vscode.commands.registerCommand('ai-kit-sf.checkDrift', () => cmdCheckDrift()),
    vscode.commands.registerCommand('ai-kit-sf.addClaudeMem', () => cmdAddClaudeMem()),
    vscode.commands.registerCommand('ai-kit-sf.pickSkill', () => cmdPickSkill()),
    vscode.commands.registerCommand('ai-kit-sf.checkTeamSync', () => cmdCheckTeamSync()),
  );

  // File watcher — refresh status bar when AI setup files change
  const watcher = vscode.workspace.createFileSystemWatcher(
    '**/{CLAUDE.md,AGENTS.md,.cursor/rules/**,.claude/**,tasks/**}'
  );
  watcher.onDidCreate(() => statusBarProvider.scheduleRefresh());
  watcher.onDidDelete(() => statusBarProvider.scheduleRefresh());
  watcher.onDidChange(() => statusBarProvider.scheduleRefresh());
  context.subscriptions.push(watcher);

  // Initial status bar scan
  statusBarProvider.scheduleRefresh(500);
}

export function deactivate(): void {
  diagnosticsProvider?.dispose();
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function getRootPath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return folders[0].uri.fsPath;
}

function requireTrustedWorkspace(): boolean {
  if (vscode.workspace.isTrusted) return true;
  void vscode.window.showWarningMessage(
    'AI-Kit: This command requires a trusted workspace.'
  );
  return false;
}

function isAllowedTeamConfigUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items: string[]): string {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

async function cmdScan(): Promise<void> {
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Scanning project...' },
    async () => {
      const [result, orgCtx, drift] = await Promise.all([
        scanProject(rootPath),
        readOrgContext(rootPath),
        detectDrift(rootPath),
      ]);
      const report = generateReadinessReport(result);

      const panel = vscode.window.createWebviewPanel(
        'ai-kit-report',
        'AI-Kit Readiness Report',
        vscode.ViewColumn.One,
        { enableScripts: false }
      );

      panel.webview.html = buildReportHtml(result, report, orgCtx, drift);

      // Refresh status bar
      statusBarProvider.scheduleRefresh(100);
    }
  );
}

async function cmdInit(): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  // Show org context in the preset picker header
  const orgCtx = await readOrgContext(rootPath);
  const orgInfo = orgCtx.source !== 'none' ? ` (org: ${orgCtx.defaultOrg})` : '';

  const presetItems = [
    { label: 'core', description: `Standard Salesforce DX project${orgInfo}`, value: 'core' as Preset },
    { label: 'lwc', description: 'Adds extra LWC rules and skills', value: 'lwc' as Preset },
    { label: 'agentforce', description: 'Adds Agentforce / AFV Library support', value: 'agentforce' as Preset },
    { label: 'data-cloud', description: 'Adds Data Cloud docs and rules', value: 'data-cloud' as Preset },
    { label: 'experience-cloud', description: 'Adds Experience Cloud rules', value: 'experience-cloud' as Preset },
  ];

  const selected = await vscode.window.showQuickPick(presetItems, {
    placeHolder: 'Select a setup preset',
  });
  if (!selected) return;

  const preset = (selected as unknown as { value: Preset }).value;
  const plan = await planSetup(rootPath, { preset, dryRun: false });
  const toCreate = plan.files.filter((f) => f.action === 'create');

  const confirmed = await vscode.window.showInformationMessage(
    `AI-Kit will create ${toCreate.length} file(s)${orgInfo}. Existing files will NOT be overwritten.`,
    { modal: true },
    'Apply Setup',
    'Cancel'
  );
  if (confirmed !== 'Apply Setup') return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Applying setup...' },
    async () => {
      const result = await applySetup(rootPath, plan);
      statusBarProvider.scheduleRefresh(500);

      vscode.window.showInformationMessage(
        `AI-Kit setup complete! ${result.filesCreated.length} created, ${result.filesSkipped.length} skipped.`,
        'Open AGENTS.md'
      ).then(async (action) => {
        if (action === 'Open AGENTS.md') {
          try {
            const doc = await vscode.workspace.openTextDocument(path.join(rootPath, 'AGENTS.md'));
            await vscode.window.showTextDocument(doc);
          } catch { /* already existed and was skipped */ }
        }
      });
    }
  );
}

async function cmdBootstrapMcp(): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  const orgCtx = await readOrgContext(rootPath);

  const orgAlias = await vscode.window.showInputBox({
    prompt: 'Enter your Salesforce org alias',
    value: orgCtx.defaultOrg ?? '',
    placeHolder: 'e.g. my-sandbox',
    validateInput: (v) => (v.trim().length === 0 ? 'Org alias is required' : undefined),
  });
  if (!orgAlias) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Configuring MCP...' },
    async () => {
      const result = await bootstrapMcp(rootPath, { orgAlias });

      const msgs: string[] = [];
      if (!result.alreadyExisted.cursor) msgs.push('.cursor/mcp.json created');
      else msgs.push('.cursor/mcp.json already existed (skipped)');
      if (!result.alreadyExisted.claude) msgs.push('.mcp.json created');
      else msgs.push('.mcp.json already existed (skipped)');

      const validation = await validateMcpConfig(result.cursorConfigPath);
      const validMsg = validation.valid ? 'Config is valid.' : `Warning: ${validation.issues[0]}`;

      vscode.window.showInformationMessage(
        `${msgs.join(' | ')} — ${validMsg} Org: ${orgAlias}. Restart to activate.`,
        'Open .cursor/mcp.json'
      ).then(async (action) => {
        if (action === 'Open .cursor/mcp.json') {
          try {
            const doc = await vscode.workspace.openTextDocument(result.cursorConfigPath);
            await vscode.window.showTextDocument(doc);
          } catch { /* */ }
        }
      });
    }
  );
}

async function cmdCheckDrift(): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Checking drift...' },
    async () => {
      const drift = await detectDrift(rootPath);
      const panel = vscode.window.createWebviewPanel(
        'ai-kit-drift',
        'AI-Kit Drift Report',
        vscode.ViewColumn.One,
        { enableScripts: false }
      );
      panel.webview.html = buildDriftHtml(drift);
    }
  );
}

async function cmdAddClaudeMem(): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  const docsDir = path.join(rootPath, 'docs', 'claude-mem');
  const outputPath = path.join(docsDir, 'salesforce-dx.json');

  await fs.ensureDir(docsDir);

  if (await fs.pathExists(outputPath)) {
    vscode.window.showInformationMessage(
      'AI-Kit: salesforce-dx.json already exists.',
      'Open File'
    ).then(async (a) => {
      if (a === 'Open File') {
        const doc = await vscode.workspace.openTextDocument(outputPath);
        await vscode.window.showTextDocument(doc);
      }
    });
    return;
  }

  await fs.writeFile(outputPath, generateClaudeMemModeJson(), 'utf8');

  vscode.window.showInformationMessage(
    'AI-Kit: claude-mem salesforce-dx mode created at docs/claude-mem/salesforce-dx.json.',
    'Open File'
  ).then(async (a) => {
    if (a === 'Open File') {
      const doc = await vscode.workspace.openTextDocument(outputPath);
      await vscode.window.showTextDocument(doc);
    }
  });
}

async function cmdPickSkill(): Promise<void> {
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  const skills = await listInstalledSkills(rootPath);
  if (skills.length === 0) {
    vscode.window.showWarningMessage(
      'No Cursor skills found. Run AI-Kit: Add Cursor Skills first.'
    );
    return;
  }

  const items = skills.map((s) => ({
    label: `@${s.name}`,
    description: '(project skill)',
    detail: s.description,
    skillName: s.name,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a skill to insert its @mention',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selected) return;

  const mention = `@${(selected as unknown as { skillName: string }).skillName}`;

  await vscode.env.clipboard.writeText(mention);
  vscode.window.showInformationMessage(
    `Copied to clipboard: ${mention}`,
    'Paste in Chat'
  );
}

async function cmdCheckTeamSync(): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  const url = await vscode.window.showInputBox({
    prompt: 'Enter the URL of your team AI-Kit config JSON',
    placeHolder: 'https://raw.githubusercontent.com/your-org/your-repo/main/ai-kit-team.json',
  });
  if (!url) return;
  if (!isAllowedTeamConfigUrl(url.trim())) {
    vscode.window.showErrorMessage('AI-Kit: Team config URL must be a valid https URL.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Checking team sync...' },
    async () => {
      const { fetchTeamConfig } = await import('@sf-ai-toolkit/core');
      const cfg = await fetchTeamConfig(url);
      if (!cfg) {
        vscode.window.showErrorMessage('AI-Kit: Could not fetch team config. Check the URL.');
        return;
      }
      const result = await checkTeamSync(rootPath, cfg);
      const panel = vscode.window.createWebviewPanel(
        'ai-kit-team-sync',
        'AI-Kit Team Sync',
        vscode.ViewColumn.One,
        { enableScripts: false }
      );
      panel.webview.html = buildTeamSyncHtml(result);
    }
  );
}

async function cmdAddHooks(): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  const hookPaths = ['sf-ai-toolkit.config.json', '.githooks/pre-commit', '.githooks/commit-msg'];
  const files = await Promise.all(
    hookPaths.map(async (relativePath) => {
      const fullPath = path.join(rootPath, relativePath);
      const fileExists = await fs.pathExists(fullPath);
      return {
        relativePath,
        action: (fileExists ? 'skip' : 'create') as 'skip' | 'create',
        reason: fileExists ? 'File already exists — will not overwrite' : 'Will be created from template',
        templateKey: relativePath,
      };
    })
  );

  const hooksPlan: SetupPlan = {
    rootPath,
    preset: 'core',
    dryRun: false,
    files,
    packageJsonScripts: {},
    forceIgnoreLines: [],
  };

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Adding Git hooks...' },
    async () => {
      const result = await applySetup(rootPath, hooksPlan);
      for (const hookPath of ['.githooks/pre-commit', '.githooks/commit-msg']) {
        const fullPath = path.join(rootPath, hookPath);
        if (await fs.pathExists(fullPath)) {
          await fs.chmod(fullPath, 0o755);
        }
      }
      vscode.window.showInformationMessage(
        `AI-Kit: ${result.filesCreated.length} hook/config file(s) created, ${result.filesSkipped.length} skipped. Run: git config core.hooksPath .githooks`
      );
    }
  );
}

async function cmdAddFiles(type: string): Promise<void> {
  if (!requireTrustedWorkspace()) return;
  const rootPath = getRootPath();
  if (!rootPath) {
    vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
    return;
  }

  const fileMap: Record<string, string[]> = {
    cursor: ['.cursor/rules/project.mdc', '.cursor/rules/salesforce-mcp.mdc', '.cursor/rules/apex.mdc', '.cursor/rules/lwc.mdc', '.cursor/rules/deployment.mdc', '.cursor/rules/safety.mdc'],
    'cursor-skills': ['docs/afv-library.md', 'docs/skills-ecosystem.md'],
    claude: ['AGENTS.md', 'CLAUDE.md', 'tasks/todo.md', 'tasks/lessons.md', '.claude/commands/review-security.md', '.claude/commands/validate-deploy.md', '.claude/commands/write-tests.md', '.claude/commands/create-apex.md', '.claude/commands/create-lwc.md', '.claude/commands/prepare-pr.md', '.claude/agents/salesforce-architect.md', '.claude/agents/apex-developer.md', '.claude/agents/lwc-developer.md', '.claude/agents/qa-tester.md', '.claude/agents/security-reviewer.md'],
    mcp: ['docs/mcp-usage.md', '.cursor/rules/salesforce-mcp.mdc'],
    'afv-skills': ['docs/afv-library.md', 'docs/skills-ecosystem.md'],
    'afv-library': ['docs/afv-library.md', 'docs/skills-ecosystem.md'],
  };

  const targetFiles = fileMap[type] ?? [];

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `AI-Kit: Adding ${type}...` },
    async () => {
      const plan = await planSetup(rootPath, { preset: 'core', dryRun: false });
      const filteredFiles = plan.files.filter((f) => {
        if (type === 'cursor-skills' || type === 'afv-skills') {
          return f.relativePath.startsWith('.cursor/skills/') || targetFiles.includes(f.relativePath);
        }
        return targetFiles.includes(f.relativePath);
      });
      const filteredPlan = { ...plan, files: filteredFiles, packageJsonScripts: {}, forceIgnoreLines: [] };
      const result = await applySetup(rootPath, filteredPlan);
      statusBarProvider.scheduleRefresh(500);
      vscode.window.showInformationMessage(`AI-Kit: ${result.filesCreated.length} file(s) created, ${result.filesSkipped.length} skipped.`);
    }
  );
}

// ─── Webview HTML builders ────────────────────────────────────────────────────

function buildReportHtml(
  result: Awaited<ReturnType<typeof scanProject>>,
  report: string,
  orgCtx: Awaited<ReturnType<typeof readOrgContext>>,
  drift: Awaited<ReturnType<typeof detectDrift>>
): string {
  const score = result.score;
  const scoreColor = score >= 80 ? '#4caf50' : score >= 50 ? '#ff9800' : '#f44336';
  const orgBanner = orgCtx.source !== 'none'
    ? `<div class="org-banner">Working against org: <strong>${escapeHtml(orgCtx.defaultOrg ?? 'unknown')}</strong> <span class="dim">(${escapeHtml(orgCtx.source)})</span></div>`
    : '<div class="org-banner warn">No org context detected — run ai-kit-sf bootstrap-mcp</div>';

  const driftSection = drift.drifted.length > 0
    ? `<div class="section"><h2>⚠ Drift Detected</h2><ul>${drift.drifted.map((d) =>
        `<li><strong>${escapeHtml(d.relativePath)}</strong> — ${escapeHtml(d.reason)}<br><small>${d.missingSignals.map(escapeHtml).join(', ')}</small></li>`
      ).join('')}</ul></div>`
    : `<div class="section"><p style="color:#4caf50">✓ No template drift detected.</p></div>`;

  const escaped = report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground);max-width:800px}
  h1{margin-bottom:4px} h2{border-bottom:1px solid #444;padding-bottom:4px;margin-top:24px}
  .score{font-size:2.4em;font-weight:bold;color:${scoreColor}}
  .org-banner{background:#1e3a5f;border-left:4px solid #4fc3f7;padding:8px 12px;margin:12px 0;border-radius:2px}
  .org-banner.warn{background:#3a2a00;border-color:#ff9800}
  .dim{opacity:.6;font-size:.85em} ul{padding-left:20px} li{margin:4px 0}
  .section{margin-top:20px}
  pre{background:var(--vscode-editor-background);padding:16px;border-radius:4px;white-space:pre-wrap;font-size:13px}
</style></head><body>
<h1>AI-Kit for Salesforce</h1>
${orgBanner}
<p style="margin:4px 0;opacity:.7">AI Readiness Score</p>
<div class="score">${score}/100</div>
${result.missing.length > 0 ? `<div class="section"><h2>Missing</h2><ul>${renderList(result.missing)}</ul></div>` : '<p style="color:#4caf50;margin-top:12px">✓ No missing items!</p>'}
${result.recommendations.length > 0 ? `<div class="section"><h2>Recommendations</h2><ul>${renderList(result.recommendations)}</ul></div>` : ''}
${driftSection}
<div class="section"><h2>Full Report</h2><pre>${escaped}</pre></div>
</body></html>`;
}

function buildDriftHtml(drift: Awaited<ReturnType<typeof detectDrift>>): string {
  const driftedRows = drift.drifted.map((d) =>
    `<tr><td><strong>${escapeHtml(d.relativePath)}</strong></td><td>${escapeHtml(d.reason)}</td><td>${d.missingSignals.map(escapeHtml).join('<br>')}</td></tr>`
  ).join('');
  const missingRows = drift.missing.map((m) =>
    `<tr><td><strong>${escapeHtml(m)}</strong></td><td>File not found</td><td>—</td></tr>`
  ).join('');
  const okRows = drift.upToDate.map((f) =>
    `<tr><td>${escapeHtml(f)}</td><td colspan="2" style="color:#4caf50">✓ Up to date</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground)}
  h1{margin-bottom:8px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;padding:8px;background:#1e1e1e;border-bottom:2px solid #444}
  td{padding:8px;border-bottom:1px solid #333;vertical-align:top}
  .warn{color:#ff9800} .ok{color:#4caf50}
</style></head><body>
<h1>AI-Kit Drift Report</h1>
<p>${drift.drifted.length + drift.missing.length === 0 ? '<span style="color:#4caf50">✓ All tracked files are up to date.</span>' : `${drift.drifted.length} drifted, ${drift.missing.length} missing, ${drift.upToDate.length} up to date.`}</p>
<table>
  <thead><tr><th>File</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>${driftedRows}${missingRows}${okRows}</tbody>
</table>
${drift.drifted.length > 0 ? '<p style="margin-top:16px;opacity:.7">To fix: delete drifted files and run AI-Kit: Apply Recommended Setup</p>' : ''}
</body></html>`;
}

function buildTeamSyncHtml(result: Awaited<ReturnType<typeof checkTeamSync>>): string {
  return buildDriftHtml({
    drifted: result.drifted,
    missing: result.missing,
    upToDate: result.upToDate,
  }).replace('<h1>AI-Kit Drift Report</h1>', `<h1>AI-Kit Team Sync — v${escapeHtml(result.configVersion)}</h1><p>${escapeHtml(result.summary)}</p>`);
}
