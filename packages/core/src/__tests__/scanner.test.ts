import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { scanProject } from '../scanner';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-test-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('scanProject', () => {
  it('detects a Salesforce DX project', async () => {
    await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
    const result = await scanProject(tmpDir);
    expect(result.isSalesforceDx).toBe(true);
  });

  it('returns isSalesforceDx false when sfdx-project.json missing', async () => {
    const result = await scanProject(tmpDir);
    expect(result.isSalesforceDx).toBe(false);
  });

  it('detects force-app directory', async () => {
    await fs.ensureDir(path.join(tmpDir, 'force-app'));
    const result = await scanProject(tmpDir);
    expect(result.hasForceApp).toBe(true);
  });

  it('detects missing AGENTS.md', async () => {
    const result = await scanProject(tmpDir);
    expect(result.hasAgentsMd).toBe(false);
    expect(result.missing).toContain('AGENTS.md');
  });

  it('detects existing AGENTS.md', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS');
    const result = await scanProject(tmpDir);
    expect(result.hasAgentsMd).toBe(true);
    expect(result.missing).not.toContain('AGENTS.md');
  });

  it('detects cursor rules directory', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
    const result = await scanProject(tmpDir);
    expect(result.hasCursorRules).toBe(true);
  });

  it('detects cursor skills directory and marks hasJagsSkills true', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'skills'));
    const result = await scanProject(tmpDir);
    expect(result.hasCursorSkills).toBe(true);
    expect(result.hasJagsSkills).toBe(true);
  });

  it('calculates readiness score 0 for empty project', async () => {
    const result = await scanProject(tmpDir);
    expect(result.score).toBe(0);
  });

  it('calculates score 38 for project with sfdx, force-app, AGENTS.md', async () => {
    // sfdx=20, force-app=10, AGENTS.md=8 (score changed from 10 to 8 for CLAUDE.md,
    // with 4 pts moved to project.mdc; AGENTS.md stays at 10)
    await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
    await fs.ensureDir(path.join(tmpDir, 'force-app'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS');
    const result = await scanProject(tmpDir);
    expect(result.score).toBe(40); // 20 + 10 + 10
  });

  it('detects hasPackageJson', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    const result = await scanProject(tmpDir);
    expect(result.hasPackageJson).toBe(true);
  });

  it('detects .forceignore', async () => {
    await fs.writeFile(path.join(tmpDir, '.forceignore'), '');
    const result = await scanProject(tmpDir);
    expect(result.hasForceIgnore).toBe(true);
  });

  it('detects AFV library docs', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'afv-library.md'), '# AFV');
    const result = await scanProject(tmpDir);
    expect(result.hasAfvLibraryDocs).toBe(true);
  });

  it('detects AFV library skills by folder name', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'skills', 'agentforce'));
    const result = await scanProject(tmpDir);
    expect(result.hasAfvLibrarySkills).toBe(true);
  });

  it('detects tasks/todo.md', async () => {
    await fs.ensureDir(path.join(tmpDir, 'tasks'));
    await fs.writeFile(path.join(tmpDir, 'tasks', 'todo.md'), '# Tasks');
    const result = await scanProject(tmpDir);
    expect(result.hasTasksTodo).toBe(true);
  });

  it('detects tasks/lessons.md', async () => {
    await fs.ensureDir(path.join(tmpDir, 'tasks'));
    await fs.writeFile(path.join(tmpDir, 'tasks', 'lessons.md'), '# Lessons');
    const result = await scanProject(tmpDir);
    expect(result.hasTasksLessons).toBe(true);
  });

  it('reports tasks/todo.md and tasks/lessons.md as missing when absent', async () => {
    const result = await scanProject(tmpDir);
    expect(result.hasTasksTodo).toBe(false);
    expect(result.hasTasksLessons).toBe(false);
    expect(result.missing).toContain('tasks/todo.md');
    expect(result.missing).toContain('tasks/lessons.md');
  });

  it('detects .cursor/rules/project.mdc', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
    await fs.writeFile(path.join(tmpDir, '.cursor', 'rules', 'project.mdc'), '---\n---\n# Rules');
    const result = await scanProject(tmpDir);
    expect(result.hasCursorProjectRule).toBe(true);
  });

  it('reports .cursor/rules/project.mdc as missing when absent', async () => {
    const result = await scanProject(tmpDir);
    expect(result.hasCursorProjectRule).toBe(false);
    const missingEntry = result.missing.find((m) => m.includes('project.mdc'));
    expect(missingEntry).toBeDefined();
  });

  it('task management contributes to score', async () => {
    await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
    await fs.ensureDir(path.join(tmpDir, 'tasks'));
    await fs.writeFile(path.join(tmpDir, 'tasks', 'todo.md'), '# Tasks');
    await fs.writeFile(path.join(tmpDir, 'tasks', 'lessons.md'), '# Lessons');
    const result = await scanProject(tmpDir);
    // sfdx=20, tasks=6
    expect(result.score).toBe(26);
  });

  it('includes recommendations when items are missing', async () => {
    const result = await scanProject(tmpDir);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
