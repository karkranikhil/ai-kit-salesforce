import * as fs from 'fs-extra';
import * as path from 'path';

export interface OrgContext {
  defaultOrg?: string;
  targetOrg?: string;
  /** Which file provided the org info */
  source: 'sfdx-project' | 'sf-config' | 'sfdx-config' | 'none';
}

async function readJsonSafe(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readOrgContext(rootPath: string): Promise<OrgContext> {
  const p = (...parts: string[]) => path.join(rootPath, ...parts);

  // 1. .sf/config.json — modern SF CLI auth
  const sfConfig = await readJsonSafe(p('.sf', 'config.json'));
  if (sfConfig) {
    const target = sfConfig['target-org'] as string | undefined;
    const defaultOrg = sfConfig['target-org'] as string | undefined;
    if (target || defaultOrg) {
      return { defaultOrg: defaultOrg ?? target, targetOrg: target, source: 'sf-config' };
    }
  }

  // 2. sfdx-project.json — may carry defaultOrg key
  const sfdxProject = await readJsonSafe(p('sfdx-project.json'));
  if (sfdxProject) {
    const defaultOrg = sfdxProject['defaultOrg'] as string | undefined;
    if (defaultOrg) {
      return { defaultOrg, source: 'sfdx-project' };
    }
  }

  // 3. .sfdx/sfdx-config.json — legacy
  const sfdxConfig = await readJsonSafe(p('.sfdx', 'sfdx-config.json'));
  if (sfdxConfig) {
    const defaultusername = sfdxConfig['defaultusername'] as string | undefined;
    if (defaultusername) {
      return { defaultOrg: defaultusername, source: 'sfdx-config' };
    }
  }

  return { source: 'none' };
}

export function formatOrgContext(ctx: OrgContext): string {
  if (ctx.targetOrg) return ctx.targetOrg;
  if (ctx.defaultOrg) return ctx.defaultOrg;
  return 'unknown';
}
