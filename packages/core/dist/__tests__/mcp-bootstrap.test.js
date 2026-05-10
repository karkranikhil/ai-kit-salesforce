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
const mcp_bootstrap_1 = require("../mcp-bootstrap");
let tmpDir;
(0, vitest_1.beforeEach)(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-mcp-'));
});
(0, vitest_1.afterEach)(async () => {
    await fs.remove(tmpDir);
});
(0, vitest_1.describe)('buildMcpConfig', () => {
    (0, vitest_1.it)('generates correct args array with separate flag/value items', () => {
        const config = (0, mcp_bootstrap_1.buildMcpConfig)({ orgAlias: 'my-sandbox' });
        const args = config.mcpServers['Salesforce DX'].args;
        // --orgs and my-sandbox must be separate items
        const orgsIdx = args.indexOf('--orgs');
        (0, vitest_1.expect)(orgsIdx).toBeGreaterThan(-1);
        (0, vitest_1.expect)(args[orgsIdx + 1]).toBe('my-sandbox');
    });
    (0, vitest_1.it)('includes --allow-non-ga-tools by default', () => {
        const config = (0, mcp_bootstrap_1.buildMcpConfig)({ orgAlias: 'test-org' });
        (0, vitest_1.expect)(config.mcpServers['Salesforce DX'].args).toContain('--allow-non-ga-tools');
    });
    (0, vitest_1.it)('uses custom toolsets when provided', () => {
        const config = (0, mcp_bootstrap_1.buildMcpConfig)({ orgAlias: 'test-org', toolsets: ['orgs', 'metadata'] });
        const args = config.mcpServers['Salesforce DX'].args;
        const toolsetsIdx = args.indexOf('--toolsets');
        (0, vitest_1.expect)(args[toolsetsIdx + 1]).toBe('orgs,metadata');
    });
});
(0, vitest_1.describe)('bootstrapMcp', () => {
    (0, vitest_1.it)('creates both .cursor/mcp.json and .mcp.json', async () => {
        await (0, mcp_bootstrap_1.bootstrapMcp)(tmpDir, { orgAlias: 'my-sandbox' });
        (0, vitest_1.expect)(await fs.pathExists(path.join(tmpDir, '.cursor', 'mcp.json'))).toBe(true);
        (0, vitest_1.expect)(await fs.pathExists(path.join(tmpDir, '.mcp.json'))).toBe(true);
    });
    (0, vitest_1.it)('does not overwrite existing files', async () => {
        await fs.ensureDir(path.join(tmpDir, '.cursor'));
        await fs.writeFile(path.join(tmpDir, '.cursor', 'mcp.json'), '{"existing":true}');
        const result = await (0, mcp_bootstrap_1.bootstrapMcp)(tmpDir, { orgAlias: 'my-sandbox' });
        (0, vitest_1.expect)(result.alreadyExisted.cursor).toBe(true);
        const content = await fs.readFile(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf8');
        (0, vitest_1.expect)(content).toBe('{"existing":true}');
    });
    (0, vitest_1.it)('returns correct alreadyExisted flags', async () => {
        const result1 = await (0, mcp_bootstrap_1.bootstrapMcp)(tmpDir, { orgAlias: 'my-sandbox' });
        (0, vitest_1.expect)(result1.alreadyExisted.cursor).toBe(false);
        (0, vitest_1.expect)(result1.alreadyExisted.claude).toBe(false);
    });
});
(0, vitest_1.describe)('validateMcpConfig', () => {
    (0, vitest_1.it)('returns valid for correct config', async () => {
        const config = (0, mcp_bootstrap_1.buildMcpConfig)({ orgAlias: 'my-sandbox' });
        const configPath = path.join(tmpDir, 'mcp.json');
        await fs.writeFile(configPath, JSON.stringify(config));
        const result = await (0, mcp_bootstrap_1.validateMcpConfig)(configPath);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.issues).toHaveLength(0);
    });
    (0, vitest_1.it)('flags DEFAULT_TARGET_ORG placeholder', async () => {
        const config = (0, mcp_bootstrap_1.buildMcpConfig)({ orgAlias: 'DEFAULT_TARGET_ORG' });
        const configPath = path.join(tmpDir, 'mcp.json');
        await fs.writeFile(configPath, JSON.stringify(config));
        const result = await (0, mcp_bootstrap_1.validateMcpConfig)(configPath);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.issues.some((i) => i.includes('DEFAULT_TARGET_ORG'))).toBe(true);
    });
    (0, vitest_1.it)('returns invalid for non-existent file', async () => {
        const result = await (0, mcp_bootstrap_1.validateMcpConfig)(path.join(tmpDir, 'does-not-exist.json'));
        (0, vitest_1.expect)(result.valid).toBe(false);
    });
    (0, vitest_1.it)('flags args combined into one string', async () => {
        const bad = { mcpServers: { 'SF': { command: 'npx', args: ['-y @salesforce/mcp --orgs my-org --toolsets orgs'] } } };
        const configPath = path.join(tmpDir, 'bad-mcp.json');
        await fs.writeFile(configPath, JSON.stringify(bad));
        const result = await (0, mcp_bootstrap_1.validateMcpConfig)(configPath);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.issues.some((i) => i.includes('combined'))).toBe(true);
    });
});
//# sourceMappingURL=mcp-bootstrap.test.js.map