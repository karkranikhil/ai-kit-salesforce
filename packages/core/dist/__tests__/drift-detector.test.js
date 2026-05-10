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
const drift_detector_1 = require("../drift-detector");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-drift-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('detectDrift', () => {
    (0, vitest_1.it)('reports file as missing when it does not exist', async () => {
        const result = await (0, drift_detector_1.detectDrift)(tmpDir, ['CLAUDE.md']);
        (0, vitest_1.expect)(result.missing).toContain('CLAUDE.md');
        (0, vitest_1.expect)(result.drifted).toHaveLength(0);
        (0, vitest_1.expect)(result.upToDate).toHaveLength(0);
    });
    (0, vitest_1.it)('marks file as up to date when all signals present', async () => {
        await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'Workflow Orchestration\nPlan Mode Default\nSelf-Improvement Loop\nVerification Before Done\ntasks/todo.md\n');
        const result = await (0, drift_detector_1.detectDrift)(tmpDir, ['CLAUDE.md']);
        (0, vitest_1.expect)(result.upToDate).toContain('CLAUDE.md');
        (0, vitest_1.expect)(result.drifted).toHaveLength(0);
    });
    (0, vitest_1.it)('marks file as drifted when signals are missing', async () => {
        await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Old CLAUDE.md\nNo modern content here.\n');
        const result = await (0, drift_detector_1.detectDrift)(tmpDir, ['CLAUDE.md']);
        (0, vitest_1.expect)(result.drifted).toHaveLength(1);
        (0, vitest_1.expect)(result.drifted[0].relativePath).toBe('CLAUDE.md');
        (0, vitest_1.expect)(result.drifted[0].missingSignals.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('handles multiple files in one call', async () => {
        await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'Workflow Orchestration\nPlan Mode Default\nSelf-Improvement Loop\nVerification Before Done\ntasks/todo.md\n');
        // AGENTS.md not created — should be missing
        const result = await (0, drift_detector_1.detectDrift)(tmpDir, ['CLAUDE.md', 'AGENTS.md']);
        (0, vitest_1.expect)(result.upToDate).toContain('CLAUDE.md');
        (0, vitest_1.expect)(result.missing).toContain('AGENTS.md');
    });
});
(0, vitest_1.describe)('checkTeamSync', () => {
    (0, vitest_1.it)('marks a file as up to date when all its signals pass', async () => {
        await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'Workflow Orchestration\nPlan Mode Default\nSelf-Improvement Loop\nVerification Before Done\ntasks/todo.md\n');
        const result = await (0, drift_detector_1.checkTeamSync)(tmpDir, {
            version: '1.0.0',
            requiredFiles: ['CLAUDE.md'],
        });
        // CLAUDE.md is up to date — it has all required signals
        (0, vitest_1.expect)(result.upToDate).toContain('CLAUDE.md');
        (0, vitest_1.expect)(result.drifted.map((d) => d.relativePath)).not.toContain('CLAUDE.md');
    });
    (0, vitest_1.it)('reports missing required files', async () => {
        const result = await (0, drift_detector_1.checkTeamSync)(tmpDir, {
            version: '1.0.0',
            requiredFiles: ['CLAUDE.md', 'AGENTS.md'],
        });
        (0, vitest_1.expect)(result.missing.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('summary includes version', async () => {
        const result = await (0, drift_detector_1.checkTeamSync)(tmpDir, {
            version: '2.5.0',
            requiredFiles: [],
        });
        (0, vitest_1.expect)(result.configVersion).toBe('2.5.0');
        (0, vitest_1.expect)(result.summary).toContain('2.5.0');
    });
});
(0, vitest_1.describe)('fetchTeamConfig', () => {
    (0, vitest_1.it)('rejects non-https URLs', async () => {
        const result = await (0, drift_detector_1.fetchTeamConfig)('http://example.com/team.json');
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('rejects invalid JSON payloads', async () => {
        const originalFetch = globalThis.fetch;
        try {
            globalThis.fetch = (async () => new Response('{"bad":"shape"}', {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }));
            const result = await (0, drift_detector_1.fetchTeamConfig)('https://example.com/team.json');
            (0, vitest_1.expect)(result).toBeNull();
        }
        finally {
            globalThis.fetch = originalFetch;
        }
    });
});
//# sourceMappingURL=drift-detector.test.js.map