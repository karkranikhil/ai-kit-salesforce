import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectScanResult } from './types';

const AFV_SKILL_NAMES = [
  'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
  'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function detectAfvLibrarySkills(skillsDir: string): Promise<boolean> {
  if (!(await isDirectory(skillsDir))) return false;
  try {
    const entries = await fs.readdir(skillsDir);
    return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
  } catch {
    return false;
  }
}

export async function scanProject(rootPath: string): Promise<ProjectScanResult> {
  const p = (...parts: string[]) => path.join(rootPath, ...parts);

  const [
    isSalesforceDx,
    hasForceApp,
    hasPackageJson,
    hasAgentsMd,
    hasClaudeMd,
    hasCursorRulesDir,
    hasCursorSkillsDir,
    hasClaudeCommandsDir,
    hasClaudeAgentsDir,
    hasSecurityDoc,
    hasTestingDoc,
    hasDeploymentDoc,
    hasMcpGuideDoc,
    hasForceIgnore,
    hasMcpConfig,
    hasAfvLibraryDocs,
    hasAfvLibrarySkills,
    hasTasksTodo,
    hasTasksLessons,
    hasCursorProjectRule,
  ] = await Promise.all([
    exists(p('sfdx-project.json')),
    isDirectory(p('force-app')),
    exists(p('package.json')),
    exists(p('AGENTS.md')),
    exists(p('CLAUDE.md')),
    isDirectory(p('.cursor', 'rules')),
    isDirectory(p('.cursor', 'skills')),
    isDirectory(p('.claude', 'commands')),
    isDirectory(p('.claude', 'agents')),
    exists(p('docs', 'security.md')),
    exists(p('docs', 'testing.md')),
    exists(p('docs', 'deployment.md')),
    exists(p('docs', 'mcp-usage.md')),
    exists(p('.forceignore')),
    exists(p('.mcp.json')).then(async (v) => v || exists(p('.cursor', 'mcp.json'))),
    exists(p('docs', 'afv-library.md')),
    detectAfvLibrarySkills(p('.cursor', 'skills')),
    exists(p('tasks', 'todo.md')),
    exists(p('tasks', 'lessons.md')),
    exists(p('.cursor', 'rules', 'project.mdc')),
  ]);

  const hasAfvSkills = hasCursorSkillsDir;
  const hasDocs = hasSecurityDoc && hasTestingDoc && hasDeploymentDoc;
  const hasTaskManagement = hasTasksTodo && hasTasksLessons;

  let score = 0;
  const missing: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (isSalesforceDx) {
    score += 20;
  } else {
    missing.push('sfdx-project.json (not a Salesforce DX project)');
    warnings.push('No sfdx-project.json found. AI-Kit works best with Salesforce DX projects.');
  }

  if (hasForceApp) {
    score += 10;
  } else {
    missing.push('force-app/ directory');
  }

  if (hasAgentsMd) {
    score += 10;
  } else {
    missing.push('AGENTS.md');
    recommendations.push('Add AGENTS.md with project context and AI tool usage rules.');
  }

  if (hasClaudeMd) {
    score += 8;
  } else {
    missing.push('CLAUDE.md');
    recommendations.push('Add CLAUDE.md with Claude Code workflow orchestration and Salesforce DX rules.');
  }

  if (hasCursorProjectRule) {
    score += 4;
  } else {
    missing.push('.cursor/rules/project.mdc (Cursor workflow rules)');
    recommendations.push('Add .cursor/rules/project.mdc — Cursor equivalent of CLAUDE.md.');
  }

  if (hasCursorRulesDir) {
    score += 8;
  } else {
    missing.push('.cursor/rules/ (Apex, LWC, MCP, deployment, safety rules)');
    recommendations.push('Add Cursor rules for Apex, LWC, MCP, deployment, and safety.');
  }

  if (hasCursorSkillsDir) {
    score += 8;
  } else {
    missing.push('.cursor/skills/');
    recommendations.push('Add Cursor skill templates for Apex, LWC, Flow, Agentforce, and Data Cloud.');
  }

  if (hasClaudeCommandsDir) {
    score += 6;
  } else {
    missing.push('.claude/commands/');
    recommendations.push('Add Claude commands for security review, deploy validation, test writing, and PR prep.');
  }

  if (hasClaudeAgentsDir) {
    score += 6;
  } else {
    missing.push('.claude/agents/');
    recommendations.push('Add Claude subagents for architect, Apex developer, LWC developer, QA, and security review.');
  }

  if (hasTaskManagement) {
    score += 6;
  } else {
    if (!hasTasksTodo) { missing.push('tasks/todo.md'); }
    if (!hasTasksLessons) { missing.push('tasks/lessons.md'); }
    recommendations.push('Add tasks/ folder for plan-first task tracking and lessons learned.');
  }

  if (hasDocs) {
    score += 6;
  } else {
    if (!hasSecurityDoc) { missing.push('docs/security.md'); }
    if (!hasTestingDoc) { missing.push('docs/testing.md'); }
    if (!hasDeploymentDoc) { missing.push('docs/deployment.md'); }
    recommendations.push('Add security, testing, and deployment docs.');
  }

  if (hasMcpGuideDoc || hasMcpConfig) {
    score += 4;
  } else {
    missing.push('docs/mcp-usage.md');
    recommendations.push('Add Salesforce DX MCP usage guide and config.');
  }

  if (hasAfvSkills) {
    score += 2;
  } else {
    missing.push('AFV-compatible Salesforce skill templates');
    recommendations.push('Add AI-Kit Salesforce skill templates (compatible with Cursor skills workflow).');
  }

  if (hasAfvLibraryDocs || hasAfvLibrarySkills) {
    score += 2;
  } else {
    missing.push('Salesforce AFV Library docs/support');
    recommendations.push('Add AFV Library documentation (Salesforce curated agent skills).');
  }

  if (!hasPackageJson) {
    warnings.push('No package.json found. Script merging will be skipped.');
  }

  if (!hasForceIgnore) {
    warnings.push('.forceignore not found — recommended entries will be created.');
  }

  if (recommendations.length === 0 && missing.length === 0) {
    recommendations.push('Your project looks great! Run sf-ai-toolkit scan periodically to keep it up to date.');
  } else if (missing.length > 0) {
    recommendations.unshift(`Run: sf-ai-toolkit init --preset core`);
  }

  return {
    rootPath,
    isSalesforceDx,
    hasForceApp,
    hasPackageJson,
    hasAgentsMd,
    hasClaudeMd,
    hasCursorRules: hasCursorRulesDir,
    hasCursorSkills: hasCursorSkillsDir,
    hasClaudeCommands: hasClaudeCommandsDir,
    hasClaudeAgents: hasClaudeAgentsDir,
    hasDocs,
    hasMcpGuide: hasMcpGuideDoc,
    hasForceIgnore,
    hasMcpConfig,
    hasAfvSkills,
    hasAfvLibraryDocs,
    hasAfvLibrarySkills,
    hasTasksTodo,
    hasTasksLessons,
    hasCursorProjectRule,
    score,
    missing,
    warnings,
    recommendations,
  };
}
