import { ProjectScanResult } from './types';

export function generateReadinessReport(result: ProjectScanResult): string {
  const lines: string[] = [];
  const score = result.score;
  const bar = buildBar(score);

  lines.push('');
  lines.push('AI-Kit for Salesforce — Readiness Report');
  lines.push('─'.repeat(50));
  lines.push('');

  if (result.isSalesforceDx) {
    lines.push('Salesforce DX project detected ✓');
  } else {
    lines.push('Salesforce DX project: NOT detected ✗');
  }

  if (result.hasForceApp) {
    lines.push('force-app found ✓');
  } else {
    lines.push('force-app: NOT found ✗');
  }

  lines.push('');
  lines.push(`AI Readiness Score: ${score}/100`);
  lines.push(`[${bar}] ${score}%`);
  lines.push('');

  if (result.missing.length > 0) {
    lines.push('Missing:');
    for (const m of result.missing) {
      lines.push(`  - ${m}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const w of result.warnings) {
      lines.push(`  ! ${w}`);
    }
    lines.push('');
  }

  if (result.recommendations.length > 0) {
    lines.push('Recommended:');
    for (const r of result.recommendations) {
      lines.push(`  → ${r}`);
    }
    lines.push('');
  }

  const details: [string, boolean][] = [
    ['AGENTS.md', result.hasAgentsMd],
    ['CLAUDE.md', result.hasClaudeMd],
    ['.cursor/rules/project.mdc (Cursor workflow rules)', result.hasCursorProjectRule],
    ['tasks/todo.md + tasks/lessons.md', result.hasTasksTodo && result.hasTasksLessons],
    ['.cursor/rules/ (Apex, LWC, MCP, safety)', result.hasCursorRules],
    ['.cursor/skills/', result.hasCursorSkills],
    ['.claude/commands/', result.hasClaudeCommands],
    ['.claude/agents/', result.hasClaudeAgents],
    ['Security/testing/deployment docs', result.hasDocs],
    ['MCP guide/config', result.hasMcpGuide || result.hasMcpConfig],
    ['AFV-compatible skill templates', result.hasAfvSkills],
    ['AFV Library docs/skills', result.hasAfvLibraryDocs || result.hasAfvLibrarySkills],
  ];

  lines.push('Detail:');
  for (const [label, found] of details) {
    lines.push(`  ${found ? '✓' : '✗'} ${label}`);
  }
  lines.push('');

  return lines.join('\n');
}

function buildBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
