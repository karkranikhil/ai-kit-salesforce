# @ai-kit-salesforce/core

Core engine for [AI-Kit for Salesforce](https://marketplace.visualstudio.com/items?itemName=ai-kit-salesforce.ai-kit-salesforce).

This package contains all the logic used by the CLI and VS Code extension — scanning, file generation, inline diagnostics, MCP bootstrap, drift detection, and more. Use it if you want to build your own tooling on top of AI-Kit.

---

## Installation

```bash
npm install @ai-kit-salesforce/core
```

---

## Usage

```ts
import {
  scanProject,
  planSetup,
  applySetup,
  analyseFile,
  detectFileType,
  bootstrapMcp,
  detectDrift,
} from '@ai-kit-salesforce/core';

// Scan a Salesforce DX project and get an AI readiness score
const result = await scanProject('/path/to/sf/project');
console.log(result.score);        // 0–100
console.log(result.missing);      // files and config that are missing
console.log(result.recommendations);

// Plan and apply the setup
const plan = await planSetup('/path/to/sf/project', { preset: 'core' });
const applied = await applySetup('/path/to/sf/project', plan);
console.log(applied.filesCreated);
console.log(applied.filesSkipped); // existing files are never overwritten

// Run inline diagnostics on an Apex file
const fileType = detectFileType('MyClass.cls'); // 'apex'
const diagnostics = analyseFile(apexSourceCode, fileType);
// diagnostics: [{ ruleId, message, severity, line, ruleFile }]

// Bootstrap MCP config for Cursor and Claude Code
const mcp = await bootstrapMcp('/path/to/sf/project', { orgAlias: 'my-sandbox' });
// writes .cursor/mcp.json and .mcp.json
```

---

## What Is Included

| Module | Description |
|--------|-------------|
| `scanProject` | Scans a project and returns an AI readiness score across 21 signals |
| `planSetup` | Plans which files to create for a given preset, without writing anything |
| `applySetup` | Applies a plan — creates missing files, never overwrites existing ones |
| `analyseFile` | Runs inline diagnostic rules on Apex, LWC JS, and LWC HTML source |
| `detectFileType` | Classifies a file path as `apex`, `lwc-js`, `lwc-html`, or `unknown` |
| `getHoverContent` | Returns explanation and fix suggestion for a given diagnostic rule ID |
| `bootstrapMcp` | Generates `.cursor/mcp.json` and `.mcp.json` for a Salesforce org |
| `validateMcpConfig` | Validates an MCP config file for common mistakes |
| `detectDrift` | Checks whether AI setup files still contain the expected content signals |
| `checkTeamSync` | Compares local files against a remote team config |
| `fetchTeamConfig` | Fetches a team config JSON from a URL |
| `readOrgContext` | Reads the current default org alias from project config files |
| `detectAgentforceContext` | Scans `force-app/` for Agentforce metadata |
| `buildDeployPreview` | Classifies components in `force-app/` and identifies deployment risks |
| `listInstalledSkills` | Returns installed Cursor skills from `.cursor/skills/` |
| `generateClaudeMemModeJson` | Generates a `claude-mem` Salesforce DX mode JSON file |
| `generateReadinessReport` | Formats a scan result as a readable text report |

---

## Presets

| Preset | Description |
|--------|-------------|
| `core` | Standard Salesforce DX project |
| `lwc` | Adds extra LWC rules and skills |
| `agentforce` | Adds Agentforce and AFV Library support |
| `data-cloud` | Adds Data Cloud docs and rules |
| `experience-cloud` | Adds Experience Cloud rules |

---

## Requirements

- Node.js 18 or later

---

## Related

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ai-kit-salesforce.ai-kit-salesforce) — install this if you want the editor experience
- [@ai-kit-salesforce/cli](https://www.npmjs.com/package/@ai-kit-salesforce/cli) — install this if you want terminal commands

---

## Author

[Nikhil Karkra](https://github.com/karkranikhil)

## License

MIT
