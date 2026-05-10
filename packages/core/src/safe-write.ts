import * as fs from 'fs-extra';
import * as path from 'path';
import { SafeWriteOptions, WriteResult, FileAction } from './types';
import { MARKER_START, MARKER_END, wrapInMarker } from './templates';

export async function writeFileSafe(
  filePath: string,
  content: string,
  options: SafeWriteOptions = {}
): Promise<WriteResult> {
  const { dryRun = false, overwrite = false, markerLabel } = options;
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    if (!dryRun) {
      await fs.ensureDir(path.dirname(filePath));
      const finalContent = markerLabel ? wrapInMarker(content) : content;
      await fs.writeFile(filePath, finalContent, 'utf8');
    }
    return { path: filePath, action: 'create', skipped: false };
  }

  // File exists — decide what to do
  if (overwrite) {
    if (!dryRun) {
      await fs.writeFile(filePath, content, 'utf8');
    }
    return { path: filePath, action: 'create', skipped: false };
  }

  if (markerLabel) {
    // Append or replace inside marker block
    return updateMarkerBlock(filePath, content, dryRun);
  }

  // No marker, no overwrite — skip
  return {
    path: filePath,
    action: 'skip',
    skipped: true,
    reason: 'File already exists and overwrite is disabled',
  };
}

async function updateMarkerBlock(
  filePath: string,
  newContent: string,
  dryRun: boolean
): Promise<WriteResult> {
  const existing = await fs.readFile(filePath, 'utf8');
  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace content inside existing marker block
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + MARKER_END.length);
    const updated = before + wrapInMarker(newContent) + after;
    if (!dryRun) {
      await fs.writeFile(filePath, updated, 'utf8');
    }
    return { path: filePath, action: 'merge', skipped: false };
  }

  // No marker found — append new marker block
  const appended = existing.trimEnd() + '\n\n' + wrapInMarker(newContent);
  if (!dryRun) {
    await fs.writeFile(filePath, appended, 'utf8');
  }
  return { path: filePath, action: 'append', skipped: false };
}

export async function appendMissingLines(filePath: string, lines: string[]): Promise<string[]> {
  const exists = await fs.pathExists(filePath);
  let currentContent = '';
  if (exists) {
    currentContent = await fs.readFile(filePath, 'utf8');
  }

  const missing = lines.filter((line) => !currentContent.includes(line));
  if (missing.length === 0) return [];

  const toAppend = '\n' + missing.join('\n') + '\n';
  await fs.ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, toAppend, 'utf8');
  return missing;
}

export async function mergePackageJsonScripts(
  rootPath: string,
  scripts: Record<string, string>
): Promise<string[]> {
  const pkgPath = path.join(rootPath, 'package.json');
  const exists = await fs.pathExists(pkgPath);
  if (!exists) return [];

  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    scripts?: Record<string, string>;
    [key: string]: unknown;
  };

  if (!pkg.scripts) pkg.scripts = {};

  const added: string[] = [];
  for (const [name, cmd] of Object.entries(scripts)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = cmd;
      added.push(name);
    }
  }

  if (added.length > 0) {
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  return added;
}

export function determineAction(filePath: string, fileExists: boolean): FileAction {
  if (!fileExists) return 'create';
  return 'skip';
}
