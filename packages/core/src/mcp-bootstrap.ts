import * as fs from 'fs-extra';
import * as path from 'path';

export interface McpConfig {
  mcpServers: Record<string, McpServer>;
}

export interface McpServer {
  command: string;
  args: string[];
}

export interface McpBootstrapOptions {
  orgAlias: string;
  toolsets?: string[];
  tools?: string[];
  allowNonGaTools?: boolean;
}

export interface McpBootstrapResult {
  cursorConfigPath: string;
  claudeConfigPath: string;
  config: McpConfig;
  alreadyExisted: {
    cursor: boolean;
    claude: boolean;
  };
}

const DEFAULT_TOOLSETS = ['orgs', 'metadata', 'data', 'users', 'lwc-experts'];
const DEFAULT_TOOLS = ['run_apex_test', 'guide_design_general'];

export function buildMcpConfig(options: McpBootstrapOptions): McpConfig {
  const { orgAlias, allowNonGaTools = true } = options;
  const toolsets = options.toolsets ?? DEFAULT_TOOLSETS;
  const tools = options.tools ?? DEFAULT_TOOLS;

  const args: string[] = [
    '-y',
    '@salesforce/mcp@latest',
    '--orgs', orgAlias,
    '--toolsets', toolsets.join(','),
    '--tools', tools.join(','),
  ];

  if (allowNonGaTools) {
    args.push('--allow-non-ga-tools');
  }

  return {
    mcpServers: {
      'Salesforce DX': {
        command: 'npx',
        args,
      },
    },
  };
}

export async function bootstrapMcp(
  rootPath: string,
  options: McpBootstrapOptions
): Promise<McpBootstrapResult> {
  const config = buildMcpConfig(options);
  const json = JSON.stringify(config, null, 2) + '\n';

  const cursorConfigPath = path.join(rootPath, '.cursor', 'mcp.json');
  const claudeConfigPath = path.join(rootPath, '.mcp.json');

  const cursorExists = await fs.pathExists(cursorConfigPath);
  const claudeExists = await fs.pathExists(claudeConfigPath);

  if (!cursorExists) {
    await fs.ensureDir(path.dirname(cursorConfigPath));
    await fs.writeFile(cursorConfigPath, json, 'utf8');
  }

  if (!claudeExists) {
    await fs.writeFile(claudeConfigPath, json, 'utf8');
  }

  return {
    cursorConfigPath,
    claudeConfigPath,
    config,
    alreadyExisted: { cursor: cursorExists, claude: claudeExists },
  };
}

/** Validate an existing MCP config and report issues */
export interface McpValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

export async function validateMcpConfig(configPath: string): Promise<McpValidationResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!(await fs.pathExists(configPath))) {
    return {
      valid: false,
      issues: ['Config file not found'],
      suggestions: ['Run: sf-ai-toolkit bootstrap-mcp to create it'],
    };
  }

  let config: unknown;
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch {
    return { valid: false, issues: ['Invalid JSON'], suggestions: ['Fix the JSON syntax'] };
  }

  const cfg = config as Record<string, unknown>;
  if (!cfg.mcpServers) {
    issues.push('Missing mcpServers key');
  } else {
    const servers = cfg.mcpServers as Record<string, unknown>;
    for (const [name, server] of Object.entries(servers)) {
      const s = server as Record<string, unknown>;
      if (!s.command) issues.push(`Server "${name}" missing command`);
      if (!Array.isArray(s.args)) {
        issues.push(`Server "${name}" args must be an array — do not use a single string`);
        suggestions.push('Each CLI flag and value must be a separate array item');
      } else {
        // Check for common mistake: all args in one string
        const combined = (s.args as unknown[]).some(
          (a) => typeof a === 'string' && a.includes('--orgs') && a.includes('--toolsets')
        );
        if (combined) {
          issues.push(`Server "${name}" args appear to be combined into one string`);
          suggestions.push('Split each flag and value into separate array items');
        }
        // Warn if DEFAULT_TARGET_ORG placeholder still present
        if ((s.args as string[]).includes('DEFAULT_TARGET_ORG')) {
          issues.push(`Server "${name}" still uses DEFAULT_TARGET_ORG placeholder`);
          suggestions.push('Replace DEFAULT_TARGET_ORG with your actual org alias');
        }
      }
    }
  }

  return { valid: issues.length === 0, issues, suggestions };
}
