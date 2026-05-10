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
const deploy_preview_1 = require("../deploy-preview");
// ─── Temp dir helpers ─────────────────────────────────────────────────────────
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-deploy-test-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
// ─── Tests ────────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('buildDeployPreview', () => {
    (0, vitest_1.it)('returns empty component lists for an empty project', async () => {
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        (0, vitest_1.expect)(result.componentsToAdd).toHaveLength(0);
        (0, vitest_1.expect)(result.componentsToModify).toHaveLength(0);
        (0, vitest_1.expect)(result.componentsToDelete).toHaveLength(0);
    });
    (0, vitest_1.it)('detects Apex classes (.cls files)', async () => {
        const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
        await fs.ensureDir(classesDir);
        await fs.writeFile(path.join(classesDir, 'AccountService.cls'), 'public with sharing class AccountService {}');
        await fs.writeFile(path.join(classesDir, 'ContactHelper.cls'), 'public with sharing class ContactHelper {}');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const apexClasses = result.componentsToAdd.filter((c) => c.type === 'ApexClass');
        (0, vitest_1.expect)(apexClasses).toHaveLength(2);
        (0, vitest_1.expect)(apexClasses.map((c) => c.name)).toContain('AccountService');
        (0, vitest_1.expect)(apexClasses.map((c) => c.name)).toContain('ContactHelper');
    });
    (0, vitest_1.it)('detects Apex triggers (.trigger files)', async () => {
        const triggersDir = path.join(tmpDir, 'force-app', 'main', 'default', 'triggers');
        await fs.ensureDir(triggersDir);
        await fs.writeFile(path.join(triggersDir, 'AccountTrigger.trigger'), 'trigger AccountTrigger on Account (before insert) {}');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const triggers = result.componentsToAdd.filter((c) => c.type === 'ApexTrigger');
        (0, vitest_1.expect)(triggers).toHaveLength(1);
        (0, vitest_1.expect)(triggers[0].name).toBe('AccountTrigger');
    });
    (0, vitest_1.it)('detects Profile metadata and adds a risk warning', async () => {
        const profilesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'profiles');
        await fs.ensureDir(profilesDir);
        await fs.writeFile(path.join(profilesDir, 'Admin.profile-meta.xml'), '<Profile></Profile>');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const profileComponents = result.componentsToAdd.filter((c) => c.type === 'Profile');
        (0, vitest_1.expect)(profileComponents.length).toBeGreaterThan(0);
        const profileRisk = result.risks.find((r) => r.toLowerCase().includes('profile'));
        (0, vitest_1.expect)(profileRisk).toBeDefined();
        (0, vitest_1.expect)(profileRisk).toContain('Permission Sets');
    });
    (0, vitest_1.it)('detects destructiveChanges.xml and adds a risk warning', async () => {
        await fs.writeFile(path.join(tmpDir, 'destructiveChanges.xml'), '<Package></Package>');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const destructiveRisk = result.risks.find((r) => r.toLowerCase().includes('destructive'));
        (0, vitest_1.expect)(destructiveRisk).toBeDefined();
        (0, vitest_1.expect)(destructiveRisk).toContain('review before deploying');
    });
    (0, vitest_1.it)('detects Flow metadata and adds a risk', async () => {
        const flowsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'flows');
        await fs.ensureDir(flowsDir);
        await fs.writeFile(path.join(flowsDir, 'My_Flow.flow-meta.xml'), '<Flow></Flow>');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const flowRisk = result.risks.find((r) => r.toLowerCase().includes('flow'));
        (0, vitest_1.expect)(flowRisk).toBeDefined();
        (0, vitest_1.expect)(flowRisk).toContain('sandbox');
    });
    (0, vitest_1.it)('marks isProduction=true for production org name', async () => {
        const result = await (0, deploy_preview_1.buildDeployPreview)({
            rootPath: tmpDir,
            targetOrg: 'production',
        });
        (0, vitest_1.expect)(result.isProduction).toBe(true);
        const prodRisk = result.risks.find((r) => r.includes('production'));
        (0, vitest_1.expect)(prodRisk).toBeDefined();
    });
    (0, vitest_1.it)('marks isProduction=false for sandbox org name', async () => {
        const result = await (0, deploy_preview_1.buildDeployPreview)({
            rootPath: tmpDir,
            targetOrg: 'my-sandbox',
        });
        (0, vitest_1.expect)(result.isProduction).toBe(false);
    });
    (0, vitest_1.it)('includes correct validation and deploy commands', async () => {
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        (0, vitest_1.expect)(result.validationCommand).toContain('sf project deploy validate');
        (0, vitest_1.expect)(result.validationCommand).toContain("'force-app'");
        (0, vitest_1.expect)(result.validationCommand).toContain('RunLocalTests');
        (0, vitest_1.expect)(result.deployCommand).toContain('sf project deploy start');
        (0, vitest_1.expect)(result.deployCommand).toContain("'force-app'");
        (0, vitest_1.expect)(result.deployCommand).toContain('RunLocalTests');
    });
    (0, vitest_1.it)('rejects unsafe sourceDir values', async () => {
        await (0, vitest_1.expect)((0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir, sourceDir: '../force-app' })).rejects.toThrow('Invalid sourceDir');
    });
});
(0, vitest_1.describe)('formatDeployPreview', () => {
    (0, vitest_1.it)('returns a non-empty markdown string', async () => {
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const formatted = (0, deploy_preview_1.formatDeployPreview)(result);
        (0, vitest_1.expect)(formatted).toBeTruthy();
        (0, vitest_1.expect)(formatted.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(formatted).toContain('# Deploy Preview');
    });
    (0, vitest_1.it)('includes component information in the output', async () => {
        const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
        await fs.ensureDir(classesDir);
        await fs.writeFile(path.join(classesDir, 'MyClass.cls'), 'public class MyClass {}');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const formatted = (0, deploy_preview_1.formatDeployPreview)(result);
        (0, vitest_1.expect)(formatted).toContain('MyClass');
        (0, vitest_1.expect)(formatted).toContain('ApexClass');
    });
    (0, vitest_1.it)('includes risk warnings in the output', async () => {
        const profilesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'profiles');
        await fs.ensureDir(profilesDir);
        await fs.writeFile(path.join(profilesDir, 'Admin.profile-meta.xml'), '<Profile></Profile>');
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const formatted = (0, deploy_preview_1.formatDeployPreview)(result);
        (0, vitest_1.expect)(formatted).toContain('## Risks');
        (0, vitest_1.expect)(formatted).toContain('Profile');
    });
    (0, vitest_1.it)('includes deploy commands in the output', async () => {
        const result = await (0, deploy_preview_1.buildDeployPreview)({ rootPath: tmpDir });
        const formatted = (0, deploy_preview_1.formatDeployPreview)(result);
        (0, vitest_1.expect)(formatted).toContain('## Commands');
        (0, vitest_1.expect)(formatted).toContain('sf project deploy');
    });
});
//# sourceMappingURL=deploy-preview.test.js.map