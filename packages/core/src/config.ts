import * as fs from 'fs-extra';
import * as path from 'path';
import { ToolkitConfig } from './types';

export const TOOLKIT_CONFIG_PATH = 'sf-ai-toolkit.config.json';

export const DEFAULT_TOOLKIT_CONFIG: ToolkitConfig = {
  quality: {
    pmd: {
      enabled: false,
      runCommand:
        'pmd check -d "force-app/main/default/classes,force-app/main/default/triggers" -R category/apex/bestpractices.xml',
    },
  },
  git: {
    commitMessage: {
      enabled: true,
      pattern: '^(feat|fix|docs|chore|refactor|test|perf)(\\([a-z0-9_-]+\\))?: .{1,72}$',
      helpText:
        'Use Conventional Commit format, e.g. feat(apex): add account service validation',
    },
  },
};

function mergeToolkitConfig(
  defaults: ToolkitConfig,
  overrides: ToolkitConfig | undefined
): ToolkitConfig {
  if (!overrides) return defaults;
  return {
    quality: {
      pmd: {
        ...defaults.quality?.pmd,
        ...overrides.quality?.pmd,
      },
    },
    git: {
      commitMessage: {
        ...defaults.git?.commitMessage,
        ...overrides.git?.commitMessage,
      },
    },
  };
}

export async function loadToolkitConfig(rootPath: string): Promise<ToolkitConfig> {
  const configPath = path.join(rootPath, TOOLKIT_CONFIG_PATH);
  const exists = await fs.pathExists(configPath);
  if (!exists) return DEFAULT_TOOLKIT_CONFIG;

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as ToolkitConfig;
    return mergeToolkitConfig(DEFAULT_TOOLKIT_CONFIG, parsed);
  } catch {
    return DEFAULT_TOOLKIT_CONFIG;
  }
}

