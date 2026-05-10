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
const org_context_1 = require("../org-context");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-org-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('readOrgContext', () => {
    (0, vitest_1.it)('returns none when no config present', async () => {
        const ctx = await (0, org_context_1.readOrgContext)(tmpDir);
        (0, vitest_1.expect)(ctx.source).toBe('none');
        (0, vitest_1.expect)(ctx.defaultOrg).toBeUndefined();
    });
    (0, vitest_1.it)('reads org from .sf/config.json', async () => {
        await fs.ensureDir(path.join(tmpDir, '.sf'));
        await fs.writeJson(path.join(tmpDir, '.sf', 'config.json'), { 'target-org': 'my-scratch-org' });
        const ctx = await (0, org_context_1.readOrgContext)(tmpDir);
        (0, vitest_1.expect)(ctx.source).toBe('sf-config');
        (0, vitest_1.expect)(ctx.defaultOrg).toBe('my-scratch-org');
    });
    (0, vitest_1.it)('reads org from sfdx-project.json defaultOrg field', async () => {
        await fs.writeJson(path.join(tmpDir, 'sfdx-project.json'), { defaultOrg: 'project-sandbox' });
        const ctx = await (0, org_context_1.readOrgContext)(tmpDir);
        (0, vitest_1.expect)(ctx.source).toBe('sfdx-project');
        (0, vitest_1.expect)(ctx.defaultOrg).toBe('project-sandbox');
    });
    (0, vitest_1.it)('reads org from .sfdx/sfdx-config.json', async () => {
        await fs.ensureDir(path.join(tmpDir, '.sfdx'));
        await fs.writeJson(path.join(tmpDir, '.sfdx', 'sfdx-config.json'), { defaultusername: 'legacy-org' });
        const ctx = await (0, org_context_1.readOrgContext)(tmpDir);
        (0, vitest_1.expect)(ctx.source).toBe('sfdx-config');
        (0, vitest_1.expect)(ctx.defaultOrg).toBe('legacy-org');
    });
    (0, vitest_1.it)('prefers .sf/config.json over sfdx-project.json', async () => {
        await fs.ensureDir(path.join(tmpDir, '.sf'));
        await fs.writeJson(path.join(tmpDir, '.sf', 'config.json'), { 'target-org': 'sf-org' });
        await fs.writeJson(path.join(tmpDir, 'sfdx-project.json'), { defaultOrg: 'sfdx-org' });
        const ctx = await (0, org_context_1.readOrgContext)(tmpDir);
        (0, vitest_1.expect)(ctx.source).toBe('sf-config');
        (0, vitest_1.expect)(ctx.defaultOrg).toBe('sf-org');
    });
});
//# sourceMappingURL=org-context.test.js.map