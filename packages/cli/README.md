# @sf-ai-toolkit/cli

Command-line tool for [SF AI Toolkit](https://marketplace.visualstudio.com/items?itemName=NikhilKarkra.sf-ai-toolkit).

Makes every Salesforce DX project AI-ready in minutes — generates cross-tool guardrails for Cursor, Claude Code, Codex-style agents, Antigravity, and other MCP-capable workflows.

---

## Installation

Run without installing:

```bash
npx @sf-ai-toolkit/cli init
```

Or install globally:

```bash
npm install -g @sf-ai-toolkit/cli
sf-ai-toolkit init
```

---

## Quick Start

Open your Salesforce DX project folder in a terminal and run:

```bash
# Step 1 — See what is missing
npx @sf-ai-toolkit/cli scan

# Step 2 — Apply the full setup
npx @sf-ai-toolkit/cli init

# Step 3 — Configure MCP for your org
npx @sf-ai-toolkit/cli bootstrap-mcp
```

That's it. Your project has Cursor rules, cross-tool AI policy docs, CLAUDE.md, MCP config, skills, agents, and guardrails.

## 90-Second Demo

```bash
npx @sf-ai-toolkit/cli scan
npx @sf-ai-toolkit/cli init --preset core --yes
npx @sf-ai-toolkit/cli deploy-preview
npx @sf-ai-toolkit/cli doctor
```

This gives a full before/after story: score, auto-setup, deployment risk preview, and final health check.

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
| `add-afv-skills` | Add Salesforce AFV-compatible skill templates (40 skills) |
| `add-afv-library` | Add Salesforce AFV Library guide |
| `add-hooks` | Add configurable Git hooks (PMD + commit message policy) |
| `add-claude-mem` | Generate a `claude-mem` Salesforce DX mode file |
| `pick-skill` | List installed skills and copy an `@mention` reference |

## AI Tool Compatibility

| AI Tool | How This CLI Helps |
|---------|--------------------|
| Cursor | Scaffolds `.cursor/rules` and `.cursor/skills`, MCP bootstrap |
| Claude Code | Scaffolds `CLAUDE.md`, `.claude/commands`, `.claude/agents` |
| Codex-style agents | Generates `AI_INSTRUCTIONS.md` and shared policy docs |
| Antigravity-style agents | Uses shared policy docs + org-safe guardrails |
| Any MCP-capable assistant | Standardized MCP setup and workflow safety patterns |

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
npx @sf-ai-toolkit/cli init --preset agentforce --yes --dry-run
```

---

## What Gets Created

Running `init --preset core` creates the following files if they do not already exist:

```
AI_INSTRUCTIONS.md           Canonical cross-tool AI policy file
AGENTS.md                    AI tool usage guide
CLAUDE.md                    Claude Code rules and workflow orchestration
tasks/todo.md                AI task tracker
tasks/lessons.md             Lessons learned log

.cursor/rules/               6 Cursor rule files (Apex, LWC, MCP, Deployment, Safety, Project)
.cursor/skills/              40 skill templates (11 SF AI Toolkit + 29 AFV-compatible)
.claude/commands/            6 slash commands
.claude/agents/              5 sub-agent definitions
docs/                        11 reference documentation files (includes Codex and Antigravity setup)
```

## SF AI Toolkit vs AFV Library

SF AI Toolkit and AFV Library are complementary:
- SF AI Toolkit provides setup orchestration, safety guardrails, diagnostics, and team consistency workflows.
- AFV Library provides reusable Salesforce implementation assets and patterns.

## Configurable Team Standards

Use `add-hooks` to scaffold:
- `.githooks/pre-commit` (optional PMD command)
- `.githooks/commit-msg` (custom commit message policy)
- `sf-ai-toolkit.config.json` (team-overridable policy file)

One-time activation:

```bash
git config core.hooksPath .githooks
```

Existing files are never overwritten. A backup is created before any file is modified.

---

## Requirements

- Node.js 18 or later
- A Salesforce DX project with `sfdx-project.json` at the root

---

## Related

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=NikhilKarkra.sf-ai-toolkit) — real-time inline diagnostics, status bar, and all commands inside VS Code and Cursor
- [@sf-ai-toolkit/core](https://www.npmjs.com/package/@sf-ai-toolkit/core) — the underlying engine if you want to build your own tooling

---

## Author

[Nikhil Karkra](https://github.com/karkranikhil)

## License

MIT
