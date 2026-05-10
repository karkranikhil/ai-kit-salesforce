# AI-Kit for Salesforce

**Make every Salesforce DX project AI-ready in minutes.**

AI-Kit for Salesforce is a VS Code and Cursor extension that scaffolds everything an AI coding assistant needs to work safely and effectively inside a Salesforce DX project. It generates Cursor rules, Claude Code configuration, Salesforce DX MCP setup, real-time Apex and LWC diagnostics, Agentforce context detection, team config sync, and more — without overwriting any existing files.

---

## The Problem It Solves

Every Salesforce developer using Cursor or Claude Code has to manually configure MCP, write Cursor rules, set up CLAUDE.md, add skills, and figure out guardrails from scratch for every project. There is no standard. Every project ends up different.

AI-Kit for Salesforce solves this with one command. Open a Salesforce DX project, run the setup, and your project has everything configured correctly — consistent across every developer and every project in your team.

---

## Installation

Install from the VS Code Marketplace:

1. Open VS Code or Cursor
2. Go to the Extensions panel (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for **AI-Kit for Salesforce**
4. Click **Install**

The extension activates automatically when you open a folder containing `sfdx-project.json`.

---

## Getting Started

### Step 1 — Scan your project

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:

```
AI-Kit: Scan Salesforce Project
```

This scans your project and opens a readiness report showing your AI readiness score (0–100), what is missing, and what is already configured. The score also appears in the status bar at the bottom of the window.

### Step 2 — Apply the setup

Run:

```
AI-Kit: Apply Recommended Setup
```

Select a preset (start with `core` for any standard Salesforce DX project) and confirm. AI-Kit creates all missing files. Existing files are never overwritten.

### Step 3 — Configure MCP for your org

Run:

```
AI-Kit: Bootstrap MCP Config
```

Enter your Salesforce org alias when prompted. AI-Kit generates:

- `.cursor/mcp.json` — MCP configuration for Cursor
- `.mcp.json` — MCP configuration for Claude Code

Both files use the correct `args[]` array format. Restart Cursor or VS Code to activate.

### Step 4 — Open a Salesforce file

Open any `.cls`, `.trigger`, or LWC `.js`/`.html` file. Inline diagnostics appear automatically as red and yellow underlines for detected anti-patterns. Hover over any underline for an explanation, fix suggestion, and link to the relevant Salesforce documentation.

---

## What Gets Created

Running **AI-Kit: Apply Recommended Setup** with the `core` preset creates the following files if they do not already exist:

```
AGENTS.md                              AI tool usage guide for the project
CLAUDE.md                              Claude Code rules and workflow orchestration
tasks/todo.md                          AI task tracker
tasks/lessons.md                       Lessons learned log

.cursor/rules/
    project.mdc                        Master workflow rules (always applied)
    apex.mdc                           Apex coding standards
    lwc.mdc                            LWC coding standards
    salesforce-mcp.mdc                 MCP-first org operation rules
    deployment.mdc                     Deployment safety gates
    safety.mdc                         Security guardrails

.cursor/skills/
    salesforce-apex/SKILL.md
    salesforce-lwc/SKILL.md
    salesforce-flow/SKILL.md
    salesforce-security-review/SKILL.md
    salesforce-agentforce/SKILL.md
    salesforce-data-cloud/SKILL.md

.claude/commands/                      6 slash commands for common workflows
.claude/agents/                        5 sub-agent definitions
docs/                                  9 reference documentation files
```

---

## Presets

Choose the preset that matches your project type when running the setup:

| Preset | Use For |
|--------|---------|
| `core` | Any standard Salesforce DX project |
| `lwc` | Projects with heavy Lightning Web Component development |
| `agentforce` | Projects building Agentforce agents |
| `data-cloud` | Projects using Salesforce Data Cloud |
| `experience-cloud` | Experience Cloud and Community projects |

---

## Inline Diagnostics

Diagnostics appear automatically when you open supported files. No configuration required.

### Apex — `.cls` and `.trigger` files

| Rule | Severity | Description |
|------|----------|-------------|
| `no-soql-in-loop` | Error | SOQL query inside a loop — governor limit violation |
| `no-dml-in-loop` | Error | DML operation inside a loop — 150 DML statement limit |
| `no-seealldata` | Error | `@IsTest(SeeAllData=true)` — fragile, org-dependent tests |
| `missing-sharing-declaration` | Warning | Class declared without explicit `with sharing` keyword |
| `no-without-sharing-bypass` | Warning | `without sharing` used without an explanatory comment |
| `no-hardcoded-id` | Warning | 15 or 18-character Salesforce ID literal in source code |
| `no-debug-pii` | Warning | `System.debug` statement that may log sensitive data |
| `no-naked-catch` | Warning | Empty catch block that silently swallows exceptions |
| `missing-test-setup` | Warning | Test class with multiple test methods but no `@TestSetup` |

### LWC JavaScript — `.js` files inside `lwc/`

| Rule | Severity | Description |
|------|----------|-------------|
| `no-console-log` | Warning | `console.log()` or similar left in production code |
| `no-inner-html` | Error | Direct `innerHTML` assignment — XSS risk in Locker Service |
| `no-hardcoded-url` | Warning | Hardcoded Salesforce URL that breaks across orgs |
| `missing-wire-error-handler` | Warning | `@wire` adapter used without error property handling |

### LWC HTML — `.html` files inside `lwc/`

| Rule | Severity | Description |
|------|----------|-------------|
| `missing-key-iterator` | Error | `for:each` iterator missing the required `key=` attribute |
| `no-aura-syntax` | Error | `aura:*` tags or attributes inside an LWC template |
| `no-onclick-inline` | Error | Inline `onclick="handler()"` string instead of `onclick={handler}` binding |

Hover over any underlined code to see the rule title, a detailed explanation, a suggested fix, and a direct link to the relevant Salesforce documentation page.

---

## Commands

Open the Command Palette (`Cmd+Shift+P`) and search for **AI-Kit**:

| Command | Description |
|---------|-------------|
| AI-Kit: Scan Salesforce Project | Scan the project and open the readiness report |
| AI-Kit: Apply Recommended Setup | Scaffold all missing files for the selected preset |
| AI-Kit: Bootstrap MCP Config | Generate MCP configuration for Cursor and Claude Code |
| AI-Kit: Check Template Drift | Check whether your AI files are still aligned with best practices |
| AI-Kit: Check Team Sync | Compare local files against your team config URL |
| AI-Kit: Add Cursor Rules | Add `.cursor/rules/` files only |
| AI-Kit: Add Cursor Skills | Add `.cursor/skills/` templates only |
| AI-Kit: Add Claude Code Setup | Add `CLAUDE.md`, agents, and slash commands only |
| AI-Kit: Add MCP Guardrails | Add MCP documentation and rule only |
| AI-Kit: Add claude-mem Salesforce Mode | Generate `docs/claude-mem/salesforce-dx.json` |
| AI-Kit: Insert Skill Reference | Browse installed skills and copy an `@mention` to clipboard |

---

## Team Setup

If your entire team uses Cursor on Salesforce DX projects, you can enforce a consistent AI configuration across all developers automatically.

**Step 1** — Create a team config file and publish it to a URL your team can access (for example, a raw GitHub URL):

```json
{
  "version": "1.0",
  "requiredFiles": ["AGENTS.md", "CLAUDE.md", ".cursor/rules/apex.mdc"],
  "fileSignals": {
    ".cursor/rules/apex.mdc": ["Bulkify", "with sharing"]
  }
}
```

**Step 2** — Add the URL to your team's shared VS Code settings (`.vscode/settings.json` committed to your repos, or pushed via your MDM):

```json
{
  "ai-kit-salesforce.teamConfigUrl": "https://raw.githubusercontent.com/your-org/your-repo/main/ai-kit-team.json"
}
```

**Step 3** — AI-Kit checks automatically on workspace open. If any developer's project has drifted from the team standard, a notification appears with a link to a full drift report.

---

## Safety

AI-Kit is safe to run on existing projects:

| Behaviour | Detail |
|-----------|--------|
| Never overwrites files | Any file that already exists is skipped entirely |
| Backup before modify | A timestamped backup is created in `.ai-kit-salesforce-backup/` before any file is changed |
| Dry-run mode | Preview all planned changes before anything is written |
| No credentials required | No org login, no tokens, no authentication |
| No deployments | Never runs `sf project deploy` or any org-modifying command |
| No telemetry | No usage data is collected or transmitted |

---

## CLI

All features are available via the companion CLI without installing the extension:

```bash
npx @ai-kit-salesforce/cli scan
npx @ai-kit-salesforce/cli init --preset core --yes
npx @ai-kit-salesforce/cli bootstrap-mcp
npx @ai-kit-salesforce/cli deploy-preview
npx @ai-kit-salesforce/cli agentforce-scan
npx @ai-kit-salesforce/cli doctor
```

---

## Requirements

- VS Code 1.85 or later (or Cursor)
- Node.js 18 or later (for the CLI)
- A Salesforce DX project with `sfdx-project.json` at the root

---

## Author

Built by [Nikhil Karkra](https://github.com/karkranikhil)

## License

MIT
