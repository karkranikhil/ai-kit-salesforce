# SF AI Toolkit

> Turn any Salesforce DX repo into an AI-ready, security-first engineering workspace in minutes.

SF AI Toolkit is a VS Code/Cursor extension and CLI that standardizes AI workflows for Salesforce teams. It scaffolds safe defaults, MCP-first org guidance, diagnostics, and repeatable team guardrails for Cursor, Claude Code, Windsurf, GitHub Copilot, and any MCP-capable tool.

---

## Quick Start

> **Full walkthrough:** [docs/getting-started.md](docs/getting-started.md)

### VS Code / Cursor (recommended)

Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=NikhilKarkra.sf-ai-toolkit), open your Salesforce DX project, and run:

**SF AI Toolkit: Scan Salesforce Project** → see your readiness score  
**SF AI Toolkit: Apply Recommended Setup** → scaffold all missing files in one click

### CLI

```bash
# Run without installing
npx @sf-ai-toolkit/cli init

# Or install globally
npm install -g @sf-ai-toolkit/cli
sf-ai-toolkit init
```

---

## Feature Overview

| # | Feature | VS Code | CLI | Description |
|---|---------|:-------:|:---:|-------------|
| 1 | **AI Readiness Score** | ✓ | ✓ | Scans project and scores AI-readiness 0–100 across 21 signals |
| 2 | **Live Status Bar** | ✓ | — | Shows current score + org alias, refreshes when files change |
| 3 | **One-Command Setup** | ✓ | ✓ | `init` scaffolds all missing files for the chosen preset in one step |
| 4 | **5 Setup Presets** | ✓ | ✓ | core · lwc · agentforce · data-cloud · experience-cloud |
| 5 | **Never Overwrites Files** | ✓ | ✓ | Safe-write: every existing file is skipped; backups created before any modify |
| 6 | **Cursor Rules** | ✓ | ✓ | Generates `.cursor/rules/` for Apex, LWC, MCP, Deployment, Safety, Project |
| 7 | **Claude Code Config** | ✓ | ✓ | Generates `CLAUDE.md`, `AGENTS.md`, slash commands, sub-agents |
| 8 | **Windsurf Rules** | ✓ | ✓ | Generates `.windsurfrules` with full Salesforce guardrails |
| 9 | **GitHub Copilot Instructions** | ✓ | ✓ | Generates `.github/copilot-instructions.md` |
| 10 | **Workflow Orchestration** | ✓ | ✓ | CLAUDE.md includes Plan Mode, Subagent Strategy, Self-Improvement Loop |
| 11 | **Task Management Files** | ✓ | ✓ | Generates `tasks/todo.md` and `tasks/lessons.md` for AI task tracking |
| 12 | **40 Cursor Skills** | ✓ | ✓ | 11 SF AI Toolkit architect-level + 29 AFV-compatible skills |
| 13 | **Claude Agents** | ✓ | ✓ | 5 sub-agent definitions: Architect, Apex Dev, LWC Dev, QA Tester, Security |
| 14 | **Claude Slash Commands** | ✓ | ✓ | 6 commands: /review-security, /validate-deploy, /write-tests, /create-apex, /create-lwc, /prepare-pr |
| 15 | **Apex Inline Diagnostics** | ✓ | — | Real-time squiggles for 9 Apex anti-patterns in `.cls` and `.trigger` files |
| 16 | **LWC JS Diagnostics** | ✓ | — | Real-time squiggles for 4 LWC JS anti-patterns |
| 17 | **LWC HTML Diagnostics** | ✓ | — | Real-time squiggles for 4 LWC template anti-patterns |
| 18 | **Hover Explanations** | ✓ | — | Hover over any diagnostic: title, explanation, fix suggestion, docs link |
| 19 | **Org Context Awareness** | ✓ | ✓ | Reads `.sf/config.json` and `sfdx-project.json` for current target org |
| 20 | **MCP Bootstrap** | ✓ | ✓ | One-command Salesforce DX MCP config for both Cursor and Claude Code |
| 21 | **MCP Config Validation** | ✓ | ✓ | Detects combined-args anti-pattern, missing org alias, invalid JSON |
| 22 | **Deploy Preview** | — | ✓ | Classifies all components to deploy; detects risks; shows `sf` commands |
| 23 | **Production Safety Gate** | — | ✓ | Blocks deploy-preview for production orgs unless `--confirm-production` |
| 24 | **Template Drift Detection** | ✓ | ✓ | Signal-based check: are your AI setup files still aligned with best practices? |
| 25 | **Team Config Sync** | ✓ | ✓ | Compare local files against a remote team JSON config URL |
| 26 | **Agentforce Detector** | ✓ | ✓ | Finds `@InvocableMethod`, prompt templates, agent topics in `force-app/` |
| 27 | **Skills Picker** | ✓ | ✓ | Browse installed skills and copy `@mention` references to clipboard |
| 28 | **claude-mem Salesforce Mode** | ✓ | ✓ | Generates a `salesforce-dx.json` mode file for the `claude-mem` memory system |
| 29 | **AFV Library Support** | ✓ | ✓ | Adds Salesforce AFV Library docs and 29 bundled skill templates |
| 30 | **Agentforce Vibes Guide** | ✓ | ✓ | Full `docs/agentforce-vibes-setup.md` covering the complete AI tool stack |
| 31 | **Doctor Command** | — | ✓ | Comprehensive config health check: org, MCP, drift, missing files |
| 32 | **Dry-Run Mode** | ✓ | ✓ | Preview all planned changes without writing anything |
| 33 | **Backup on Modify** | ✓ | ✓ | Timestamped backup in `.sf-ai-toolkit-backup/` before any file is modified |
| 34 | **Readiness Report Webview** | ✓ | — | Rich HTML report: score, missing items, org banner, drift summary |
| 35 | **Drift Report Webview** | ✓ | — | Table view of drifted / missing / up-to-date tracked files |
| 36 | **Team Sync Webview** | ✓ | — | Rich HTML team config comparison report |

---

## Inline Diagnostics Reference

### Apex (`.cls`, `.trigger`)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `no-soql-in-loop` | Error | SOQL query inside a `for`/`while` loop — governor limit violation |
| `no-dml-in-loop` | Error | DML statement (`insert`/`update`/`delete`/`upsert`) inside a loop |
| `no-seealldata` | Error | `@IsTest(SeeAllData=true)` — fragile, environment-dependent tests |
| `missing-sharing-declaration` | Warning | Class missing `with sharing` / `without sharing` keyword |
| `no-without-sharing-bypass` | Warning | `without sharing` used without an explanatory comment |
| `no-hardcoded-id` | Warning | 15- or 18-character Salesforce ID literal in source |
| `no-debug-pii` | Warning | `System.debug` with sensitive keywords (email, password, token, etc.) |
| `no-naked-catch` | Warning | Empty `catch` block — swallows exceptions silently |
| `missing-test-setup` | Warning | Test class with >1 `@IsTest` method but no `@TestSetup` |

### LWC JavaScript (`.js` inside `lwc/`)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `no-console-log` | Warning | `console.log/warn/error` left in production code |
| `no-inner-html` | Error | Direct `innerHTML` assignment — XSS risk in Locker Service |
| `no-hardcoded-url` | Warning | Hardcoded `/apex/`, `/lightning/`, or `/s/` URL |
| `missing-wire-error-handler` | Warning | `@wire` adapter without `error` property handling |

### LWC HTML Templates (`.html` inside `lwc/`)

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `missing-key-iterator` | Error | `for:each` iterator missing required `key=` attribute |
| `no-aura-syntax` | Error | `aura:*` tags/attributes used in an LWC template |
| `no-onclick-inline` | Error | Inline `onclick="handler()"` string instead of `onclick={handler}` binding |

---

## CLI Commands

Install once globally:

```bash
npm install -g @sf-ai-toolkit/cli
```

| Command | Description |
|---------|-------------|
| `sf-ai-toolkit scan` | Show AI readiness score and missing items |
| `sf-ai-toolkit init` | Full setup — scan, select preset, apply all missing files |
| `sf-ai-toolkit add-cursor` | Add Cursor rules only |
| `sf-ai-toolkit add-claude` | Add Claude Code config only (CLAUDE.md, commands, agents) |
| `sf-ai-toolkit add-mcp` | Add MCP usage guide and Cursor MCP rule |
| `sf-ai-toolkit add-afv-skills` | Add 40 skill templates (11 architect-level + 29 AFV-compatible) |
| `sf-ai-toolkit add-afv-library` | Add Salesforce AFV Library guide |
| `sf-ai-toolkit add-hooks` | Add configurable Git hooks (PMD + commit message policy) |
| `sf-ai-toolkit bootstrap-mcp` | Generate `.cursor/mcp.json` and `.mcp.json` for the target org |
| `sf-ai-toolkit check-drift` | Check if AI setup files have drifted from best practices |
| `sf-ai-toolkit deploy-preview` | Preview deployment components and risks |
| `sf-ai-toolkit agentforce-scan` | Detect Agentforce metadata and get recommendations |
| `sf-ai-toolkit add-claude-mem` | Generate claude-mem Salesforce DX mode file |
| `sf-ai-toolkit pick-skill` | Browse installed skills and copy `@mention` to clipboard |
| `sf-ai-toolkit doctor` | Comprehensive configuration health check |

All write commands support `--dry-run` to preview changes without modifying files.

---

## VS Code Commands

Open the Command Palette (`Cmd+Shift+P`) and search for **SF AI Toolkit**:

| Command | Description |
|---------|-------------|
| SF AI Toolkit: Scan Salesforce Project | Full scan with webview readiness report |
| SF AI Toolkit: Apply Recommended Setup | Scaffolds missing files for the selected preset |
| SF AI Toolkit: Open Readiness Report | Re-opens the last scan report |
| SF AI Toolkit: Add Cursor Rules | Adds `.cursor/rules/` files only |
| SF AI Toolkit: Add Cursor Skills | Adds `.cursor/skills/` templates only |
| SF AI Toolkit: Add Claude Code Setup | Adds `CLAUDE.md`, agents, and slash commands only |
| SF AI Toolkit: Add MCP Guardrails | Adds MCP docs and rule only |
| SF AI Toolkit: Add AFV Skill Templates (40) | Adds all 40 skill templates |
| SF AI Toolkit: Bootstrap MCP Config | Generates MCP config for your org alias |
| SF AI Toolkit: Check Template Drift | Opens drift report webview |
| SF AI Toolkit: Add claude-mem Salesforce Mode | Generates `docs/claude-mem/salesforce-dx.json` |
| SF AI Toolkit: Insert Skill Reference | Browse skills, copy `@mention` to clipboard |
| SF AI Toolkit: Check Team Sync | Compare local files against a team config URL |

---

## Setup Presets

| Preset | What it adds |
|--------|-------------|
| `core` | AI_INSTRUCTIONS.md, AGENTS.md, CLAUDE.md, .windsurfrules, .github/copilot-instructions.md, tasks/, Cursor rules (6), Cursor skills (40), Claude commands (6), Claude agents (5), docs (13) |
| `lwc` | Everything in `core` + extra LWC-focused rules |
| `agentforce` | Everything in `core` + Agentforce rules and AFV Library guide |
| `data-cloud` | Everything in `core` + Data Cloud docs |
| `experience-cloud` | Everything in `core` + Experience Cloud rules |

---

## Files Generated

`sf-ai-toolkit init --preset core` creates these files if they do not already exist:

```
AI_INSTRUCTIONS.md                     Canonical cross-tool AI policy
AGENTS.md                              AI tool usage guide for the project
CLAUDE.md                              Claude Code rules + workflow orchestration
.windsurfrules                         Windsurf native rules
.github/
└── copilot-instructions.md            GitHub Copilot repo-level instructions
tasks/
├── todo.md                            AI task tracker
└── lessons.md                         Lessons learned log

.cursor/
├── rules/
│   ├── project.mdc                    Master workflow rules
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
    ├── salesforce-data-cloud/SKILL.md
    ├── salesforce-apex-tests/SKILL.md
    ├── salesforce-deployment/SKILL.md
    ├── salesforce-pr-review/SKILL.md
    ├── salesforce-commit-message/SKILL.md
    ├── salesforce-permissions/SKILL.md
    └── afv-*/SKILL.md  (29 AFV-compatible skills)

.claude/
├── commands/
│   ├── review-security.md
│   ├── validate-deploy.md
│   ├── write-tests.md
│   ├── create-apex.md
│   ├── create-lwc.md
│   └── prepare-pr.md
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
├── mcp-usage.md
├── codex-setup.md
├── antigravity-setup.md
├── cursor-setup.md
├── claude-code-setup.md
├── afv-library.md
├── skills-ecosystem.md
└── agentforce-vibes-setup.md
```

Also safely updates:
- `.forceignore` — adds recommended entries if missing
- `package.json` — adds missing scripts (lint, format, test:apex, validate, deploy)

---

## AI Tool Compatibility

| AI Tool | Config File | How SF AI Toolkit Helps |
|---------|-------------|------------------------|
| Cursor | `.cursor/rules/` + `.cursor/skills/` | Rules, 40 skills, MCP bootstrap |
| Claude Code | `CLAUDE.md` + `.claude/` | Workflow orchestration, agents, slash commands |
| Windsurf | `.windsurfrules` | Native rule file with full Salesforce guardrails |
| GitHub Copilot | `.github/copilot-instructions.md` | Repo-level Salesforce coding instructions |
| VS Code | SF AI Toolkit extension | Inline diagnostics, status bar, readiness report |
| Any MCP tool | `.mcp.json` | Salesforce DX MCP bootstrap + org-safe guidance |

---

## Salesforce DX MCP Setup

```bash
sf-ai-toolkit bootstrap-mcp
# Prompts for your org alias and writes:
#   .cursor/mcp.json  (Cursor)
#   .mcp.json         (Claude Code)
```

Or use the VS Code command: **SF AI Toolkit: Bootstrap MCP Config**

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

---

## Team Config Sync

Teams can publish an `ai-kit-team.json` config file to a URL and have SF AI Toolkit auto-check for drift on workspace open.

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
  "sf-ai-toolkit.teamConfigUrl": "https://raw.githubusercontent.com/your-org/repo/main/ai-kit-team.json"
}
```

SF AI Toolkit silently checks on workspace open and shows a notification if drift is detected.

---

## SF AI Toolkit vs AFV Library

| Dimension | SF AI Toolkit | AFV Library |
|-----------|---------------|-------------|
| Primary goal | Make a repo AI-ready end-to-end | Reusable Salesforce implementation patterns |
| Main output | Guardrails, rules, skills, diagnostics, orchestration docs | Reference assets and domain patterns |
| Setup model | One-command scaffold + scan + drift checks | Library consumption and selective adoption |
| Team consistency | Built-in drift + team sync checks | Depends on team process |
| Best together | Use SF AI Toolkit to standardize workflow, AFV skills for domain depth | Use AFV assets inside SF AI Toolkit-governed repos |

---

## Security Model

| Guarantee | Details |
|-----------|---------|
| Never overwrites | Skips any file that already exists |
| Backup before modify | `.sf-ai-toolkit-backup/YYYY-MM-DD-HHMMSS/` |
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

# Run tests (123 tests)
npm test
```

### Repository Structure

```
packages/
├── core/               @sf-ai-toolkit/core — scan, plan, apply, diagnostics engine
├── cli/                @sf-ai-toolkit/cli — 15 CLI commands via commander
└── vscode-extension/   VS Code / Cursor extension (15 commands, 4 providers)
examples/
└── existing-project-before/   Synthetic Salesforce DX project for demos
```

---

## Related

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=NikhilKarkra.sf-ai-toolkit)
- [@sf-ai-toolkit/cli on npm](https://www.npmjs.com/package/@sf-ai-toolkit/cli)
- [@sf-ai-toolkit/core on npm](https://www.npmjs.com/package/@sf-ai-toolkit/core)
- [Salesforce AFV Library](https://github.com/forcedotcom/afv-library)

---

## Author

Built by **[Nikhil Karkra](https://github.com/karkranikhil)**.

## License

MIT © Nikhil Karkra — see [LICENSE](./LICENSE)
