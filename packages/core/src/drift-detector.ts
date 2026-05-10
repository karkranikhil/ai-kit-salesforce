import * as fs from 'fs-extra';
import * as path from 'path';
import { TEMPLATES } from './templates';

export interface DriftResult {
  /** Files that exist but differ significantly from the current AI-Kit template */
  drifted: DriftedFile[];
  /** Files that are missing entirely */
  missing: string[];
  /** Files that match the current template closely */
  upToDate: string[];
}

export interface DriftedFile {
  relativePath: string;
  reason: string;
  /** Lines in template not found in project file (sample) */
  missingSignals: string[];
}

/** Key phrases that must be present in a file for it to be considered current */
const FILE_SIGNALS: Record<string, string[]> = {
  'CLAUDE.md': [
    'Workflow Orchestration',
    'Plan Mode Default',
    'Self-Improvement Loop',
    'Verification Before Done',
    'tasks/todo.md',
  ],
  '.cursor/rules/project.mdc': [
    'Plan Mode Default',
    'tasks/todo.md',
    'tasks/lessons.md',
    'Definition of Done',
  ],
  '.cursor/rules/apex.mdc': [
    'Bulkify',
    'SOQL or DML inside loops',
    'with sharing',
    'CRUD/FLS',
  ],
  '.cursor/rules/safety.mdc': [
    'Never expose secrets',
    'Named Credentials',
    'anonymous Apex',
  ],
  '.cursor/rules/salesforce-mcp.mdc': [
    'MCP',
    'read-only mode for production',
    'confirm the target org alias',
  ],
  'AGENTS.md': [
    'Salesforce DX Structure',
    'Deployment Safety Rules',
    'AI Tool Usage Rules',
  ],
};

/** Check local files for the tracked key-phrase signals */
export async function detectDrift(rootPath: string, filesToCheck?: string[]): Promise<DriftResult> {
  const targets = filesToCheck ?? Object.keys(FILE_SIGNALS);
  const drifted: DriftedFile[] = [];
  const missing: string[] = [];
  const upToDate: string[] = [];

  await Promise.all(
    targets.map(async (relativePath) => {
      const fullPath = path.join(rootPath, relativePath);
      const signals = FILE_SIGNALS[relativePath];
      if (!signals) return; // no signals defined — skip

      const exists = await fs.pathExists(fullPath);
      if (!exists) {
        missing.push(relativePath);
        return;
      }

      const content = await fs.readFile(fullPath, 'utf8');
      const missingSignals = signals.filter((s) => !content.includes(s));

      if (missingSignals.length > 0) {
        drifted.push({
          relativePath,
          reason: `Missing ${missingSignals.length} expected section(s) from current AI-Kit template`,
          missingSignals: missingSignals.slice(0, 3),
        });
      } else {
        upToDate.push(relativePath);
      }
    })
  );

  return { drifted, missing, upToDate };
}

/** Compare a project's AI setup against a remote team config snapshot */
export interface TeamConfig {
  version: string;
  /** Expected file keys that should exist */
  requiredFiles: string[];
  /** Signal phrases per file — overrides built-in signals */
  signals?: Record<string, string[]>;
  /** Human-readable description */
  description?: string;
}

export interface TeamSyncResult {
  configVersion: string;
  drifted: DriftedFile[];
  missing: string[];
  upToDate: string[];
  summary: string;
}

function isValidTeamConfig(input: unknown): input is TeamConfig {
  if (!input || typeof input !== 'object') return false;
  const cfg = input as Partial<TeamConfig>;
  if (typeof cfg.version !== 'string' || cfg.version.trim().length === 0) return false;
  if (!Array.isArray(cfg.requiredFiles) || !cfg.requiredFiles.every((f) => typeof f === 'string')) return false;
  if (cfg.signals !== undefined) {
    if (typeof cfg.signals !== 'object' || cfg.signals === null) return false;
    for (const values of Object.values(cfg.signals)) {
      if (!Array.isArray(values) || !values.every((v) => typeof v === 'string')) return false;
    }
  }
  if (cfg.description !== undefined && typeof cfg.description !== 'string') return false;
  return true;
}

function isSafeTeamConfigUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '::1') return false;

  const ipv4Private =
    /^10\./.test(host) ||
    /^127\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  if (ipv4Private) return false;

  return true;
}

export async function checkTeamSync(
  rootPath: string,
  teamConfig: TeamConfig
): Promise<TeamSyncResult> {
  const mergedSignals: Record<string, string[]> = {
    ...FILE_SIGNALS,
    ...(teamConfig.signals ?? {}),
  };

  const allTargets = [
    ...new Set([...Object.keys(mergedSignals), ...teamConfig.requiredFiles]),
  ];

  const drift = await detectDrift(rootPath, allTargets);

  // Also check required files that aren't in signals
  for (const f of teamConfig.requiredFiles) {
    if (!FILE_SIGNALS[f] && !(teamConfig.signals?.[f])) {
      const exists = await fs.pathExists(path.join(rootPath, f));
      if (!exists && !drift.missing.includes(f)) {
        drift.missing.push(f);
      } else if (exists && !drift.upToDate.includes(f) && !drift.drifted.find((d) => d.relativePath === f)) {
        drift.upToDate.push(f);
      }
    }
  }

  const issues = drift.drifted.length + drift.missing.length;
  const summary =
    issues === 0
      ? `In sync with team config v${teamConfig.version}. All ${drift.upToDate.length} tracked file(s) up to date.`
      : `${issues} issue(s) found vs team config v${teamConfig.version}. ${drift.drifted.length} drifted, ${drift.missing.length} missing.`;

  return {
    configVersion: teamConfig.version,
    drifted: drift.drifted,
    missing: drift.missing,
    upToDate: drift.upToDate,
    summary,
  };
}

/** Fetch a team config from a URL (for CLI/extension use). Returns null on failure. */
export async function fetchTeamConfig(url: string): Promise<TeamConfig | null> {
  try {
    if (!isSafeTeamConfigUrl(url)) return null;

    // Use global fetch (Node 18+) or fall back gracefully
    const fetchFn: typeof fetch =
      typeof globalThis.fetch === 'function'
        ? globalThis.fetch
        : // eslint-disable-next-line @typescript-eslint/no-var-requires
          (require('node-fetch') as { default: typeof fetch }).default;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetchFn(url, { signal: controller.signal });
      if (!res.ok) return null;
      const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
      if (contentType && !contentType.includes('application/json')) return null;
      const text = await res.text();
      if (text.length > 1024 * 1024) return null;
      const parsed = JSON.parse(text) as unknown;
      if (!isValidTeamConfig(parsed)) return null;
      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

export { FILE_SIGNALS };
