import * as path from 'path';
import * as fs from 'fs-extra';
import { SetupPlan, ApplyResult } from './types';
import { TEMPLATES } from './templates';
import { writeFileSafe, appendMissingLines, mergePackageJsonScripts } from './safe-write';
import { createBackup } from './backup';

export async function applySetup(rootPath: string, plan: SetupPlan): Promise<ApplyResult> {
  const result: ApplyResult = {
    filesCreated: [],
    filesModified: [],
    filesSkipped: [],
    packageJsonUpdated: false,
    forceIgnoreUpdated: false,
    errors: [],
  };

  // Collect existing files that will be modified for backup
  const filesToBackup: string[] = [];
  for (const planned of plan.files) {
    if (planned.action !== 'create') {
      filesToBackup.push(path.join(rootPath, planned.relativePath));
    }
  }
  if (plan.forceIgnoreLines.length > 0) {
    const fi = path.join(rootPath, '.forceignore');
    if (await fs.pathExists(fi)) filesToBackup.push(fi);
  }
  if (Object.keys(plan.packageJsonScripts).length > 0) {
    filesToBackup.push(path.join(rootPath, 'package.json'));
  }

  if (!plan.dryRun && filesToBackup.length > 0) {
    try {
      const backupPath = await createBackup(rootPath, filesToBackup);
      result.backupPath = backupPath;
    } catch (err) {
      result.errors.push(`Backup failed: ${String(err)}`);
    }
  }

  // Apply file operations
  for (const planned of plan.files) {
    if (planned.action === 'skip') {
      result.filesSkipped.push(planned.relativePath);
      continue;
    }

    const fullPath = path.join(rootPath, planned.relativePath);
    const content = TEMPLATES[planned.templateKey] ?? `# ${planned.relativePath}\n\n<!-- TODO: Add content -->\n`;

    try {
      const writeResult = await writeFileSafe(fullPath, content, { dryRun: plan.dryRun });
      if (writeResult.action === 'create') {
        result.filesCreated.push(planned.relativePath);
      } else if (writeResult.action === 'append' || writeResult.action === 'merge') {
        result.filesModified.push(planned.relativePath);
      } else {
        result.filesSkipped.push(planned.relativePath);
      }
    } catch (err) {
      result.errors.push(`Failed to write ${planned.relativePath}: ${String(err)}`);
    }
  }

  // Update .forceignore
  if (plan.forceIgnoreLines.length > 0) {
    try {
      const fiPath = path.join(rootPath, '.forceignore');
      if (!plan.dryRun) {
        await appendMissingLines(fiPath, plan.forceIgnoreLines);
      }
      result.forceIgnoreUpdated = true;
    } catch (err) {
      result.errors.push(`Failed to update .forceignore: ${String(err)}`);
    }
  }

  // Update package.json scripts
  if (Object.keys(plan.packageJsonScripts).length > 0) {
    try {
      if (!plan.dryRun) {
        const added = await mergePackageJsonScripts(rootPath, plan.packageJsonScripts);
        result.packageJsonUpdated = added.length > 0;
      } else {
        result.packageJsonUpdated = true;
      }
    } catch (err) {
      result.errors.push(`Failed to update package.json: ${String(err)}`);
    }
  }

  return result;
}
