import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { createBackup } from '../backup';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-backup-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('createBackup', () => {
  it('creates backup of existing files', async () => {
    const file1 = path.join(tmpDir, 'CLAUDE.md');
    await fs.writeFile(file1, '# Claude');

    const backupDir = await createBackup(tmpDir, [file1]);
    const backupFile = path.join(backupDir, 'CLAUDE.md.bak');
    const exists = await fs.pathExists(backupFile);
    expect(exists).toBe(true);

    const content = await fs.readFile(backupFile, 'utf8');
    expect(content).toBe('# Claude');
  });

  it('skips non-existent files gracefully', async () => {
    const nonExistent = path.join(tmpDir, 'does-not-exist.md');
    const backupDir = await createBackup(tmpDir, [nonExistent]);
    const backupFile = path.join(backupDir, 'does-not-exist.md.bak');
    const exists = await fs.pathExists(backupFile);
    expect(exists).toBe(false);
  });

  it('creates backup directory with timestamp format', async () => {
    await createBackup(tmpDir, []);
    const backupBase = path.join(tmpDir, '.sf-ai-toolkit-backup');
    const entries = await fs.readdir(backupBase);
    expect(entries.length).toBe(1);
    expect(entries[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}$/);
  });

  it('preserves nested file structure in backup', async () => {
    const nested = path.join(tmpDir, 'docs', 'security.md');
    await fs.ensureDir(path.dirname(nested));
    await fs.writeFile(nested, '# Security');

    const backupDir = await createBackup(tmpDir, [nested]);
    const backupFile = path.join(backupDir, 'docs', 'security.md.bak');
    const exists = await fs.pathExists(backupFile);
    expect(exists).toBe(true);
  });
});
