"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const apply_1 = require("../apply");
const planner_1 = require("../planner");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-apply-'));
    // Set up a minimal Salesforce DX project
    await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
    await fs.ensureDir(path.join(tmpDir, 'force-app'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('applySetup', () => {
    (0, vitest_1.it)('creates missing files in non-dry-run mode', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        const result = await (0, apply_1.applySetup)(tmpDir, plan);
        (0, vitest_1.expect)(result.filesCreated.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.errors).toEqual([]);
    });
    (0, vitest_1.it)('does not create files in dry-run mode', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: true });
        const result = await (0, apply_1.applySetup)(tmpDir, plan);
        (0, vitest_1.expect)(result.filesCreated.length).toBeGreaterThan(0);
        // Verify files were NOT actually created
        const agentsMd = path.join(tmpDir, 'AGENTS.md');
        const exists = await fs.pathExists(agentsMd);
        (0, vitest_1.expect)(exists).toBe(false);
    });
    (0, vitest_1.it)('does not overwrite existing files', async () => {
        const agentsMdPath = path.join(tmpDir, 'AGENTS.md');
        await fs.writeFile(agentsMdPath, '# My Existing AGENTS.md\n');
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const content = await fs.readFile(agentsMdPath, 'utf8');
        (0, vitest_1.expect)(content).toBe('# My Existing AGENTS.md\n');
    });
    (0, vitest_1.it)('creates CLAUDE.md with correct content', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const claudeMd = path.join(tmpDir, 'CLAUDE.md');
        const exists = await fs.pathExists(claudeMd);
        (0, vitest_1.expect)(exists).toBe(true);
        const content = await fs.readFile(claudeMd, 'utf8');
        (0, vitest_1.expect)(content).toContain('Claude Code');
    });
    (0, vitest_1.it)('creates cursor rules', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const rulePath = path.join(tmpDir, '.cursor', 'rules', 'apex.mdc');
        const exists = await fs.pathExists(rulePath);
        (0, vitest_1.expect)(exists).toBe(true);
    });
    (0, vitest_1.it)('creates cursor skills', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const skillPath = path.join(tmpDir, '.cursor', 'skills', 'salesforce-apex', 'SKILL.md');
        const exists = await fs.pathExists(skillPath);
        (0, vitest_1.expect)(exists).toBe(true);
    });
    (0, vitest_1.it)('creates claude commands', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const cmdPath = path.join(tmpDir, '.claude', 'commands', 'review-security.md');
        const exists = await fs.pathExists(cmdPath);
        (0, vitest_1.expect)(exists).toBe(true);
    });
    (0, vitest_1.it)('creates MCP usage docs', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const mcpDoc = path.join(tmpDir, 'docs', 'mcp-usage.md');
        const exists = await fs.pathExists(mcpDoc);
        (0, vitest_1.expect)(exists).toBe(true);
    });
    (0, vitest_1.it)('creates tasks/todo.md', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const todoPath = path.join(tmpDir, 'tasks', 'todo.md');
        const exists = await fs.pathExists(todoPath);
        (0, vitest_1.expect)(exists).toBe(true);
        const content = await fs.readFile(todoPath, 'utf8');
        (0, vitest_1.expect)(content).toContain('Task Tracker');
    });
    (0, vitest_1.it)('creates tasks/lessons.md', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const lessonsPath = path.join(tmpDir, 'tasks', 'lessons.md');
        const exists = await fs.pathExists(lessonsPath);
        (0, vitest_1.expect)(exists).toBe(true);
        const content = await fs.readFile(lessonsPath, 'utf8');
        (0, vitest_1.expect)(content).toContain('Lessons Learned');
    });
    (0, vitest_1.it)('creates .cursor/rules/project.mdc', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const projectMdc = path.join(tmpDir, '.cursor', 'rules', 'project.mdc');
        const exists = await fs.pathExists(projectMdc);
        (0, vitest_1.expect)(exists).toBe(true);
        const content = await fs.readFile(projectMdc, 'utf8');
        (0, vitest_1.expect)(content).toContain('Plan Mode Default');
        (0, vitest_1.expect)(content).toContain('tasks/todo.md');
    });
    (0, vitest_1.it)('does not overwrite existing tasks/todo.md', async () => {
        await fs.ensureDir(path.join(tmpDir, 'tasks'));
        const todoPath = path.join(tmpDir, 'tasks', 'todo.md');
        await fs.writeFile(todoPath, '# My existing todo\n');
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const content = await fs.readFile(todoPath, 'utf8');
        (0, vitest_1.expect)(content).toBe('# My existing todo\n');
    });
    (0, vitest_1.it)('does not overwrite existing .cursor/rules/project.mdc', async () => {
        await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
        const projectMdc = path.join(tmpDir, '.cursor', 'rules', 'project.mdc');
        await fs.writeFile(projectMdc, '# My existing project rules\n');
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const content = await fs.readFile(projectMdc, 'utf8');
        (0, vitest_1.expect)(content).toBe('# My existing project rules\n');
    });
    (0, vitest_1.it)('CLAUDE.md contains workflow orchestration section', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const claudeMd = path.join(tmpDir, 'CLAUDE.md');
        const content = await fs.readFile(claudeMd, 'utf8');
        (0, vitest_1.expect)(content).toContain('Workflow Orchestration');
        (0, vitest_1.expect)(content).toContain('Plan Mode Default');
        (0, vitest_1.expect)(content).toContain('Self-Improvement Loop');
        (0, vitest_1.expect)(content).toContain('Verification Before Done');
        (0, vitest_1.expect)(content).toContain('tasks/todo.md');
        (0, vitest_1.expect)(content).toContain('tasks/lessons.md');
    });
    (0, vitest_1.it)('creates AFV library docs', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const afvDoc = path.join(tmpDir, 'docs', 'afv-library.md');
        const exists = await fs.pathExists(afvDoc);
        (0, vitest_1.expect)(exists).toBe(true);
    });
    (0, vitest_1.it)('creates backup before modifying existing files', async () => {
        // Create a file that will be in the backup list (not actually modified but listed)
        await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        const result = await (0, apply_1.applySetup)(tmpDir, plan);
        const backupDir = path.join(tmpDir, '.ai-kit-salesforce-backup');
        const exists = await fs.pathExists(backupDir);
        (0, vitest_1.expect)(exists).toBe(true);
        (0, vitest_1.expect)(result.backupPath).toBeDefined();
    });
    (0, vitest_1.it)('updates .forceignore with missing entries', async () => {
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const fi = path.join(tmpDir, '.forceignore');
        const exists = await fs.pathExists(fi);
        (0, vitest_1.expect)(exists).toBe(true);
        const content = await fs.readFile(fi, 'utf8');
        (0, vitest_1.expect)(content).toContain('.env');
        (0, vitest_1.expect)(content).toContain('node_modules/');
    });
    (0, vitest_1.it)('updates package.json scripts if package.json exists', async () => {
        await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
        const plan = await (0, planner_1.planSetup)(tmpDir, { preset: 'core', dryRun: false });
        await (0, apply_1.applySetup)(tmpDir, plan);
        const pkg = await fs.readJson(path.join(tmpDir, 'package.json'));
        (0, vitest_1.expect)(pkg.scripts?.['test:apex']).toBeDefined();
        (0, vitest_1.expect)(pkg.scripts?.validate).toBeDefined();
    });
});
//# sourceMappingURL=apply.test.js.map