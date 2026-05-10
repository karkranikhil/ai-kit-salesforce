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
exports.buildMcpConfig = buildMcpConfig;
exports.bootstrapMcp = bootstrapMcp;
exports.validateMcpConfig = validateMcpConfig;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const DEFAULT_TOOLSETS = ['orgs', 'metadata', 'data', 'users', 'lwc-experts'];
const DEFAULT_TOOLS = ['run_apex_test', 'guide_design_general'];
function buildMcpConfig(options) {
    const { orgAlias, allowNonGaTools = true } = options;
    const toolsets = options.toolsets ?? DEFAULT_TOOLSETS;
    const tools = options.tools ?? DEFAULT_TOOLS;
    const args = [
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
async function bootstrapMcp(rootPath, options) {
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
async function validateMcpConfig(configPath) {
    const issues = [];
    const suggestions = [];
    if (!(await fs.pathExists(configPath))) {
        return {
            valid: false,
            issues: ['Config file not found'],
            suggestions: ['Run: ai-kit-sf bootstrap-mcp to create it'],
        };
    }
    let config;
    try {
        config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    catch {
        return { valid: false, issues: ['Invalid JSON'], suggestions: ['Fix the JSON syntax'] };
    }
    const cfg = config;
    if (!cfg.mcpServers) {
        issues.push('Missing mcpServers key');
    }
    else {
        const servers = cfg.mcpServers;
        for (const [name, server] of Object.entries(servers)) {
            const s = server;
            if (!s.command)
                issues.push(`Server "${name}" missing command`);
            if (!Array.isArray(s.args)) {
                issues.push(`Server "${name}" args must be an array — do not use a single string`);
                suggestions.push('Each CLI flag and value must be a separate array item');
            }
            else {
                // Check for common mistake: all args in one string
                const combined = s.args.some((a) => typeof a === 'string' && a.includes('--orgs') && a.includes('--toolsets'));
                if (combined) {
                    issues.push(`Server "${name}" args appear to be combined into one string`);
                    suggestions.push('Split each flag and value into separate array items');
                }
                // Warn if DEFAULT_TARGET_ORG placeholder still present
                if (s.args.includes('DEFAULT_TARGET_ORG')) {
                    issues.push(`Server "${name}" still uses DEFAULT_TARGET_ORG placeholder`);
                    suggestions.push('Replace DEFAULT_TARGET_ORG with your actual org alias');
                }
            }
        }
    }
    return { valid: issues.length === 0, issues, suggestions };
}
//# sourceMappingURL=mcp-bootstrap.js.map