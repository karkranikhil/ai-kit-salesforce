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
const backup_1 = require("../backup");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-backup-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('createBackup', () => {
    (0, vitest_1.it)('creates backup of existing files', async () => {
        const file1 = path.join(tmpDir, 'CLAUDE.md');
        await fs.writeFile(file1, '# Claude');
        const backupDir = await (0, backup_1.createBackup)(tmpDir, [file1]);
        const backupFile = path.join(backupDir, 'CLAUDE.md.bak');
        const exists = await fs.pathExists(backupFile);
        (0, vitest_1.expect)(exists).toBe(true);
        const content = await fs.readFile(backupFile, 'utf8');
        (0, vitest_1.expect)(content).toBe('# Claude');
    });
    (0, vitest_1.it)('skips non-existent files gracefully', async () => {
        const nonExistent = path.join(tmpDir, 'does-not-exist.md');
        const backupDir = await (0, backup_1.createBackup)(tmpDir, [nonExistent]);
        const backupFile = path.join(backupDir, 'does-not-exist.md.bak');
        const exists = await fs.pathExists(backupFile);
        (0, vitest_1.expect)(exists).toBe(false);
    });
    (0, vitest_1.it)('creates backup directory with timestamp format', async () => {
        await (0, backup_1.createBackup)(tmpDir, []);
        const backupBase = path.join(tmpDir, '.ai-kit-salesforce-backup');
        const entries = await fs.readdir(backupBase);
        (0, vitest_1.expect)(entries.length).toBe(1);
        (0, vitest_1.expect)(entries[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}$/);
    });
    (0, vitest_1.it)('preserves nested file structure in backup', async () => {
        const nested = path.join(tmpDir, 'docs', 'security.md');
        await fs.ensureDir(path.dirname(nested));
        await fs.writeFile(nested, '# Security');
        const backupDir = await (0, backup_1.createBackup)(tmpDir, [nested]);
        const backupFile = path.join(backupDir, 'docs', 'security.md.bak');
        const exists = await fs.pathExists(backupFile);
        (0, vitest_1.expect)(exists).toBe(true);
    });
});
//# sourceMappingURL=backup.test.js.map