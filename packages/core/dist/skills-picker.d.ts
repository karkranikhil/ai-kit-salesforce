export interface InstalledSkill {
    name: string;
    /** Absolute path to the skill directory */
    directory: string;
    /** First non-blank, non-heading line from SKILL.md — used as description */
    description: string;
    /** 'project' | 'user' */
    scope: 'project' | 'user';
}
/** Discover all installed project-level skills */
export declare function listInstalledSkills(rootPath: string): Promise<InstalledSkill[]>;
/** Format a skill reference for insertion into a chat prompt */
export declare function formatSkillReference(skill: InstalledSkill): string;
/** Build a display label for a quick-pick UI */
export declare function skillToPickItem(skill: InstalledSkill): {
    label: string;
    description: string;
    detail: string;
};
//# sourceMappingURL=skills-picker.d.ts.map