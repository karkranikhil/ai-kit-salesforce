/**
 * Org-aware deploy diff preview.
 * Walks the source directory, classifies components by file extension/name,
 * reads org context, and assembles a deploy preview report.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { readOrgContext } from './org-context';

export interface DeployPreviewOptions {
  rootPath: string;
  targetOrg?: string;
  /** defaults to 'force-app' */
  sourceDir?: string;
}

export interface DeployPreviewResult {
  targetOrg: string;
  isProduction: boolean;
  componentsToAdd: ComponentInfo[];
  componentsToModify: ComponentInfo[];
  componentsToDelete: ComponentInfo[];
  risks: string[];
  validationCommand: string;
  deployCommand: string;
}

export interface ComponentInfo {
  name: string;
  /** ApexClass, ApexTrigger, LightningComponentBundle, Flow, PermissionSet, Profile, etc. */
  type: string;
  filePath: string;
}

// ─── File extension → component type mapping ──────────────────────────────

function classifyFile(filePath: string, relativePath: string): ComponentInfo | null {
  const basename = path.basename(filePath);
  const name = basename.replace(/\.[^.]+$/, '').replace(/\.[^.]+$/, ''); // strip double extension

  if (basename.endsWith('.cls')) {
    return { name: basename.replace('.cls', ''), type: 'ApexClass', filePath: relativePath };
  }
  if (basename.endsWith('.trigger')) {
    return { name: basename.replace('.trigger', ''), type: 'ApexTrigger', filePath: relativePath };
  }
  if (basename.endsWith('.js') && filePath.includes(`${path.sep}lwc${path.sep}`)) {
    // Only count the component folder once — use the JS file as the representative
    const parts = filePath.split(path.sep);
    const lwcIdx = parts.lastIndexOf('lwc');
    const compName = lwcIdx !== -1 ? parts[lwcIdx + 1] : name;
    // Only emit for the main component JS (same name as folder)
    if (basename === `${compName}.js`) {
      return { name: compName, type: 'LightningComponentBundle', filePath: relativePath };
    }
    return null;
  }
  if (basename.endsWith('.flow-meta.xml')) {
    return { name: basename.replace('.flow-meta.xml', ''), type: 'Flow', filePath: relativePath };
  }
  if (basename.endsWith('-meta.xml')) {
    if (basename.toLowerCase().includes('permissionset')) {
      return { name: basename.replace('-meta.xml', ''), type: 'PermissionSet', filePath: relativePath };
    }
    if (basename.toLowerCase().includes('profile')) {
      return { name: basename.replace('-meta.xml', ''), type: 'Profile', filePath: relativePath };
    }
  }
  // Fall-through — check parent directory name conventions for meta.xml files
  if (basename.endsWith('.permissionset-meta.xml')) {
    return { name: basename.replace('.permissionset-meta.xml', ''), type: 'PermissionSet', filePath: relativePath };
  }
  if (basename.endsWith('.profile-meta.xml')) {
    return { name: basename.replace('.profile-meta.xml', ''), type: 'Profile', filePath: relativePath };
  }

  return null;
}

async function walkDir(dir: string, rootPath: string): Promise<ComponentInfo[]> {
  const components: ComponentInfo[] = [];
  if (!(await fs.pathExists(dir))) return components;

  async function recurse(current: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await recurse(fullPath);
      } else {
        const relativePath = path.relative(rootPath, fullPath);
        const component = classifyFile(fullPath, relativePath);
        if (component) {
          components.push(component);
        }
      }
    }
  }

  await recurse(dir);
  return components;
}

async function hasDestructiveChanges(rootPath: string): Promise<boolean> {
  // Check common locations for destructiveChanges.xml
  const candidates = [
    path.join(rootPath, 'destructiveChanges.xml'),
    path.join(rootPath, 'force-app', 'destructiveChanges.xml'),
    path.join(rootPath, 'manifest', 'destructiveChanges.xml'),
    path.join(rootPath, 'destructiveChangesPre.xml'),
    path.join(rootPath, 'destructiveChangesPost.xml'),
  ];
  const results = await Promise.all(candidates.map((c) => fs.pathExists(c)));
  return results.some(Boolean);
}

/**
 * Build a deploy preview for the given project root.
 * All found components are treated as "to add" (we don't have org-side state without auth).
 */
export async function buildDeployPreview(options: DeployPreviewOptions): Promise<DeployPreviewResult> {
  const { rootPath, sourceDir = 'force-app' } = options;
  const sourceDirPath = path.join(rootPath, sourceDir);

  // Resolve org context
  const orgCtx = await readOrgContext(rootPath);
  const resolvedOrg = options.targetOrg ?? orgCtx.defaultOrg ?? orgCtx.targetOrg ?? 'unknown';

  const lowerOrg = resolvedOrg.toLowerCase();
  const isProduction =
    lowerOrg === 'production' ||
    lowerOrg === 'prod' ||
    lowerOrg.includes('production') ||
    lowerOrg.includes('prod');

  // Walk source directory
  const components = await walkDir(sourceDirPath, rootPath);

  const risks: string[] = [];

  // Profile detection
  const hasProfiles = components.some((c) => c.type === 'Profile');
  if (hasProfiles) {
    risks.push('Profile metadata detected — consider using Permission Sets instead');
  }

  // Destructive changes detection
  const hasDestructive = await hasDestructiveChanges(rootPath);
  if (hasDestructive) {
    risks.push('Destructive changes file found — review before deploying');
  }

  // Flow detection
  const hasFlows = components.some((c) => c.type === 'Flow');
  if (hasFlows) {
    risks.push('Flow metadata included — test in sandbox first');
  }

  // Production warning
  if (isProduction) {
    risks.push('⚠ Target org appears to be production — explicit confirmation required');
  }

  const validationCommand = `sf project deploy validate --source-dir ${sourceDir} --test-level RunLocalTests --wait 60`;
  const deployCommand = `sf project deploy start --source-dir ${sourceDir} --test-level RunLocalTests --wait 60`;

  return {
    targetOrg: resolvedOrg,
    isProduction,
    componentsToAdd: components,
    componentsToModify: [],
    componentsToDelete: [],
    risks,
    validationCommand,
    deployCommand,
  };
}

/**
 * Returns a markdown-formatted string suitable for a VS Code webview.
 */
export function formatDeployPreview(result: DeployPreviewResult): string {
  const lines: string[] = [];

  lines.push('# Deploy Preview');
  lines.push('');
  lines.push(`**Target Org:** ${result.targetOrg}${result.isProduction ? ' ⚠ (PRODUCTION)' : ''}`);
  lines.push('');

  // Component counts by type
  const byType = new Map<string, number>();
  for (const c of result.componentsToAdd) {
    byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
  }
  for (const c of result.componentsToModify) {
    byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
  }

  const totalComponents =
    result.componentsToAdd.length +
    result.componentsToModify.length +
    result.componentsToDelete.length;

  lines.push(`## Components (${totalComponents} total)`);
  lines.push('');

  if (byType.size > 0) {
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    for (const [type, count] of [...byType.entries()].sort()) {
      lines.push(`| ${type} | ${count} |`);
    }
  } else {
    lines.push('_No components found in source directory._');
  }

  lines.push('');

  if (result.componentsToAdd.length > 0) {
    lines.push('### Components to Add');
    lines.push('');
    for (const c of result.componentsToAdd) {
      lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
    }
    lines.push('');
  }

  if (result.componentsToModify.length > 0) {
    lines.push('### Components to Modify');
    lines.push('');
    for (const c of result.componentsToModify) {
      lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
    }
    lines.push('');
  }

  if (result.componentsToDelete.length > 0) {
    lines.push('### Components to Delete');
    lines.push('');
    for (const c of result.componentsToDelete) {
      lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
    }
    lines.push('');
  }

  if (result.risks.length > 0) {
    lines.push('## Risks');
    lines.push('');
    for (const risk of result.risks) {
      lines.push(`- ${risk}`);
    }
    lines.push('');
  }

  lines.push('## Commands');
  lines.push('');
  lines.push('**Validate:**');
  lines.push('```sh');
  lines.push(result.validationCommand);
  lines.push('```');
  lines.push('');
  lines.push('**Deploy:**');
  lines.push('```sh');
  lines.push(result.deployCommand);
  lines.push('```');

  return lines.join('\n');
}
