# AI-Kit for Salesforce

> Make every Salesforce DX project AI-ready in minutes.

AI-Kit for Salesforce is a VS Code/Cursor extension and CLI tool that scaffolds everything an AI coding assistant needs to work safely and effectively inside a Salesforce DX project — Cursor rules, Claude Code config, Salesforce DX MCP setup, Apex/LWC inline diagnostics, Agentforce detection, team config sync, and more.

---

## Feature Overview

| # | Feature | VS Code | CLI | Description |
|---|---------|:-------:|:---:|-------------|
| 1 | **AI Readiness Score** | ✓ | ✓ | Scans project and scores AI-readiness 0–100 across 21 signals |
| 2 | **Live Status Bar** | ✓ | — | Status bar shows current score + org alias, refreshes when files change |
| 3 | **One-Command Setup** | ✓ | ✓ | `init` scaffolds all missing files for the chosen preset in one step |
| 4 | **5 Setup Presets** | ✓ | ✓ | core · lwc · agentforce · data-cloud · experience-cloud |
| 5 | **Never Overwrites Files** | ✓ | ✓ | Safe-write: every existing file is skipped; backups created before any modify |
| 6 | **Cursor Rules** | ✓ | ✓ | Generates `.cursor/rules/` for Apex, LWC, MCP, Deployment, Safety, Project |
| 7 | **Claude Code Config** | ✓ | ✓ | Generates `CLAUDE.md`, `AGENTS.md`, slash commands, sub-agents |
| 8 | **Workflow Orchestration** | ✓ | ✓ | CLAUDE.md includes Plan Mode, Subagent Strategy, Self-Improvement Loop |
| 9 | **Task Management Files** | ✓ | ✓ | Generates `tasks/todo.md` and `tasks/lessons.md` for AI task tracking |
| 10 | **Cursor Skills** | ✓ | ✓ | 6 skill templates: Apex, LWC, Flow, Security Review, Agentforce, Data Cloud |
| 11 | **Claude Agents** | ✓ | ✓ | 5 sub-agent definitions: Architect, Apex Dev, LWC Dev, QA Tester, Security |
| 12 | **Claude Slash Commands** | ✓ | ✓ | 6 commands: /review-security, /validate-deploy, /write-tests, /create-apex, /create-lwc, /prepare-pr |
| 13 | **Apex Inline Diagnostics** | ✓ | — | Real-time squiggles for 9 Apex anti-patterns in `.cls` and `.trigger` files |
| 14 | **LWC JS Diagnostics** | ✓ | — | Real-time squiggles for 4 LWC JS anti-patterns (console.log, innerHTML, etc.) |
| 15 | **LWC HTML Diagnostics** | ✓ | — | Real-time squiggles for 4 LWC template anti-patterns (missing key, aura syntax, etc.) |
| 16 | **Hover Explanations** | ✓ | — | Hover over any diagnostic: title, explanation, fix suggestion, Salesforce docs link |
| 17 | **Org Context Awareness** | ✓ | ✓ | Reads `.sf/config.json`, `sfdx-project.json`, `.sfdx/` for current target org |
| 18 | **MCP Bootstrap** | ✓ | ✓ | One-command Salesforce DX MCP config for both Cursor and Claude Code |
| 19 | **MCP Config Validation** | ✓ | ✓ | Detects combined-args anti-pattern, missing org alias, invalid JSON |
| 20 | **Deploy Preview** | — | ✓ | Classifies all components to deploy; detects risks; shows `sf` commands |
| 21 | **Production Safety Gate** | — | ✓ | Blocks deploy-preview for production orgs unless `--confirm-production` |
| 22 | **Template Drift Detection** | ✓ | ✓ | Signal-based check: are your AI setup files still aligned with best practices? |
| 23 | **Team Config Sync** | ✓ | ✓ | Compare local files against a remote team JSON config URL; auto-checks on open |
| 24 | **Agentforce Detector** | ✓ | ✓ | Finds `@InvocableMethod`, prompt templates, agent topics in `force-app/` |
| 25 | **Skills Picker** | ✓ | ✓ | Browse installed skills and copy `@mention` references to clipboard |
| 26 | **claude-mem Salesforce Mode** | ✓ | ✓ | Generates a `salesforce-dx.json` mode file for the `claude-mem` memory system |
| 27 | **AFV Library Support** | ✓ | ✓ | Adds Salesforce AFV Library docs and skill ecosystem guide |
| 28 | **Doctor Command** | — | ✓ | Comprehensive config health check: org, MCP, drift, missing files |
| 29 | **Dry-Run Mode** | ✓ | ✓ | Preview all planned changes without writing anything |
| 30 | **Backup on Modify** | ✓ | ✓ | Timestamped backup in `.ai-kit-salesforce-backup/` before any file is modified |
| 31 | **Readiness Report Webview** | ✓ | — | Rich HTML report: score, missing items, org banner, drift summary |
| 32 | **Drift Report Webview** | ✓ | — | Table view of drifted / missing / up-to-date tracked files |
| 33 | **Team Sync Webview** | ✓ | — | Rich HTML team config comparison report |

---

## Inline Diagnostics Reference

### Apex (`.cls`, `.trigger`)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `no-soql-in-loop` | Error | SOQL query inside a `for`/`while` loop — governor limit violation |
| `no-dml-in-loop` | Error | DML statement (`insert`/`update`/`delete`/`upsert`) inside a loop |
| `no-seealldata` | Error | `@IsTest(SeeAllData=true)` — fragile, environment-dependent tests |
| `missing-sharing-declaration` | Warning | Class missing `with sharing` / `without sharing` keyword |
| `no-without-sharing-bypass` | Warning | `without sharing` used without an explanatory comment on the prior line |
| `no-hardcoded-id` | Warning | 15- or 18-character Salesforce ID literal in source |
| `no-debug-pii` | Warning | `System.debug` with sensitive keywords (email, password, token, ssn, etc.) |
| `no-naked-catch` | Warning | Empty `catch` block — swallows exceptions silently |
| `missing-test-setup` | Warning | Test class with >1 `@IsTest` method but no `@TestSetup` |

### LWC JavaScript (`.js` files inside `lwc/`)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `no-console-log` | Warning | `console.log/warn/error/info/debug` left in production code |
| `no-inner-html` | Error | Direct `innerHTML` assignment — XSS risk in Locker Service |
| `no-hardcoded-url` | Warning | Hardcoded `/apex/`, `/lightning/`, or `/s/` URL — breaks across orgs |
| `missing-wire-error-handler` | Warning | `@wire` adapter without `error` property handling |

### LWC HTML Templates (`.html` files inside `lwc/`)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `missing-key-iterator` | Error | `for:each` iterator missing required `key=` attribute |
| `no-aura-syntax` | Error | `aura:*` tags/attributes used in an LWC template |
| `no-onclick-inline` | Error | Inline `onclick="handler()"` string instead of `onclick={handler}` binding |

---

## Quick Start

### Via CLI (npx)

```bash
# Scan your project
npx @ai-kit-salesforce/cli scan

# Full setup with recommended defaults
npx @ai-kit-salesforce/cli init

# Non-interactive setup
npx @ai-kit-salesforce/cli init --preset core --yes

# Dry run (no changes)
npx @ai-kit-salesforce/cli init --preset core --dry-run

# One-command MCP config
npx @ai-kit-salesforce/cli bootstrap-mcp

# Preview what would deploy
npx @ai-kit-salesforce/cli deploy-preview

# Scan for Agentforce metadata
npx @ai-kit-salesforce/cli agentforce-scan

# Health check
npx @ai-kit-salesforce/cli doctor

# Check drift
npx @ai-kit-salesforce/cli check-drift
```

### Via VS Code / Cursor Extension

1. Open your Salesforce DX project in VS Code or Cursor.
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
3. Run: **AI-Kit: Scan Salesforce Project** — see your readiness score.
4. Run: **AI-Kit: Apply Recommended Setup** — scaffold all missing files.
5. Inline diagnostics appear automatically in `.cls`, `.trigger`, and `lwc/` files.
6. Hover over any red/yellow underline for an explanation and fix suggestion.

The status bar shows your current score and org alias and updates whenever AI setup files change.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `ai-kit-sf scan` | Show AI readiness score and missing items |
| `ai-kit-sf init` | Full setup — scan, select preset, apply |
| `ai-kit-sf add-cursor` | Add Cursor rules only |
| `ai-kit-sf add-claude` | Add Claude Code config only (CLAUDE.md, commands, agents) |
| `ai-kit-sf add-mcp` | Add MCP usage guide and Cursor MCP rule |
| `ai-kit-sf add-jags-skills` | Add Cursor skill templates |
| `ai-kit-sf add-afv-library` | Add Salesforce AFV Library guide |
| `ai-kit-sf bootstrap-mcp` | Generate `.cursor/mcp.json` and `.mcp.json` for the target org |
| `ai-kit-sf check-drift` | Check if AI setup files have drifted from best practices |
| `ai-kit-sf deploy-preview` | Preview deployment components and risks |
| `ai-kit-sf agentforce-scan` | Detect Agentforce metadata and get recommendations |
| `ai-kit-sf add-claude-mem` | Generate claude-mem Salesforce DX mode file |
| `ai-kit-sf pick-skill` | Browse installed skills and copy `@mention` to clipboard |
| `ai-kit-sf doctor` | Comprehensive configuration health check |

All write commands support `--dry-run` to preview changes without modifying files.

---

## VS Code Commands

Open the Command Palette (`Cmd+Shift+P`) and search for **AI-Kit**:

| Command | Description |
|---------|-------------|
| AI-Kit: Scan Salesforce Project | Full scan with webview readiness report |
| AI-Kit: Apply Recommended Setup | Scaffolds missing files for the selected preset |
| AI-Kit: Open Readiness Report | Re-opens the last scan report |
| AI-Kit: Add Cursor Rules | Adds `.cursor/rules/` files only |
| AI-Kit: Add Cursor Skills | Adds `.cursor/skills/` templates only |
| AI-Kit: Add Claude Code Setup | Adds `CLAUDE.md`, agents, and slash commands only |
| AI-Kit: Add MCP Guardrails | Adds MCP docs and rule only |
| AI-Kit: Bootstrap MCP Config | Generates MCP config for your org alias |
| AI-Kit: Check Template Drift | Opens drift report webview |
| AI-Kit: Add claude-mem Salesforce Mode | Generates `docs/claude-mem/salesforce-dx.json` |
| AI-Kit: Insert Skill Reference | Browse skills, copy `@mention` to clipboard |
| AI-Kit: Check Team Sync | Compare local files against a team config URL |

---

## Setup Presets

| Preset | What it adds |
|--------|-------------|
| `core` | AGENTS.md, CLAUDE.md, tasks/, Cursor rules (6), Cursor skills (6), Claude commands (6), Claude agents (5), docs (9) |
| `lwc` | Everything in `core` + extra LWC-focused rules |
| `agentforce` | Everything in `core` + Agentforce rules and AFV Library guide |
| `data-cloud` | Everything in `core` + Data Cloud docs |
| `experience-cloud` | Everything in `core` + Experience Cloud rules |

---

## Files Generated

`ai-kit-sf init --preset core` creates these files if they do not already exist:

```
AGENTS.md                              AI tool usage guide for the project
CLAUDE.md                              Claude Code project rules + workflow orchestration
tasks/
├── todo.md                            AI task tracker (Plan Mode compatible)
└── lessons.md                         Lessons learned from AI-assisted work

.cursor/
├── rules/
│   ├── project.mdc                    Master workflow rules (alwaysApply: true)
│   ├── salesforce-mcp.mdc             MCP-first org operations
│   ├── apex.mdc                       Apex coding standards
│   ├── lwc.mdc                        LWC coding standards
│   ├── deployment.mdc                 Deployment safety gates
│   └── safety.mdc                     Security and AI safety rules
└── skills/
    ├── salesforce-apex/SKILL.md
    ├── salesforce-lwc/SKILL.md
    ├── salesforce-flow/SKILL.md
    ├── salesforce-security-review/SKILL.md
    ├── salesforce-agentforce/SKILL.md
    └── salesforce-data-cloud/SKILL.md

.claude/
├── commands/
│   ├── review-security.md             /review-security slash command
│   ├── validate-deploy.md             /validate-deploy slash command
│   ├── write-tests.md                 /write-tests slash command
│   ├── create-apex.md                 /create-apex slash command
│   ├── create-lwc.md                  /create-lwc slash command
│   └── prepare-pr.md                  /prepare-pr slash command
└── agents/
    ├── salesforce-architect.md
    ├── apex-developer.md
    ├── lwc-developer.md
    ├── qa-tester.md
    └── security-reviewer.md

docs/
├── security.md
├── testing.md
├── deployment.md
├── mcp-usage.md                       Salesforce DX MCP full guide
├── cursor-setup.md
├── claude-code-setup.md
├── jags-skills.md
├── afv-library.md
└── skills-ecosystem.md
```

Also safely updates:
- `.forceignore` — adds recommended entries
- `package.json` — adds missing scripts (lint, format, test:apex, validate, deploy)

---

## Salesforce DX MCP Setup

AI-Kit includes full documentation and one-command bootstrap for [Salesforce DX MCP](https://github.com/salesforcecli/mcp-server).

```bash
npx @ai-kit-salesforce/cli bootstrap-mcp
# Prompts for your org alias and writes:
#   .cursor/mcp.json  (Cursor)
#   .mcp.json         (Claude Code)
```

Or use the VS Code command: **AI-Kit: Bootstrap MCP Config**

Generated config (correct args-array format):

```json
{
  "mcpServers": {
    "Salesforce DX": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs", "YOUR_ORG_ALIAS",
        "--toolsets", "orgs,metadata,data,users,lwc-experts",
        "--tools", "run_apex_test,guide_design_general",
        "--allow-non-ga-tools"
      ]
    }
  }
}
```

The validator catches the common combined-args anti-pattern (`"--orgs YOUR_ORG_ALIAS"` in a single string) and `DEFAULT_TARGET_ORG` placeholders.

---

## Team Config Sync

Teams can publish a `ai-kit-team.json` config file to a URL and have AI-Kit auto-check for drift on workspace open.

**1. Publish a config file:**

```json
{
  "version": "1.0",
  "requiredFiles": ["AGENTS.md", "CLAUDE.md", ".cursor/rules/apex.mdc"],
  "fileSignals": {
    "AGENTS.md": ["Salesforce DX", "MCP"],
    ".cursor/rules/apex.mdc": ["bulkif", "with sharing"]
  }
}
```

**2. Set the URL in VS Code settings:**

```json
{
  "ai-kit-salesforce.teamConfigUrl": "https://raw.githubusercontent.com/your-org/repo/main/ai-kit-team.json"
}
```

**3. Auto-check on startup:**

AI-Kit silently checks on workspace open and shows a notification if drift is detected.

---

## Agentforce Support

```bash
npx @ai-kit-salesforce/cli agentforce-scan
```

Scans `force-app/` and reports:
- Classes with `@InvocableMethod` (invocable actions)
- `.prompt-meta.xml` files (prompt templates)
- `.agentTopic-meta.xml` and `.bot-meta.xml` files (agent topics)
- Whether AFV Library skills are installed
- Recommendations (e.g., install AFV Library if invocable actions are found)

---

## claude-mem Integration

AI-Kit generates a [claude-mem](https://github.com/thedotmack/claude-mem) Salesforce DX mode file:

```bash
npx @ai-kit-salesforce/cli add-claude-mem
# Creates: docs/claude-mem/salesforce-dx.json
```

The mode includes 9 observation types (apex-pattern, deployment-issue, permission-rule, org-config, mcp-operation, security-finding, lwc-decision, test-strategy, agentforce-pattern) and 7 Salesforce-specific concepts.

---

## Security Model

AI-Kit for Salesforce is safe for production repos:

| Guarantee | Details |
|-----------|---------|
| Never overwrites | Skips any file that already exists |
| Backup before modify | `.ai-kit-salesforce-backup/YYYY-MM-DD-HHMMSS/` |
| Dry-run mode | `--dry-run` previews all changes |
| No credentials | No org auth, no tokens, no login |
| No deployments | Never runs `sf project deploy` |
| No telemetry | Zero data collection |
| No auto-install | External skills require manual `npx skills add` |

---

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run unit tests (120 tests)
npm test

# Run smoke test against a synthetic SFDX project
npm run smoke-test

# Run CLI locally
node packages/cli/dist/index.js scan
node packages/cli/dist/index.js init --preset core --dry-run
```

### Repository Structure

```
packages/
├── core/               @ai-kit-salesforce/core — scan, plan, apply, diagnostics engine
│   └── src/
│       ├── scanner.ts          AI readiness scoring (21 signals)
│       ├── planner.ts          File planning by preset
│       ├── apply.ts            Safe file creation with backup
│       ├── templates.ts        All 35+ file templates inline
│       ├── inline-diagnostics.ts  Apex + LWC rule checks
│       ├── hover-provider.ts   Hover explanation lookup table
│       ├── org-context.ts      Org alias detection
│       ├── drift-detector.ts   Signal-based drift detection
│       ├── mcp-bootstrap.ts    MCP config generation + validation
│       ├── deploy-preview.ts   Component classification + risk detection
│       ├── agentforce-detector.ts  Agentforce metadata scanner
│       ├── skills-picker.ts    Installed skill enumeration
│       └── claude-mem-mode.ts  claude-mem mode JSON generator
├── cli/                ai-kit-sf — 14 CLI commands via commander
└── vscode-extension/   VS Code / Cursor extension (15 commands, 4 providers)
    └── src/providers/
        ├── diagnostics-provider.ts  Real-time Apex + LWC diagnostics (400ms debounce)
        ├── hover-provider.ts        Markdown hover with docs links
        ├── status-bar-provider.ts   Score + org alias status bar
        └── team-sync-provider.ts    Background team config check on startup
examples/
└── existing-project-before/   Synthetic Salesforce DX project with anti-patterns
scripts/
└── smoke-test.mjs             End-to-end smoke test (39 assertions)
```

---

## Publishing

### CLI to npm

```bash
cd packages/cli
npm run build
npm publish
```

The CLI publishes as `@ai-kit-salesforce/cli` on npm, so users can run `npx @ai-kit-salesforce/cli init`.

### VS Code Extension to Marketplace

```bash
# Install vsce
npm install -g @vscode/vsce

# Package
cd packages/vscode-extension
npm run package   # produces ai-kit-salesforce-0.1.0.vsix

# Publish (requires Marketplace publisher token)
npm run publish
```

Publisher: `ai-kit-salesforce` — register at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)

---

## Author

Built by **[Nikhil Karkra](https://github.com/karkranikhil)**.

## License

MIT © Nikhil Karkra — see [LICENSE](./LICENSE)
