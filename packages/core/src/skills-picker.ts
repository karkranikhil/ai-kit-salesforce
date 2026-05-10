import * as fs from 'fs-extra';
import * as path from 'path';

export interface InstalledSkill {
  name: string;
  /** Absolute path to the skill directory */
  directory: string;
  /** First non-blank, non-heading line from SKILL.md — used as description */
  description: string;
  /** 'project' | 'user' */
  scope: 'project' | 'user';
}

async function readSkillDescription(skillDir: string): Promise<string> {
  const skillMd = path.join(skillDir, 'SKILL.md');
  try {
    const content = await fs.readFile(skillMd, 'utf8');
    const lines = content.split('\n');
    // Find the "When to Use" section or first meaningful description line
    const whenIdx = lines.findIndex((l) => l.toLowerCase().includes('when to use'));
    if (whenIdx !== -1) {
      for (let i = whenIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim().replace(/^[-*>]/, '').trim();
        if (line.length > 10) return line.slice(0, 120);
      }
    }
    // Fallback: first non-heading non-blank line
    for (const line of lines) {
      const clean = line.trim().replace(/^#+\s*/, '').replace(/^[-*>]/, '').trim();
      if (clean.length > 10 && !clean.startsWith('<!--')) return clean.slice(0, 120);
    }
    return '';
  } catch {
    return '';
  }
}

async function scanSkillsDir(
  dir: string,
  scope: 'project' | 'user'
): Promise<InstalledSkill[]> {
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skills: InstalledSkill[] = [];

  await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (entry) => {
        const skillDir = path.join(dir, entry.name);
        const hasMd = await fs.pathExists(path.join(skillDir, 'SKILL.md'));
        if (!hasMd) return;
        const description = await readSkillDescription(skillDir);
        skills.push({ name: entry.name, directory: skillDir, description, scope });
      })
  );

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** Discover all installed project-level skills */
export async function listInstalledSkills(rootPath: string): Promise<InstalledSkill[]> {
  const projectSkillsDir = path.join(rootPath, '.cursor', 'skills');
  return scanSkillsDir(projectSkillsDir, 'project');
}

/** Format a skill reference for insertion into a chat prompt */
export function formatSkillReference(skill: InstalledSkill): string {
  return `@${skill.name}`;
}

/** Build a display label for a quick-pick UI */
export function skillToPickItem(skill: InstalledSkill): { label: string; description: string; detail: string } {
  return {
    label: `@${skill.name}`,
    description: skill.scope === 'project' ? '(project skill)' : '(user skill)',
    detail: skill.description,
  };
}
