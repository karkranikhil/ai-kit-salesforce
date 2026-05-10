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
const scanner_1 = require("../scanner");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-test-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('scanProject', () => {
    (0, vitest_1.it)('detects a Salesforce DX project', async () => {
        await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.isSalesforceDx).toBe(true);
    });
    (0, vitest_1.it)('returns isSalesforceDx false when sfdx-project.json missing', async () => {
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.isSalesforceDx).toBe(false);
    });
    (0, vitest_1.it)('detects force-app directory', async () => {
        await fs.ensureDir(path.join(tmpDir, 'force-app'));
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasForceApp).toBe(true);
    });
    (0, vitest_1.it)('detects missing AGENTS.md', async () => {
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasAgentsMd).toBe(false);
        (0, vitest_1.expect)(result.missing).toContain('AGENTS.md');
    });
    (0, vitest_1.it)('detects existing AGENTS.md', async () => {
        await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasAgentsMd).toBe(true);
        (0, vitest_1.expect)(result.missing).not.toContain('AGENTS.md');
    });
    (0, vitest_1.it)('detects cursor rules directory', async () => {
        await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasCursorRules).toBe(true);
    });
    (0, vitest_1.it)('detects cursor skills directory and marks hasAfvSkills true', async () => {
        await fs.ensureDir(path.join(tmpDir, '.cursor', 'skills'));
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasCursorSkills).toBe(true);
        (0, vitest_1.expect)(result.hasAfvSkills).toBe(true);
    });
    (0, vitest_1.it)('calculates readiness score 0 for empty project', async () => {
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.score).toBe(0);
    });
    (0, vitest_1.it)('calculates score 38 for project with sfdx, force-app, AGENTS.md', async () => {
        // sfdx=20, force-app=10, AGENTS.md=8 (score changed from 10 to 8 for CLAUDE.md,
        // with 4 pts moved to project.mdc; AGENTS.md stays at 10)
        await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
        await fs.ensureDir(path.join(tmpDir, 'force-app'));
        await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.score).toBe(40); // 20 + 10 + 10
    });
    (0, vitest_1.it)('detects hasPackageJson', async () => {
        await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasPackageJson).toBe(true);
    });
    (0, vitest_1.it)('detects .forceignore', async () => {
        await fs.writeFile(path.join(tmpDir, '.forceignore'), '');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasForceIgnore).toBe(true);
    });
    (0, vitest_1.it)('detects AFV library docs', async () => {
        await fs.ensureDir(path.join(tmpDir, 'docs'));
        await fs.writeFile(path.join(tmpDir, 'docs', 'afv-library.md'), '# AFV');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasAfvLibraryDocs).toBe(true);
    });
    (0, vitest_1.it)('detects AFV library skills by folder name', async () => {
        await fs.ensureDir(path.join(tmpDir, '.cursor', 'skills', 'agentforce'));
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasAfvLibrarySkills).toBe(true);
    });
    (0, vitest_1.it)('detects tasks/todo.md', async () => {
        await fs.ensureDir(path.join(tmpDir, 'tasks'));
        await fs.writeFile(path.join(tmpDir, 'tasks', 'todo.md'), '# Tasks');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasTasksTodo).toBe(true);
    });
    (0, vitest_1.it)('detects tasks/lessons.md', async () => {
        await fs.ensureDir(path.join(tmpDir, 'tasks'));
        await fs.writeFile(path.join(tmpDir, 'tasks', 'lessons.md'), '# Lessons');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasTasksLessons).toBe(true);
    });
    (0, vitest_1.it)('reports tasks/todo.md and tasks/lessons.md as missing when absent', async () => {
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasTasksTodo).toBe(false);
        (0, vitest_1.expect)(result.hasTasksLessons).toBe(false);
        (0, vitest_1.expect)(result.missing).toContain('tasks/todo.md');
        (0, vitest_1.expect)(result.missing).toContain('tasks/lessons.md');
    });
    (0, vitest_1.it)('detects .cursor/rules/project.mdc', async () => {
        await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
        await fs.writeFile(path.join(tmpDir, '.cursor', 'rules', 'project.mdc'), '---\n---\n# Rules');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasCursorProjectRule).toBe(true);
    });
    (0, vitest_1.it)('reports .cursor/rules/project.mdc as missing when absent', async () => {
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.hasCursorProjectRule).toBe(false);
        const missingEntry = result.missing.find((m) => m.includes('project.mdc'));
        (0, vitest_1.expect)(missingEntry).toBeDefined();
    });
    (0, vitest_1.it)('task management contributes to score', async () => {
        await fs.writeFile(path.join(tmpDir, 'sfdx-project.json'), '{}');
        await fs.ensureDir(path.join(tmpDir, 'tasks'));
        await fs.writeFile(path.join(tmpDir, 'tasks', 'todo.md'), '# Tasks');
        await fs.writeFile(path.join(tmpDir, 'tasks', 'lessons.md'), '# Lessons');
        const result = await (0, scanner_1.scanProject)(tmpDir);
        // sfdx=20, tasks=6
        (0, vitest_1.expect)(result.score).toBe(26);
    });
    (0, vitest_1.it)('includes recommendations when items are missing', async () => {
        const result = await (0, scanner_1.scanProject)(tmpDir);
        (0, vitest_1.expect)(result.recommendations.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=scanner.test.js.map