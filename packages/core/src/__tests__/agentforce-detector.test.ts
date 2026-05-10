import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { detectAgentforceContext } from '../agentforce-detector';

// ─── Temp dir helpers ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-kit-agentforce-test-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('detectAgentforceContext', () => {
  it('returns hasAgentforceMetadata: false for an empty project', async () => {
    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.hasAgentforceMetadata).toBe(false);
    expect(ctx.invocableActions).toHaveLength(0);
    expect(ctx.promptTemplates).toHaveLength(0);
    expect(ctx.agentTopics).toHaveLength(0);
  });

  it('detects @InvocableMethod in an Apex class and sets hasAgentforceMetadata', async () => {
    const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
    await fs.ensureDir(classesDir);

    await fs.writeFile(
      path.join(classesDir, 'CreateCaseAction.cls'),
      `public with sharing class CreateCaseAction {
  @InvocableMethod(label='Create Case' description='Creates a new case')
  public static List<Id> execute(List<String> subjects) {
    List<Case> cases = new List<Case>();
    for (String s : subjects) {
      cases.add(new Case(Subject = s));
    }
    insert cases;
    List<Id> ids = new List<Id>();
    for (Case c : cases) ids.add(c.Id);
    return ids;
  }
}`
    );

    // Another class without @InvocableMethod — should not be included
    await fs.writeFile(
      path.join(classesDir, 'AccountService.cls'),
      'public with sharing class AccountService { public void run() {} }'
    );

    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.hasAgentforceMetadata).toBe(true);
    expect(ctx.invocableActions).toContain('CreateCaseAction');
    expect(ctx.invocableActions).not.toContain('AccountService');
  });

  it('detects .prompt-meta.xml files', async () => {
    const promptsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'prompts');
    await fs.ensureDir(promptsDir);

    await fs.writeFile(
      path.join(promptsDir, 'CaseSummary.prompt-meta.xml'),
      '<PromptTemplate></PromptTemplate>'
    );
    await fs.writeFile(
      path.join(promptsDir, 'LeadEmailDraft.prompt-meta.xml'),
      '<PromptTemplate></PromptTemplate>'
    );

    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.hasAgentforceMetadata).toBe(true);
    expect(ctx.promptTemplates).toContain('CaseSummary');
    expect(ctx.promptTemplates).toContain('LeadEmailDraft');
  });

  it('detects .agentTopic-meta.xml files', async () => {
    const topicsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'agentTopics');
    await fs.ensureDir(topicsDir);

    await fs.writeFile(
      path.join(topicsDir, 'ServiceTopic.agentTopic-meta.xml'),
      '<AgentTopic></AgentTopic>'
    );

    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.hasAgentforceMetadata).toBe(true);
    expect(ctx.agentTopics).toContain('ServiceTopic');
  });

  it('detects .bot-meta.xml files as agent topics', async () => {
    const botsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'bots');
    await fs.ensureDir(botsDir);

    await fs.writeFile(
      path.join(botsDir, 'ServiceBot.bot-meta.xml'),
      '<Bot></Bot>'
    );

    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.hasAgentforceMetadata).toBe(true);
    expect(ctx.agentTopics).toContain('ServiceBot');
  });

  it('includes AFV Library recommendation when invocable actions found and no AFV skills', async () => {
    const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
    await fs.ensureDir(classesDir);

    await fs.writeFile(
      path.join(classesDir, 'MyAction.cls'),
      'public class MyAction { @InvocableMethod public static void run(List<String> args) {} }'
    );

    // No .cursor/skills directory — afvLibraryInstalled should be false
    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.afvLibraryInstalled).toBe(false);
    const afvRec = ctx.recommendations.find((r) => r.includes('AFV Library'));
    expect(afvRec).toBeDefined();
    expect(afvRec).toContain('npx skills add forcedotcom/afv-library');
  });

  it('does NOT add AFV Library recommendation when skills are already installed', async () => {
    const classesDir = path.join(tmpDir, 'force-app', 'main', 'default', 'classes');
    await fs.ensureDir(classesDir);

    await fs.writeFile(
      path.join(classesDir, 'MyAction.cls'),
      'public class MyAction { @InvocableMethod public static void run(List<String> args) {} }'
    );

    // Simulate installed AFV skills
    const skillsDir = path.join(tmpDir, '.cursor', 'skills', 'agentforce');
    await fs.ensureDir(skillsDir);
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), '# Agentforce Skill');

    const ctx = await detectAgentforceContext(tmpDir);

    expect(ctx.afvLibraryInstalled).toBe(true);
    const afvRec = ctx.recommendations.find((r) => r.includes('AFV Library skills available'));
    expect(afvRec).toBeUndefined();
  });

  it('includes prompt template security recommendation when prompt templates found', async () => {
    const promptsDir = path.join(tmpDir, 'force-app', 'main', 'default', 'prompts');
    await fs.ensureDir(promptsDir);

    await fs.writeFile(
      path.join(promptsDir, 'MyPrompt.prompt-meta.xml'),
      '<PromptTemplate></PromptTemplate>'
    );

    const ctx = await detectAgentforceContext(tmpDir);

    const secRec = ctx.recommendations.find((r) => r.includes('review-security'));
    expect(secRec).toBeDefined();
  });

  it('returns afvLibraryInstalled: false when skills dir does not exist', async () => {
    const ctx = await detectAgentforceContext(tmpDir);
    expect(ctx.afvLibraryInstalled).toBe(false);
  });
});
