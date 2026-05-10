import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { buildDeployPreview, formatDeployPreview } from '../deploy-preview';

// ─── Temp dir helpers ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-deploy-test-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildDeployPreview', () => {
  it('returns empty component lists for an empty project', async () => {
    const result = await buildDeployPreview({ rootPath: tmpDir });

    expect(result.componentsToAdd).toHaveLength(0);
    expect(result.componentsToModify).toHaveLength(0);
    expect(result.componentsToDelete).toHaveLength(0);
  });

  it('detects Apex classes (.cls files)', async () => {
    const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
    await fs.ensureDir(classesDir);
    await fs.writeFile(path.join(classesDir, 'AccountService.cls'), 'public with sharing class AccountService {}');
    await fs.writeFile(path.join(classesDir, 'ContactHelper.cls'), 'public with sharing class ContactHelper {}');

    const result = await buildDeployPreview({ rootPath: tmpDir });

    const apexClasses = result.componentsToAdd.filter((c) => c.type === 'ApexClass');
    expect(apexClasses).toHaveLength(2);
    expect(apexClasses.map((c) => c.name)).toContain('AccountService');
    expect(apexClasses.map((c) => c.name)).toContain('ContactHelper');
  });

  it('detects Apex triggers (.trigger files)', async () => {
    const triggersDir = path.join(tmpDir, 'force-app', 'main', 'default', 'triggers');
    await fs.ensureDir(triggersDir);
    await fs.writeFile(path.join(triggersDir, 'AccountTrigger.trigger'), 'trigger AccountTrigger on Account (before insert) {}');

    const result = await buildDeployPreview({ rootPath: tmpDir });

    const triggers = result.componentsToAdd.filter((c) => c.type === 'ApexTrigger');
    expect(triggers).toHaveLength(1);
    expect(triggers[0].name).toBe('AccountTrigger');
  });

  it('detects Profile metadata and adds a risk warning', async () => {
    const profilesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'profiles');
    await fs.ensureDir(profilesDir);
    await fs.writeFile(
      path.join(profilesDir, 'Admin.profile-meta.xml'),
      '<Profile></Profile>'
    );

    const result = await buildDeployPreview({ rootPath: tmpDir });

    const profileComponents = result.componentsToAdd.filter((c) => c.type === 'Profile');
    expect(profileComponents.length).toBeGreaterThan(0);

    const profileRisk = result.risks.find((r) => r.toLowerCase().includes('profile'));
    expect(profileRisk).toBeDefined();
    expect(profileRisk).toContain('Permission Sets');
  });

  it('detects destructiveChanges.xml and adds a risk warning', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'destructiveChanges.xml'),
      '<Package></Package>'
    );

    const result = await buildDeployPreview({ rootPath: tmpDir });

    const destructiveRisk = result.risks.find((r) => r.toLowerCase().includes('destructive'));
    expect(destructiveRisk).toBeDefined();
    expect(destructiveRisk).toContain('review before deploying');
  });

  it('detects Flow metadata and adds a risk', async () => {
    const flowsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'flows');
    await fs.ensureDir(flowsDir);
    await fs.writeFile(
      path.join(flowsDir, 'My_Flow.flow-meta.xml'),
      '<Flow></Flow>'
    );

    const result = await buildDeployPreview({ rootPath: tmpDir });

    const flowRisk = result.risks.find((r) => r.toLowerCase().includes('flow'));
    expect(flowRisk).toBeDefined();
    expect(flowRisk).toContain('sandbox');
  });

  it('marks isProduction=true for production org name', async () => {
    const result = await buildDeployPreview({
      rootPath: tmpDir,
      targetOrg: 'production',
    });

    expect(result.isProduction).toBe(true);
    const prodRisk = result.risks.find((r) => r.includes('production'));
    expect(prodRisk).toBeDefined();
  });

  it('marks isProduction=false for sandbox org name', async () => {
    const result = await buildDeployPreview({
      rootPath: tmpDir,
      targetOrg: 'my-sandbox',
    });

    expect(result.isProduction).toBe(false);
  });

  it('includes correct validation and deploy commands', async () => {
    const result = await buildDeployPreview({ rootPath: tmpDir });

    expect(result.validationCommand).toContain('sf project deploy validate');
    expect(result.validationCommand).toContain('RunLocalTests');
    expect(result.deployCommand).toContain('sf project deploy start');
    expect(result.deployCommand).toContain('RunLocalTests');
  });
});

describe('formatDeployPreview', () => {
  it('returns a non-empty markdown string', async () => {
    const result = await buildDeployPreview({ rootPath: tmpDir });
    const formatted = formatDeployPreview(result);

    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toContain('# Deploy Preview');
  });

  it('includes component information in the output', async () => {
    const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
    await fs.ensureDir(classesDir);
    await fs.writeFile(path.join(classesDir, 'MyClass.cls'), 'public class MyClass {}');

    const result = await buildDeployPreview({ rootPath: tmpDir });
    const formatted = formatDeployPreview(result);

    expect(formatted).toContain('MyClass');
    expect(formatted).toContain('ApexClass');
  });

  it('includes risk warnings in the output', async () => {
    const profilesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'profiles');
    await fs.ensureDir(profilesDir);
    await fs.writeFile(path.join(profilesDir, 'Admin.profile-meta.xml'), '<Profile></Profile>');

    const result = await buildDeployPreview({ rootPath: tmpDir });
    const formatted = formatDeployPreview(result);

    expect(formatted).toContain('## Risks');
    expect(formatted).toContain('Profile');
  });

  it('includes deploy commands in the output', async () => {
    const result = await buildDeployPreview({ rootPath: tmpDir });
    const formatted = formatDeployPreview(result);

    expect(formatted).toContain('## Commands');
    expect(formatted).toContain('sf project deploy');
  });
});
