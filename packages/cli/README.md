# @ai-kit-salesforce/cli

Command-line tool for [AI-Kit for Salesforce](https://marketplace.visualstudio.com/items?itemName=ai-kit-salesforce.ai-kit-salesforce).

Makes every Salesforce DX project AI-ready in minutes — generates Cursor rules, Claude Code config, Salesforce DX MCP setup, skills, agents, and guardrails from the terminal.

---

## Installation

Run without installing:

```bash
npx @ai-kit-salesforce/cli init
```

Or install globally:

```bash
npm install -g @ai-kit-salesforce/cli
ai-kit-sf init
```

---

## Quick Start

Open your Salesforce DX project folder in a terminal and run:

```bash
# Step 1 — See what is missing
npx @ai-kit-salesforce/cli scan

# Step 2 — Apply the full setup
npx @ai-kit-salesforce/cli init

# Step 3 — Configure MCP for your org
npx @ai-kit-salesforce/cli bootstrap-mcp
```

That's it. Your project has Cursor rules, CLAUDE.md, MCP config, skills, agents, and guardrails.

---

## Commands

| Command | Description |
|---------|-------------|
| `scan` | Show AI readiness score and list missing items |
| `init` | Full setup — scan, select preset, create all missing files |
| `bootstrap-mcp` | Generate `.cursor/mcp.json` and `.mcp.json` for your org |
| `check-drift` | Check whether AI setup files are still aligned with best practices |
| `deploy-preview` | Preview components that would be deployed and detect risks |
| `agentforce-scan` | Scan `force-app/` for Agentforce metadata and get recommendations |
| `doctor` | Full configuration health check |
| `add-cursor` | Add Cursor rules only |
| `add-claude` | Add Claude Code config only |
| `add-mcp` | Add MCP docs and rule only |
| `add-jags-skills` | Add Cursor skill templates |
| `add-afv-library` | Add Salesforce AFV Library guide |
| `add-claude-mem` | Generate a `claude-mem` Salesforce DX mode file |
| `pick-skill` | List installed skills and copy an `@mention` reference |

---

## Options

Most commands support these flags:

| Flag | Description |
|------|-------------|
| `--path <path>` | Path to the project root (defaults to current directory) |
| `--preset <name>` | Setup preset: `core`, `lwc`, `agentforce`, `data-cloud`, `experience-cloud` |
| `--dry-run` | Preview changes without writing any files |
| `--yes` | Skip confirmation prompts |

Example:

```bash
npx @ai-kit-salesforce/cli init --preset agentforce --yes --dry-run
```

---

## What Gets Created

Running `init --preset core` creates the following files if they do not already exist:

```
AGENTS.md                    AI tool usage guide
CLAUDE.md                    Claude Code rules and workflow orchestration
tasks/todo.md                AI task tracker
tasks/lessons.md             Lessons learned log

.cursor/rules/               6 Cursor rule files (Apex, LWC, MCP, Deployment, Safety, Project)
.cursor/skills/              6 skill templates (Apex, LWC, Flow, Security, Agentforce, Data Cloud)
.claude/commands/            6 slash commands
.claude/agents/              5 sub-agent definitions
docs/                        9 reference documentation files
```

Existing files are never overwritten. A backup is created before any file is modified.

---

## Requirements

- Node.js 18 or later
- A Salesforce DX project with `sfdx-project.json` at the root

---

## Related

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ai-kit-salesforce.ai-kit-salesforce) — real-time inline diagnostics, status bar, and all commands inside VS Code and Cursor
- [@ai-kit-salesforce/core](https://www.npmjs.com/package/@ai-kit-salesforce/core) — the underlying engine if you want to build your own tooling

---

## Author

[Nikhil Karkra](https://github.com/karkranikhil)

## License

MIT
