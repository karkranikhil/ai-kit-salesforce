"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInstalledSkills = listInstalledSkills;
exports.formatSkillReference = formatSkillReference;
exports.skillToPickItem = skillToPickItem;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
async function readSkillDescription(skillDir) {
    const skillMd = path.join(skillDir, 'SKILL.md');
    try {
        const content = await fs.readFile(skillMd, 'utf8');
        const lines = content.split('\n');
        // Find the "When to Use" section or first meaningful description line
        const whenIdx = lines.findIndex((l) => l.toLowerCase().includes('when to use'));
        if (whenIdx !== -1) {
            for (let i = whenIdx + 1; i < lines.length; i++) {
                const line = lines[i].trim().replace(/^[-*>]/, '').trim();
                if (line.length > 10)
                    return line.slice(0, 120);
            }
        }
        // Fallback: first non-heading non-blank line
        for (const line of lines) {
            const clean = line.trim().replace(/^#+\s*/, '').replace(/^[-*>]/, '').trim();
            if (clean.length > 10 && !clean.startsWith('<!--'))
                return clean.slice(0, 120);
        }
        return '';
    }
    catch {
        return '';
    }
}
async function scanSkillsDir(dir, scope) {
    if (!(await fs.pathExists(dir)))
        return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const skills = [];
    await Promise.all(entries
        .filter((e) => e.isDirectory())
        .map(async (entry) => {
        const skillDir = path.join(dir, entry.name);
        const hasMd = await fs.pathExists(path.join(skillDir, 'SKILL.md'));
        if (!hasMd)
            return;
        const description = await readSkillDescription(skillDir);
        skills.push({ name: entry.name, directory: skillDir, description, scope });
    }));
    return skills.sort((a, b) => a.name.localeCompare(b.name));
}
/** Discover all installed project-level skills */
async function listInstalledSkills(rootPath) {
    const projectSkillsDir = path.join(rootPath, '.cursor', 'skills');
    return scanSkillsDir(projectSkillsDir, 'project');
}
/** Format a skill reference for insertion into a chat prompt */
function formatSkillReference(skill) {
    return `@${skill.name}`;
}
/** Build a display label for a quick-pick UI */
function skillToPickItem(skill) {
    return {
        label: `@${skill.name}`,
        description: skill.scope === 'project' ? '(project skill)' : '(user skill)',
        detail: skill.description,
    };
}
//# sourceMappingURL=skills-picker.js.map