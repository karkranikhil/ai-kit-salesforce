import * as fs from 'fs-extra';
import * as path from 'path';
import { SetupOptions, SetupPlan, PlannedFile, Preset } from './types';
import { TEMPLATES } from './templates';

const RECOMMENDED_SCRIPTS: Record<string, string> = {
  'lint:lwc': 'eslint force-app/main/default/lwc',
  'format': 'prettier --write "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
  'format:check': 'prettier --check "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
  'test:apex': 'sf apex run test --test-level RunLocalTests --wait 30 --result-format human',
  'validate': 'sf project deploy validate --source-dir force-app --test-level RunLocalTests --wait 60',
  'deploy': 'sf project deploy start --source-dir force-app --test-level RunLocalTests --wait 60',
  'org:list': 'sf org list',
};

const FORCE_IGNORE_LINES = [
  '.env',
  '.env.*',
  '.sf/',
  '.sfdx/',
  'node_modules/',
  'coverage/',
  '.localdevserver/',
  '**/profiles/**',
  '**/installedPackages/**',
  '**/*.mpd-meta.xml',
];

const CORE_FILES = [
  'AI_INSTRUCTIONS.md',
  'AGENTS.md',
  'CLAUDE.md',
  'tasks/todo.md',
  'tasks/lessons.md',
  '.cursor/rules/project.mdc',
  '.cursor/rules/salesforce-mcp.mdc',
  '.cursor/rules/apex.mdc',
  '.cursor/rules/lwc.mdc',
  '.cursor/rules/deployment.mdc',
  '.cursor/rules/safety.mdc',
  '.cursor/skills/salesforce-apex/SKILL.md',
  '.cursor/skills/salesforce-lwc/SKILL.md',
  '.cursor/skills/salesforce-flow/SKILL.md',
  '.cursor/skills/salesforce-security-review/SKILL.md',
  '.cursor/skills/salesforce-agentforce/SKILL.md',
  '.cursor/skills/salesforce-data-cloud/SKILL.md',
  '.cursor/skills/salesforce-apex-tests/SKILL.md',
  '.cursor/skills/salesforce-deployment/SKILL.md',
  '.cursor/skills/salesforce-pr-review/SKILL.md',
  '.cursor/skills/salesforce-commit-message/SKILL.md',
  '.cursor/skills/salesforce-permissions/SKILL.md',
  // AFV Library skills (forcedotcom/afv-library)
  '.cursor/skills/afv-generating-apex/SKILL.md',
  '.cursor/skills/afv-generating-apex-test/SKILL.md',
  '.cursor/skills/afv-generating-flow/SKILL.md',
  '.cursor/skills/afv-generating-custom-object/SKILL.md',
  '.cursor/skills/afv-generating-custom-field/SKILL.md',
  '.cursor/skills/afv-generating-permission-set/SKILL.md',
  '.cursor/skills/afv-developing-agentforce/SKILL.md',
  '.cursor/skills/afv-testing-agentforce/SKILL.md',
  '.cursor/skills/afv-observing-agentforce/SKILL.md',
  '.cursor/skills/afv-generating-validation-rule/SKILL.md',
  '.cursor/skills/afv-generating-flexipage/SKILL.md',
  '.cursor/skills/afv-generating-lightning-app/SKILL.md',
  '.cursor/skills/afv-uplifting-to-slds2/SKILL.md',
  '.cursor/skills/afv-switching-org/SKILL.md',
  '.cursor/skills/afv-building-ui-bundle-app/SKILL.md',
  '.cursor/skills/afv-building-ui-bundle-frontend/SKILL.md',
  '.cursor/skills/afv-deploying-ui-bundle/SKILL.md',
  '.cursor/skills/afv-using-ui-bundle-salesforce-data/SKILL.md',
  '.cursor/skills/afv-creating-b2b-commerce-store/SKILL.md',
  '.cursor/skills/afv-generating-custom-application/SKILL.md',
  '.cursor/skills/afv-generating-custom-lightning-type/SKILL.md',
  '.cursor/skills/afv-generating-custom-tab/SKILL.md',
  '.cursor/skills/afv-generating-list-view/SKILL.md',
  '.cursor/skills/afv-searching-media/SKILL.md',
  '.cursor/skills/afv-generating-ui-bundle-features/SKILL.md',
  '.cursor/skills/afv-generating-ui-bundle-metadata/SKILL.md',
  '.cursor/skills/afv-generating-ui-bundle-site/SKILL.md',
  '.cursor/skills/afv-implementing-agentforce-conversation-client/SKILL.md',
  '.cursor/skills/afv-implementing-file-upload/SKILL.md',
  '.claude/commands/review-security.md',
  '.claude/commands/validate-deploy.md',
  '.claude/commands/write-tests.md',
  '.claude/commands/create-apex.md',
  '.claude/commands/create-lwc.md',
  '.claude/commands/prepare-pr.md',
  '.claude/agents/salesforce-architect.md',
  '.claude/agents/apex-developer.md',
  '.claude/agents/lwc-developer.md',
  '.claude/agents/qa-tester.md',
  '.claude/agents/security-reviewer.md',
  'docs/security.md',
  'docs/testing.md',
  'docs/deployment.md',
  'docs/mcp-usage.md',
  'docs/codex-setup.md',
  'docs/antigravity-setup.md',
  'docs/cursor-setup.md',
  'docs/claude-code-setup.md',
  'docs/afv-library.md',
  'docs/skills-ecosystem.md',
  'docs/agentforce-vibes-setup.md',
  'docs/getting-started.md',
  '.windsurfrules',
  '.github/copilot-instructions.md',
];

const PRESET_EXTRA_FILES: Record<Preset, string[]> = {
  core: [],
  lwc: [], // placeholder
  agentforce: [], // afv-library docs included via core for agentforce
  'data-cloud': [],
  'experience-cloud': [],
};

export async function planSetup(rootPath: string, options: SetupOptions): Promise<SetupPlan> {
  const { preset = 'core', dryRun = false } = options;

  const allFiles = [...CORE_FILES, ...(PRESET_EXTRA_FILES[preset] ?? [])];

  const files: PlannedFile[] = await Promise.all(
    allFiles.map(async (relativePath) => {
      const fullPath = path.join(rootPath, relativePath);
      const fileExists = await fs.pathExists(fullPath);
      const templateKey = relativePath;
      const hasTemplate = templateKey in TEMPLATES;

      return {
        relativePath,
        action: fileExists ? ('skip' as const) : ('create' as const),
        reason: fileExists
          ? 'File already exists — will not overwrite'
          : hasTemplate
            ? 'Will be created from template'
            : 'Template placeholder — will be created empty',
        templateKey,
      };
    })
  );

  // Determine which scripts are missing from package.json
  const packageJsonScripts: Record<string, string> = {};
  const pkgPath = path.join(rootPath, 'package.json');
  const hasPkg = await fs.pathExists(pkgPath);
  if (hasPkg) {
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    for (const [name, cmd] of Object.entries(RECOMMENDED_SCRIPTS)) {
      if (!pkg.scripts?.[name]) {
        packageJsonScripts[name] = cmd;
      }
    }
  }

  // Determine which .forceignore lines are missing
  const forceIgnoreLines: string[] = [];
  const fiPath = path.join(rootPath, '.forceignore');
  const hasFi = await fs.pathExists(fiPath);
  if (!hasFi) {
    forceIgnoreLines.push(...FORCE_IGNORE_LINES);
  } else {
    const content = await fs.readFile(fiPath, 'utf8');
    for (const line of FORCE_IGNORE_LINES) {
      if (!content.includes(line)) {
        forceIgnoreLines.push(line);
      }
    }
  }

  return {
    rootPath,
    preset,
    dryRun,
    files,
    packageJsonScripts,
    forceIgnoreLines,
  };
}
