import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { writeFileSafe, appendMissingLines, mergePackageJsonScripts } from '../safe-write';
import { MARKER_START, MARKER_END } from '../templates';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-safe-write-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('writeFileSafe', () => {
  it('creates a new file when it does not exist', async () => {
    const filePath = path.join(tmpDir, 'new-file.md');
    const result = await writeFileSafe(filePath, '# Hello');
    expect(result.action).toBe('create');
    expect(result.skipped).toBe(false);
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toBe('# Hello');
  });

  it('skips existing file when overwrite is false', async () => {
    const filePath = path.join(tmpDir, 'existing.md');
    await fs.writeFile(filePath, '# Original');
    const result = await writeFileSafe(filePath, '# New Content');
    expect(result.action).toBe('skip');
    expect(result.skipped).toBe(true);
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toBe('# Original');
  });

  it('does not write in dry-run mode', async () => {
    const filePath = path.join(tmpDir, 'dry-run.md');
    const result = await writeFileSafe(filePath, '# Hello', { dryRun: true });
    expect(result.action).toBe('create');
    const exists = await fs.pathExists(filePath);
    expect(exists).toBe(false);
  });

  it('appends marker block when file exists and markerLabel is set', async () => {
    const filePath = path.join(tmpDir, 'existing.md');
    await fs.writeFile(filePath, '# Pre-existing content\n');
    const result = await writeFileSafe(filePath, 'Generated content', { markerLabel: 'ai-kit' });
    expect(result.action).toBe('append');
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toContain(MARKER_START);
    expect(content).toContain(MARKER_END);
    expect(content).toContain('Generated content');
    expect(content).toContain('# Pre-existing content');
  });

  it('replaces marker block content when markers already exist', async () => {
    const filePath = path.join(tmpDir, 'with-markers.md');
    await fs.writeFile(
      filePath,
      `# Existing\n\n${MARKER_START}\nOld content\n${MARKER_END}\n\n# After marker\n`
    );
    await writeFileSafe(filePath, 'New generated content', { markerLabel: 'ai-kit' });
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toContain('New generated content');
    expect(content).not.toContain('Old content');
    expect(content).toContain('# Existing');
    expect(content).toContain('# After marker');
  });

  it('creates nested directories if needed', async () => {
    const filePath = path.join(tmpDir, 'a', 'b', 'c', 'file.md');
    await writeFileSafe(filePath, '# Nested');
    const exists = await fs.pathExists(filePath);
    expect(exists).toBe(true);
  });
});

describe('appendMissingLines', () => {
  it('appends missing lines to an existing file', async () => {
    const filePath = path.join(tmpDir, '.forceignore');
    await fs.writeFile(filePath, '.env\nnode_modules/\n');
    const added = await appendMissingLines(filePath, ['.env', '.sfdx/', 'coverage/']);
    expect(added).toEqual(['.sfdx/', 'coverage/']);
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toContain('.sfdx/');
    expect(content).toContain('coverage/');
  });

  it('creates file and adds all lines when file does not exist', async () => {
    const filePath = path.join(tmpDir, '.forceignore');
    const added = await appendMissingLines(filePath, ['.env', '.sfdx/']);
    expect(added).toEqual(['.env', '.sfdx/']);
  });

  it('returns empty array when all lines already exist', async () => {
    const filePath = path.join(tmpDir, '.forceignore');
    await fs.writeFile(filePath, '.env\n.sfdx/\n');
    const added = await appendMissingLines(filePath, ['.env', '.sfdx/']);
    expect(added).toEqual([]);
  });
});

describe('mergePackageJsonScripts', () => {
  it('adds missing scripts to package.json', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    await fs.writeFile(pkgPath, JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }));
    const added = await mergePackageJsonScripts(tmpDir, { test: 'vitest', lint: 'eslint .' });
    expect(added).toContain('test');
    expect(added).toContain('lint');
    const pkg = await fs.readJson(pkgPath);
    expect(pkg.scripts.test).toBe('vitest');
    expect(pkg.scripts.build).toBe('tsc'); // existing not overwritten
  });

  it('does not overwrite existing scripts', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    await fs.writeFile(pkgPath, JSON.stringify({ scripts: { build: 'webpack' } }));
    await mergePackageJsonScripts(tmpDir, { build: 'tsc' });
    const pkg = await fs.readJson(pkgPath);
    expect(pkg.scripts.build).toBe('webpack');
  });

  it('returns empty array when package.json does not exist', async () => {
    const added = await mergePackageJsonScripts(tmpDir, { test: 'vitest' });
    expect(added).toEqual([]);
  });
});
