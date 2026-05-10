# Getting Started with SF AI Toolkit

This guide walks you through setting up SF AI Toolkit in a Salesforce DX project from scratch — from installation to using skills in your AI editor of choice.

---

## Prerequisites

Before you start, make sure you have:

- A Salesforce DX project with `sfdx-project.json` at the root
- Node.js 18 or later (`node --version` to check)
- VS Code, Cursor, or Windsurf (or a terminal if using the CLI only)
- Salesforce CLI (`sf --version` to check) — needed for MCP and deploy commands

---

## Step 1 — Install

Choose your preferred entry point. Both do the same thing under the hood.

### Option A: VS Code / Cursor Extension (recommended)

1. Open VS Code or Cursor
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search **SF AI Toolkit**
4. Click **Install**

The extension activates automatically when you open a folder with `sfdx-project.json`.

### Option B: CLI

```bash
# Install globally (run once)
npm install -g @sf-ai-toolkit/cli

# Or run without installing
npx @sf-ai-toolkit/cli init
```

---

## Step 2 — Scan Your Project

Before making any changes, scan to see your current AI readiness score.

**VS Code / Cursor:**
1. Open Command Palette (`Cmd+Shift+P`)
2. Run: **SF AI Toolkit: Scan Salesforce Project**
3. A readiness report opens — note your score and what is missing

**CLI:**
```bash
sf-ai-toolkit scan
```

The score is 0–100 across 21 signals: CLAUDE.md, Cursor rules, skills, MCP config, docs, task files, and more. A bare Salesforce DX project typically scores 20–30.

---

## Step 3 — Apply the Setup

This is the main command. It creates all missing files for your chosen preset without touching anything that already exists.

**VS Code / Cursor:**
1. Open Command Palette → **SF AI Toolkit: Apply Recommended Setup**
2. Select a preset:
   - `core` — standard Salesforce DX project (start here)
   - `agentforce` — building Agentforce agents
   - `lwc` — heavy LWC development
   - `data-cloud` — Data Cloud integrations
   - `experience-cloud` — Experience Cloud projects
3. Confirm — watch the files get created

**CLI:**
```bash
# Interactive (recommended first time)
sf-ai-toolkit init

# Non-interactive
sf-ai-toolkit init --preset core --yes

# Preview without writing anything
sf-ai-toolkit init --preset core --dry-run
```

**What gets created (core preset):**

```
AI_INSTRUCTIONS.md              Cross-tool AI policy (all tools read this)
AGENTS.md                       Project context and AI tool usage guide
CLAUDE.md                       Claude Code rules and workflow orchestration
.windsurfrules                  Windsurf native rules
.github/
└── copilot-instructions.md     GitHub Copilot repo-level instructions
tasks/
├── todo.md                     AI task tracker
└── lessons.md                  Lessons learned log

.cursor/rules/                  6 Cursor rule files
.cursor/skills/                 40 skill templates (11 architect + 29 AFV)
.claude/commands/               6 slash commands
.claude/agents/                 5 sub-agent definitions
docs/                           Reference docs for all tools
```

> Existing files are never overwritten. A timestamped backup is created before any file is modified.

---

## Step 4 — Configure MCP for Your Org

MCP (Model Context Protocol) lets AI tools like Cursor and Claude Code talk directly to your Salesforce org — running SOQL, describing metadata, and more.

**VS Code / Cursor:**
1. Open Command Palette → **SF AI Toolkit: Bootstrap MCP Config**
2. Your current org alias is detected automatically and pre-filled
3. Press Enter to confirm (or type a different alias)
4. Two files are created: `.cursor/mcp.json` and `.mcp.json`
5. **Restart Cursor or VS Code** to activate MCP

**CLI:**
```bash
sf-ai-toolkit bootstrap-mcp
# Detected org: my-scratch-org
# Enter your Salesforce org alias: [my-scratch-org]  ← press Enter
```

**What gets configured:**

| Toolset | What the AI can do |
|---------|-------------------|
| `orgs` | List orgs, switch target org |
| `metadata` | Describe metadata, query components |
| `data` | Run SOQL queries against your org |
| `users` | List users, check permissions |
| `lwc-experts` | LWC-specific guidance |

To verify MCP is working, open Cursor and ask: _"List my Salesforce orgs"_ — it should respond with your connected orgs.

---

## Step 5 — Verify Everything

Run a health check to confirm the full setup is correct.

**CLI:**
```bash
sf-ai-toolkit doctor
```

**VS Code:**
1. Open Command Palette → **SF AI Toolkit: Scan Salesforce Project**
2. Score should now be 85+ if all steps completed

If anything is flagged, the doctor command tells you exactly which command to run to fix it.

---

## Step 6 — Use Skills in Your AI Tool

Skills are the most powerful part of the setup. They give your AI tool deep Salesforce knowledge when you need it.

### Cursor

Type `@` in the chat panel and select a skill from the dropdown:

```
@salesforce-apex review this trigger for bulkification issues
@salesforce-security-review check this class for CRUD/FLS violations
@salesforce-agentforce how should I structure this Agentforce topic?
@afv-developing-agentforce scaffold an agent topic for case management
```

Skills are loaded from `.cursor/skills/` — project-level, shared by the whole team.

### Claude Code

Skills work the same way — type `@skill-name` in chat:

```
@salesforce-apex
@salesforce-deployment
@salesforce-pr-review
```

Also use the built-in slash commands from `.claude/commands/`:

```
/review-security      — security review checklist for changed files
/validate-deploy      — validate before deploying
/write-tests          — generate Apex test class
/create-apex          — scaffold Apex service/selector/domain
/create-lwc           — scaffold LWC component
/prepare-pr           — generate PR description
```

And sub-agents from `.claude/agents/`:

```
"Ask the apex-developer agent to build a service class for this requirement"
"Ask the security-reviewer agent to check this before we deploy"
```

### Windsurf

`.windsurfrules` is read automatically. No extra steps needed — Windsurf applies the Salesforce guardrails on every conversation in this project.

### GitHub Copilot

`.github/copilot-instructions.md` is read automatically by GitHub Copilot. No extra steps needed — it applies Salesforce coding standards to all suggestions in this repo.

---

## Step 7 — Commit to Git

Generated files should be committed so every team member gets the same setup.

```bash
git add \
  AI_INSTRUCTIONS.md \
  AGENTS.md \
  CLAUDE.md \
  .windsurfrules \
  .github/copilot-instructions.md \
  tasks/ \
  .cursor/rules/ \
  .cursor/skills/ \
  .claude/ \
  docs/

git commit -m "chore: add SF AI Toolkit setup"
```

> **Do not commit** `.mcp.json` or `.cursor/mcp.json` if they contain a personal org alias. Add them to `.gitignore` or replace the alias with a placeholder. For team MCP configs, use the Team Config Sync feature instead.

---

## Step 8 — Team Setup (Optional)

If your whole team uses this project, you can enforce consistent AI setup across all developers automatically.

**1. Publish a team config file** to a URL your team can access (e.g. a raw GitHub URL):

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

**2. Add the URL to shared VS Code settings** (`.vscode/settings.json` committed to the repo):

```json
{
  "sf-ai-toolkit.teamConfigUrl": "https://raw.githubusercontent.com/your-org/your-repo/main/ai-kit-team.json"
}
```

**3. Auto-check on startup** — SF AI Toolkit silently checks on every workspace open and notifies the developer if their local files have drifted from the team standard.

To run a manual check:
```bash
sf-ai-toolkit check-drift
```

Or in VS Code: **SF AI Toolkit: Check Team Sync**

---

## Troubleshooting

**Extension not activating?**
- Make sure your project has `sfdx-project.json` at the root
- Check the VS Code output panel → select "SF AI Toolkit" from the dropdown

**MCP not working in Cursor?**
- Restart Cursor after bootstrap — MCP servers are loaded on startup
- Run `sf-ai-toolkit scan` and check for MCP validation errors
- Make sure your org alias is correct: `sf org display`

**Score is low after init?**
- Run `sf-ai-toolkit doctor` for a full diagnosis
- Some signals (e.g. force-app/) require you to have a Salesforce DX project structure

**Files not created?**
- Check that your terminal is in the project root (same folder as `sfdx-project.json`)
- Try `sf-ai-toolkit init --dry-run` to see what would be created

---

## What's Next

- Read `docs/mcp-usage.md` for advanced MCP configuration (read-only production orgs, multiple orgs)
- Read `docs/agentforce-vibes-setup.md` if you're building Agentforce agents
- Read `docs/afv-library.md` to install the full official Salesforce AFV Library skills
- Run `sf-ai-toolkit deploy-preview` before any deployment to see component risk analysis
- Run `sf-ai-toolkit agentforce-scan` to detect Agentforce metadata in your project
