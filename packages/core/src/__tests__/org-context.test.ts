import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { readOrgContext } from '../org-context';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-org-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('readOrgContext', () => {
  it('returns none when no config present', async () => {
    const ctx = await readOrgContext(tmpDir);
    expect(ctx.source).toBe('none');
    expect(ctx.defaultOrg).toBeUndefined();
  });

  it('reads org from .sf/config.json', async () => {
    await fs.ensureDir(path.join(tmpDir, '.sf'));
    await fs.writeJson(path.join(tmpDir, '.sf', 'config.json'), { 'target-org': 'my-scratch-org' });
    const ctx = await readOrgContext(tmpDir);
    expect(ctx.source).toBe('sf-config');
    expect(ctx.defaultOrg).toBe('my-scratch-org');
  });

  it('reads org from sfdx-project.json defaultOrg field', async () => {
    await fs.writeJson(path.join(tmpDir, 'sfdx-project.json'), { defaultOrg: 'project-sandbox' });
    const ctx = await readOrgContext(tmpDir);
    expect(ctx.source).toBe('sfdx-project');
    expect(ctx.defaultOrg).toBe('project-sandbox');
  });

  it('reads org from .sfdx/sfdx-config.json', async () => {
    await fs.ensureDir(path.join(tmpDir, '.sfdx'));
    await fs.writeJson(path.join(tmpDir, '.sfdx', 'sfdx-config.json'), { defaultusername: 'legacy-org' });
    const ctx = await readOrgContext(tmpDir);
    expect(ctx.source).toBe('sfdx-config');
    expect(ctx.defaultOrg).toBe('legacy-org');
  });

  it('prefers .sf/config.json over sfdx-project.json', async () => {
    await fs.ensureDir(path.join(tmpDir, '.sf'));
    await fs.writeJson(path.join(tmpDir, '.sf', 'config.json'), { 'target-org': 'sf-org' });
    await fs.writeJson(path.join(tmpDir, 'sfdx-project.json'), { defaultOrg: 'sfdx-org' });
    const ctx = await readOrgContext(tmpDir);
    expect(ctx.source).toBe('sf-config');
    expect(ctx.defaultOrg).toBe('sf-org');
  });
});
