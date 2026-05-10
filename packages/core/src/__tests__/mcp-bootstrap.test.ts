import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { buildMcpConfig, bootstrapMcp, validateMcpConfig } from '../mcp-bootstrap';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-mcp-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('buildMcpConfig', () => {
  it('generates correct args array with separate flag/value items', () => {
    const config = buildMcpConfig({ orgAlias: 'my-sandbox' });
    const args = config.mcpServers['Salesforce DX'].args;
    // --orgs and my-sandbox must be separate items
    const orgsIdx = args.indexOf('--orgs');
    expect(orgsIdx).toBeGreaterThan(-1);
    expect(args[orgsIdx + 1]).toBe('my-sandbox');
  });

  it('includes --allow-non-ga-tools by default', () => {
    const config = buildMcpConfig({ orgAlias: 'test-org' });
    expect(config.mcpServers['Salesforce DX'].args).toContain('--allow-non-ga-tools');
  });

  it('uses custom toolsets when provided', () => {
    const config = buildMcpConfig({ orgAlias: 'test-org', toolsets: ['orgs', 'metadata'] });
    const args = config.mcpServers['Salesforce DX'].args;
    const toolsetsIdx = args.indexOf('--toolsets');
    expect(args[toolsetsIdx + 1]).toBe('orgs,metadata');
  });
});

describe('bootstrapMcp', () => {
  it('creates both .cursor/mcp.json and .mcp.json', async () => {
    await bootstrapMcp(tmpDir, { orgAlias: 'my-sandbox' });
    expect(await fs.pathExists(path.join(tmpDir, '.cursor', 'mcp.json'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.mcp.json'))).toBe(true);
  });

  it('does not overwrite existing files', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor'));
    await fs.writeFile(path.join(tmpDir, '.cursor', 'mcp.json'), '{"existing":true}');
    const result = await bootstrapMcp(tmpDir, { orgAlias: 'my-sandbox' });
    expect(result.alreadyExisted.cursor).toBe(true);
    const content = await fs.readFile(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf8');
    expect(content).toBe('{"existing":true}');
  });

  it('returns correct alreadyExisted flags', async () => {
    const result1 = await bootstrapMcp(tmpDir, { orgAlias: 'my-sandbox' });
    expect(result1.alreadyExisted.cursor).toBe(false);
    expect(result1.alreadyExisted.claude).toBe(false);
  });
});

describe('validateMcpConfig', () => {
  it('returns valid for correct config', async () => {
    const config = buildMcpConfig({ orgAlias: 'my-sandbox' });
    const configPath = path.join(tmpDir, 'mcp.json');
    await fs.writeFile(configPath, JSON.stringify(config));
    const result = await validateMcpConfig(configPath);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags DEFAULT_TARGET_ORG placeholder', async () => {
    const config = buildMcpConfig({ orgAlias: 'DEFAULT_TARGET_ORG' });
    const configPath = path.join(tmpDir, 'mcp.json');
    await fs.writeFile(configPath, JSON.stringify(config));
    const result = await validateMcpConfig(configPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('DEFAULT_TARGET_ORG'))).toBe(true);
  });

  it('returns invalid for non-existent file', async () => {
    const result = await validateMcpConfig(path.join(tmpDir, 'does-not-exist.json'));
    expect(result.valid).toBe(false);
  });

  it('flags args combined into one string', async () => {
    const bad = { mcpServers: { 'SF': { command: 'npx', args: ['-y @salesforce/mcp --orgs my-org --toolsets orgs'] } } };
    const configPath = path.join(tmpDir, 'bad-mcp.json');
    await fs.writeFile(configPath, JSON.stringify(bad));
    const result = await validateMcpConfig(configPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('combined'))).toBe(true);
  });
});
