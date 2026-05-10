/**
 * Agentforce context detector.
 * Scans the project for Agentforce-related metadata and provides recommendations.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

export interface AgentforceContext {
  hasAgentforceMetadata: boolean;
  /** Class names with @InvocableMethod */
  invocableActions: string[];
  /** .prompt-meta.xml files found (filename without extension) */
  promptTemplates: string[];
  /** .agentTopic-meta.xml or .bot-meta.xml files found */
  agentTopics: string[];
  afvLibraryInstalled: boolean;
  recommendations: string[];
}

const AFV_SKILL_NAMES = [
  'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
  'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];

async function detectAfvLibraryInstalled(rootPath: string): Promise<boolean> {
  const skillsDir = path.join(rootPath, '.cursor', 'skills');
  if (!(await fs.pathExists(skillsDir))) return false;
  try {
    const entries = await fs.readdir(skillsDir);
    return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
  } catch {
    return false;
  }
}

/**
 * Walk a directory recursively and collect all files matching a predicate.
 */
async function findFiles(
  dir: string,
  predicate: (filename: string) => boolean
): Promise<string[]> {
  const results: string[] = [];
  if (!(await fs.pathExists(dir))) return results;

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
      } else if (predicate(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await recurse(dir);
  return results;
}

/**
 * Extract the Apex class name from a .cls file path or content.
 * Falls back to the file basename without extension.
 */
function extractClassName(filePath: string, content: string): string {
  // Try to find the class declaration
  const match = content.match(/\bclass\s+(\w+)\b/);
  if (match) return match[1];
  return path.basename(filePath, '.cls');
}

export async function detectAgentforceContext(rootPath: string): Promise<AgentforceContext> {
  const forceAppDir = path.join(rootPath, 'force-app');

  // Run all scans in parallel
  const [clsFiles, promptFiles, topicFiles, botFiles, afvLibraryInstalled] = await Promise.all([
    findFiles(forceAppDir, (name) => name.endsWith('.cls')),
    findFiles(forceAppDir, (name) => name.endsWith('.prompt-meta.xml')),
    findFiles(forceAppDir, (name) => name.endsWith('.agentTopic-meta.xml')),
    findFiles(forceAppDir, (name) => name.endsWith('.bot-meta.xml')),
    detectAfvLibraryInstalled(rootPath),
  ]);

  // Find classes with @InvocableMethod
  const invocableActions: string[] = [];
  await Promise.all(
    clsFiles.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        if (/@InvocableMethod\b/i.test(content)) {
          invocableActions.push(extractClassName(filePath, content));
        }
      } catch {
        // skip unreadable files
      }
    })
  );

  // Prompt templates — filename without the double extension
  const promptTemplates = promptFiles.map((f) =>
    path.basename(f).replace('.prompt-meta.xml', '')
  );

  // Agent topics — merge both kinds
  const agentTopics = [
    ...topicFiles.map((f) => path.basename(f).replace('.agentTopic-meta.xml', '')),
    ...botFiles.map((f) => path.basename(f).replace('.bot-meta.xml', '')),
  ];

  const hasAgentforceMetadata =
    invocableActions.length > 0 ||
    promptTemplates.length > 0 ||
    agentTopics.length > 0;

  const recommendations: string[] = [];

  if (invocableActions.length > 0 && !afvLibraryInstalled) {
    recommendations.push(
      'AFV Library skills available for Agentforce development — run: npx skills add forcedotcom/afv-library'
    );
  }

  if (promptTemplates.length > 0) {
    recommendations.push(
      'Review Prompt Templates for security — use /review-security command'
    );
  }

  return {
    hasAgentforceMetadata,
    invocableActions,
    promptTemplates,
    agentTopics,
    afvLibraryInstalled,
    recommendations,
  };
}
