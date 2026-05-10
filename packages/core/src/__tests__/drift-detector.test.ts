import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { detectDrift, checkTeamSync, fetchTeamConfig } from '../drift-detector';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-drift-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('detectDrift', () => {
  it('reports file as missing when it does not exist', async () => {
    const result = await detectDrift(tmpDir, ['CLAUDE.md']);
    expect(result.missing).toContain('CLAUDE.md');
    expect(result.drifted).toHaveLength(0);
    expect(result.upToDate).toHaveLength(0);
  });

  it('marks file as up to date when all signals present', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      'Workflow Orchestration\nPlan Mode Default\nSelf-Improvement Loop\nVerification Before Done\ntasks/todo.md\n'
    );
    const result = await detectDrift(tmpDir, ['CLAUDE.md']);
    expect(result.upToDate).toContain('CLAUDE.md');
    expect(result.drifted).toHaveLength(0);
  });

  it('marks file as drifted when signals are missing', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Old CLAUDE.md\nNo modern content here.\n');
    const result = await detectDrift(tmpDir, ['CLAUDE.md']);
    expect(result.drifted).toHaveLength(1);
    expect(result.drifted[0].relativePath).toBe('CLAUDE.md');
    expect(result.drifted[0].missingSignals.length).toBeGreaterThan(0);
  });

  it('handles multiple files in one call', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      'Workflow Orchestration\nPlan Mode Default\nSelf-Improvement Loop\nVerification Before Done\ntasks/todo.md\n'
    );
    // AGENTS.md not created — should be missing
    const result = await detectDrift(tmpDir, ['CLAUDE.md', 'AGENTS.md']);
    expect(result.upToDate).toContain('CLAUDE.md');
    expect(result.missing).toContain('AGENTS.md');
  });
});

describe('checkTeamSync', () => {
  it('marks a file as up to date when all its signals pass', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      'Workflow Orchestration\nPlan Mode Default\nSelf-Improvement Loop\nVerification Before Done\ntasks/todo.md\n'
    );
    const result = await checkTeamSync(tmpDir, {
      version: '1.0.0',
      requiredFiles: ['CLAUDE.md'],
    });
    // CLAUDE.md is up to date — it has all required signals
    expect(result.upToDate).toContain('CLAUDE.md');
    expect(result.drifted.map((d) => d.relativePath)).not.toContain('CLAUDE.md');
  });

  it('reports missing required files', async () => {
    const result = await checkTeamSync(tmpDir, {
      version: '1.0.0',
      requiredFiles: ['CLAUDE.md', 'AGENTS.md'],
    });
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('summary includes version', async () => {
    const result = await checkTeamSync(tmpDir, {
      version: '2.5.0',
      requiredFiles: [],
    });
    expect(result.configVersion).toBe('2.5.0');
    expect(result.summary).toContain('2.5.0');
  });
});

describe('fetchTeamConfig', () => {
  it('rejects non-https URLs', async () => {
    const result = await fetchTeamConfig('http://example.com/team.json');
    expect(result).toBeNull();
  });

  it('rejects invalid JSON payloads', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () =>
        new Response('{"bad":"shape"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })) as typeof fetch;

      const result = await fetchTeamConfig('https://example.com/team.json');
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
