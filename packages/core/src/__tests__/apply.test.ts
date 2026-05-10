import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { applySetup } from '../apply';
import { planSetup } from '../planner';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-apply-'));
  // Set up a minimal Salesforce DX project
  await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
  await fs.ensureDir(path.join(tmpDir, 'force-app'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('applySetup', () => {
  it('creates missing files in non-dry-run mode', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    const result = await applySetup(tmpDir, plan);
    expect(result.filesCreated.length).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  it('does not create files in dry-run mode', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: true });
    const result = await applySetup(tmpDir, plan);
    expect(result.filesCreated.length).toBeGreaterThan(0);
    // Verify files were NOT actually created
    const agentsMd = path.join(tmpDir, 'AGENTS.md');
    const exists = await fs.pathExists(agentsMd);
    expect(exists).toBe(false);
  });

  it('does not overwrite existing files', async () => {
    const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
    await fs.writeFile(agentsMdPath, '# My Existing AGENTS.md\n');

    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);

    const content = await fs.readFile(agentsMdPath, 'utf8');
    expect(content).toBe('# My Existing AGENTS.md\n');
  });

  it('creates CLAUDE.md with correct content', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const exists = await fs.pathExists(claudeMd);
    expect(exists).toBe(true);
    const content = await fs.readFile(claudeMd, 'utf8');
    expect(content).toContain('Claude Code');
  });

  it('creates cursor rules', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const rulePath = path.join(tmpDir, '.cursor', 'rules', 'apex.mdc');
    const exists = await fs.pathExists(rulePath);
    expect(exists).toBe(true);
  });

  it('creates cursor skills', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const skillPath = path.join(tmpDir, '.cursor', 'skills', 'salesforce-apex', 'SKILL.md');
    const exists = await fs.pathExists(skillPath);
    expect(exists).toBe(true);
  });

  it('creates claude commands', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const cmdPath = path.join(tmpDir, '.claude', 'commands', 'review-security.md');
    const exists = await fs.pathExists(cmdPath);
    expect(exists).toBe(true);
  });

  it('creates MCP usage docs', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const mcpDoc = path.join(tmpDir, 'docs', 'mcp-usage.md');
    const exists = await fs.pathExists(mcpDoc);
    expect(exists).toBe(true);
  });

  it('creates tasks/todo.md', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const todoPath = path.join(tmpDir, 'tasks', 'todo.md');
    const exists = await fs.pathExists(todoPath);
    expect(exists).toBe(true);
    const content = await fs.readFile(todoPath, 'utf8');
    expect(content).toContain('Task Tracker');
  });

  it('creates tasks/lessons.md', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const lessonsPath = path.join(tmpDir, 'tasks', 'lessons.md');
    const exists = await fs.pathExists(lessonsPath);
    expect(exists).toBe(true);
    const content = await fs.readFile(lessonsPath, 'utf8');
    expect(content).toContain('Lessons Learned');
  });

  it('creates .cursor/rules/project.mdc', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const projectMdc = path.join(tmpDir, '.cursor', 'rules', 'project.mdc');
    const exists = await fs.pathExists(projectMdc);
    expect(exists).toBe(true);
    const content = await fs.readFile(projectMdc, 'utf8');
    expect(content).toContain('Plan Mode Default');
    expect(content).toContain('tasks/todo.md');
  });

  it('does not overwrite existing tasks/todo.md', async () => {
    await fs.ensureDir(path.join(tmpDir, 'tasks'));
    const todoPath = path.join(tmpDir, 'tasks', 'todo.md');
    await fs.writeFile(todoPath, '# My existing todo\n');

    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);

    const content = await fs.readFile(todoPath, 'utf8');
    expect(content).toBe('# My existing todo\n');
  });

  it('does not overwrite existing .cursor/rules/project.mdc', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
    const projectMdc = path.join(tmpDir, '.cursor', 'rules', 'project.mdc');
    await fs.writeFile(projectMdc, '# My existing project rules\n');

    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);

    const content = await fs.readFile(projectMdc, 'utf8');
    expect(content).toBe('# My existing project rules\n');
  });

  it('CLAUDE.md contains workflow orchestration section', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const content = await fs.readFile(claudeMd, 'utf8');
    expect(content).toContain('Workflow Orchestration');
    expect(content).toContain('Plan Mode Default');
    expect(content).toContain('Self-Improvement Loop');
    expect(content).toContain('Verification Before Done');
    expect(content).toContain('tasks/todo.md');
    expect(content).toContain('tasks/lessons.md');
  });

  it('creates AFV library docs', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const afvDoc = path.join(tmpDir, 'docs', 'afv-library.md');
    const exists = await fs.pathExists(afvDoc);
    expect(exists).toBe(true);
  });

  it('creates backup before modifying existing files', async () => {
    // Create a file that will be in the backup list (not actually modified but listed)
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    const result = await applySetup(tmpDir, plan);

    const backupDir = path.join(tmpDir, '.ai-kit-salesforce-backup');
    const exists = await fs.pathExists(backupDir);
    expect(exists).toBe(true);
    expect(result.backupPath).toBeDefined();
  });

  it('updates .forceignore with missing entries', async () => {
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const fi = path.join(tmpDir, '.forceignore');
    const exists = await fs.pathExists(fi);
    expect(exists).toBe(true);
    const content = await fs.readFile(fi, 'utf8');
    expect(content).toContain('.env');
    expect(content).toContain('node_modules/');
  });

  it('updates package.json scripts if package.json exists', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    const plan = await planSetup(tmpDir, { preset: 'core', dryRun: false });
    await applySetup(tmpDir, plan);
    const pkg = await fs.readJson(path.join(tmpDir, 'package.json'));
    expect(pkg.scripts?.['test:apex']).toBeDefined();
    expect(pkg.scripts?.validate).toBeDefined();
  });
});
