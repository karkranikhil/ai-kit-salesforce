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
const safe_write_1 = require("../safe-write");
const templates_1 = require("../templates");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-safe-write-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('writeFileSafe', () => {
    (0, vitest_1.it)('creates a new file when it does not exist', async () => {
        const filePath = path.join(tmpDir, 'new-file.md');
        const result = await (0, safe_write_1.writeFileSafe)(filePath, '# Hello');
        (0, vitest_1.expect)(result.action).toBe('create');
        (0, vitest_1.expect)(result.skipped).toBe(false);
        const content = await fs.readFile(filePath, 'utf8');
        (0, vitest_1.expect)(content).toBe('# Hello');
    });
    (0, vitest_1.it)('skips existing file when overwrite is false', async () => {
        const filePath = path.join(tmpDir, 'existing.md');
        await fs.writeFile(filePath, '# Original');
        const result = await (0, safe_write_1.writeFileSafe)(filePath, '# New Content');
        (0, vitest_1.expect)(result.action).toBe('skip');
        (0, vitest_1.expect)(result.skipped).toBe(true);
        const content = await fs.readFile(filePath, 'utf8');
        (0, vitest_1.expect)(content).toBe('# Original');
    });
    (0, vitest_1.it)('does not write in dry-run mode', async () => {
        const filePath = path.join(tmpDir, 'dry-run.md');
        const result = await (0, safe_write_1.writeFileSafe)(filePath, '# Hello', { dryRun: true });
        (0, vitest_1.expect)(result.action).toBe('create');
        const exists = await fs.pathExists(filePath);
        (0, vitest_1.expect)(exists).toBe(false);
    });
    (0, vitest_1.it)('appends marker block when file exists and markerLabel is set', async () => {
        const filePath = path.join(tmpDir, 'existing.md');
        await fs.writeFile(filePath, '# Pre-existing content\n');
        const result = await (0, safe_write_1.writeFileSafe)(filePath, 'Generated content', { markerLabel: 'ai-kit' });
        (0, vitest_1.expect)(result.action).toBe('append');
        const content = await fs.readFile(filePath, 'utf8');
        (0, vitest_1.expect)(content).toContain(templates_1.MARKER_START);
        (0, vitest_1.expect)(content).toContain(templates_1.MARKER_END);
        (0, vitest_1.expect)(content).toContain('Generated content');
        (0, vitest_1.expect)(content).toContain('# Pre-existing content');
    });
    (0, vitest_1.it)('replaces marker block content when markers already exist', async () => {
        const filePath = path.join(tmpDir, 'with-markers.md');
        await fs.writeFile(filePath, `# Existing\n\n${templates_1.MARKER_START}\nOld content\n${templates_1.MARKER_END}\n\n# After marker\n`);
        await (0, safe_write_1.writeFileSafe)(filePath, 'New generated content', { markerLabel: 'ai-kit' });
        const content = await fs.readFile(filePath, 'utf8');
        (0, vitest_1.expect)(content).toContain('New generated content');
        (0, vitest_1.expect)(content).not.toContain('Old content');
        (0, vitest_1.expect)(content).toContain('# Existing');
        (0, vitest_1.expect)(content).toContain('# After marker');
    });
    (0, vitest_1.it)('creates nested directories if needed', async () => {
        const filePath = path.join(tmpDir, 'a', 'b', 'c', 'file.md');
        await (0, safe_write_1.writeFileSafe)(filePath, '# Nested');
        const exists = await fs.pathExists(filePath);
        (0, vitest_1.expect)(exists).toBe(true);
    });
});
(0, vitest_1.describe)('appendMissingLines', () => {
    (0, vitest_1.it)('appends missing lines to an existing file', async () => {
        const filePath = path.join(tmpDir, '.forceignore');
        await fs.writeFile(filePath, '.env\nnode_modules/\n');
        const added = await (0, safe_write_1.appendMissingLines)(filePath, ['.env', '.sfdx/', 'coverage/']);
        (0, vitest_1.expect)(added).toEqual(['.sfdx/', 'coverage/']);
        const content = await fs.readFile(filePath, 'utf8');
        (0, vitest_1.expect)(content).toContain('.sfdx/');
        (0, vitest_1.expect)(content).toContain('coverage/');
    });
    (0, vitest_1.it)('creates file and adds all lines when file does not exist', async () => {
        const filePath = path.join(tmpDir, '.forceignore');
        const added = await (0, safe_write_1.appendMissingLines)(filePath, ['.env', '.sfdx/']);
        (0, vitest_1.expect)(added).toEqual(['.env', '.sfdx/']);
    });
    (0, vitest_1.it)('returns empty array when all lines already exist', async () => {
        const filePath = path.join(tmpDir, '.forceignore');
        await fs.writeFile(filePath, '.env\n.sfdx/\n');
        const added = await (0, safe_write_1.appendMissingLines)(filePath, ['.env', '.sfdx/']);
        (0, vitest_1.expect)(added).toEqual([]);
    });
});
(0, vitest_1.describe)('mergePackageJsonScripts', () => {
    (0, vitest_1.it)('adds missing scripts to package.json', async () => {
        const pkgPath = path.join(tmpDir, 'package.json');
        await fs.writeFile(pkgPath, JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }));
        const added = await (0, safe_write_1.mergePackageJsonScripts)(tmpDir, { test: 'vitest', lint: 'eslint .' });
        (0, vitest_1.expect)(added).toContain('test');
        (0, vitest_1.expect)(added).toContain('lint');
        const pkg = await fs.readJson(pkgPath);
        (0, vitest_1.expect)(pkg.scripts.test).toBe('vitest');
        (0, vitest_1.expect)(pkg.scripts.build).toBe('tsc'); // existing not overwritten
    });
    (0, vitest_1.it)('does not overwrite existing scripts', async () => {
        const pkgPath = path.join(tmpDir, 'package.json');
        await fs.writeFile(pkgPath, JSON.stringify({ scripts: { build: 'webpack' } }));
        await (0, safe_write_1.mergePackageJsonScripts)(tmpDir, { build: 'tsc' });
        const pkg = await fs.readJson(pkgPath);
        (0, vitest_1.expect)(pkg.scripts.build).toBe('webpack');
    });
    (0, vitest_1.it)('returns empty array when package.json does not exist', async () => {
        const added = await (0, safe_write_1.mergePackageJsonScripts)(tmpDir, { test: 'vitest' });
        (0, vitest_1.expect)(added).toEqual([]);
    });
});
//# sourceMappingURL=safe-write.test.js.map