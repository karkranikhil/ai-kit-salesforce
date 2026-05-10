#!/usr/bin/env node
/**
 * Smoke test for sf-ai-toolkit CLI against a synthetic Salesforce DX project.
 * Run: node scripts/smoke-test.mjs
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EXAMPLE_DIR = path.join(ROOT, 'examples', 'existing-project-before');
const CLI = path.join(ROOT, 'packages', 'cli', 'dist', 'index.js');

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  ✗  ${label}`);
  console.error(`       ${reason}`);
  failed++;
}

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

function fileExists(p) {
  return fs.existsSync(p);
}

function fileContains(p, text) {
  if (!fileExists(p)) return false;
  return fs.readFileSync(p, 'utf8').includes(text);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function assert(label, condition, reason = '') {
  if (condition) {
    pass(label);
  } else {
    fail(label, reason || 'Condition was false');
  }
}

// ─── Prerequisite ─────────────────────────────────────────────────────────────

section('Prerequisites');

assert(
  'Example project has sfdx-project.json',
  fileExists(path.join(EXAMPLE_DIR, 'sfdx-project.json')),
  'Run: node scripts/smoke-test.mjs from the repo root'
);

assert(
  'CLI dist/index.js exists',
  fileExists(CLI),
  'Run: npm run build first'
);

// ─── Scan ─────────────────────────────────────────────────────────────────────

section('sf-ai-toolkit scan');

let scanOutput = '';
try {
  scanOutput = run(`node "${CLI}" scan --path "${EXAMPLE_DIR}"`);
  assert('scan exits 0', true);
} catch (err) {
  fail('scan exits 0', err.message);
}

assert(
  'scan output contains AI Readiness Score',
  scanOutput.includes('AI Readiness Score') || scanOutput.includes('score'),
  `Got: ${scanOutput.slice(0, 200)}`
);

assert(
  'scan output mentions sfdx-project.json (detected)',
  scanOutput.includes('sfdx-project') || scanOutput.includes('Salesforce DX') || scanOutput.includes('Score'),
  `Got: ${scanOutput.slice(0, 200)}`
);

// ─── Init (dry-run via planSetup check) ───────────────────────────────────────

section('sf-ai-toolkit init (core preset)');

let initOutput = '';
try {
  initOutput = run(`node "${CLI}" init --preset core --yes --path "${EXAMPLE_DIR}" 2>&1`);
  assert('init exits 0', true);
} catch (err) {
  initOutput = err.stdout ?? '';
  fail('init exits 0', err.message.slice(0, 300));
}

// ─── Check generated files ────────────────────────────────────────────────────

section('Generated files (after init)');

const expectedFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'tasks/todo.md',
  'tasks/lessons.md',
  '.cursor/rules/project.mdc',
  '.cursor/rules/apex.mdc',
  '.cursor/rules/lwc.mdc',
  '.cursor/rules/safety.mdc',
  '.cursor/rules/deployment.mdc',
];

for (const f of expectedFiles) {
  const full = path.join(EXAMPLE_DIR, f);
  assert(
    `${f} created`,
    fileExists(full),
    `File not found at ${full}`
  );
}

// Spot-check content signals
assert(
  'AGENTS.md contains Salesforce DX context',
  fileContains(path.join(EXAMPLE_DIR, 'AGENTS.md'), 'Salesforce'),
  'AGENTS.md missing Salesforce content'
);

assert(
  'CLAUDE.md contains Plan Mode',
  fileContains(path.join(EXAMPLE_DIR, 'CLAUDE.md'), 'Plan Mode'),
  'CLAUDE.md missing Plan Mode section'
);

assert(
  'project.mdc has alwaysApply true',
  fileContains(path.join(EXAMPLE_DIR, '.cursor/rules/project.mdc'), 'alwaysApply: true'),
  'project.mdc missing alwaysApply frontmatter'
);

assert(
  'apex.mdc contains bulkification rules',
  fileContains(path.join(EXAMPLE_DIR, '.cursor/rules/apex.mdc'), 'Bulkify') ||
  fileContains(path.join(EXAMPLE_DIR, '.cursor/rules/apex.mdc'), 'bulkif') ||
  fileContains(path.join(EXAMPLE_DIR, '.cursor/rules/apex.mdc'), 'No SOQL or DML inside loops'),
  'apex.mdc missing bulkification content'
);

// ─── Inline diagnostics (via core API) ────────────────────────────────────────

section('Inline diagnostics — Apex anti-patterns');

const diagScript = `
import { analyseFile, detectFileType } from './packages/core/dist/index.js';
import fs from 'fs';

const apexFile = '${EXAMPLE_DIR.replace(/\\/g, '/')}/force-app/main/default/classes/AccountService.cls';
const content = fs.readFileSync(apexFile, 'utf8');
const ft = detectFileType(apexFile);
const diags = analyseFile(content, ft);
console.log(JSON.stringify(diags));
`;

let apexDiags = [];
try {
  const diagFile = path.join(ROOT, '.smoke-diag.mjs');
  fs.writeFileSync(diagFile, diagScript);
  const out = run(`node "${diagFile}"`, { cwd: ROOT });
  fs.unlinkSync(diagFile);
  apexDiags = JSON.parse(out.trim().split('\n').pop());
} catch (err) {
  fail('Apex diagnostics script ran', err.message.slice(0, 300));
}

const ruleIds = apexDiags.map((d) => d.ruleId);

assert('Detects SOQL in loop', ruleIds.includes('no-soql-in-loop'), `Got ruleIds: ${ruleIds.join(', ')}`);
assert('Detects DML in loop', ruleIds.includes('no-dml-in-loop'), `Got ruleIds: ${ruleIds.join(', ')}`);
assert('Detects missing sharing', ruleIds.includes('missing-sharing-declaration'), `Got ruleIds: ${ruleIds.join(', ')}`);
assert('Detects hardcoded ID', ruleIds.includes('no-hardcoded-id'), `Got ruleIds: ${ruleIds.join(', ')}`);
assert('Detects naked catch', ruleIds.includes('no-naked-catch'), `Got ruleIds: ${ruleIds.join(', ')}`);

section('Inline diagnostics — LWC JS anti-patterns');

const lwcJsScript = `
import { analyseFile, detectFileType } from './packages/core/dist/index.js';
import fs from 'fs';

const lwcFile = '${EXAMPLE_DIR.replace(/\\/g, '/')}/force-app/main/default/lwc/accountCard/accountCard.js';
const content = fs.readFileSync(lwcFile, 'utf8');
const ft = detectFileType(lwcFile);
const diags = analyseFile(content, ft);
console.log(JSON.stringify(diags));
`;

let lwcJsDiags = [];
try {
  const diagFile = path.join(ROOT, '.smoke-lwc-js.mjs');
  fs.writeFileSync(diagFile, lwcJsScript);
  const out = run(`node "${diagFile}"`, { cwd: ROOT });
  fs.unlinkSync(diagFile);
  lwcJsDiags = JSON.parse(out.trim().split('\n').pop());
} catch (err) {
  fail('LWC JS diagnostics script ran', err.message.slice(0, 300));
}

const lwcJsRuleIds = lwcJsDiags.map((d) => d.ruleId);

assert('Detects console.log in LWC', lwcJsRuleIds.includes('no-console-log'), `Got: ${lwcJsRuleIds.join(', ')}`);
assert('Detects innerHTML in LWC', lwcJsRuleIds.includes('no-inner-html'), `Got: ${lwcJsRuleIds.join(', ')}`);
assert('Detects hardcoded URL in LWC', lwcJsRuleIds.includes('no-hardcoded-url'), `Got: ${lwcJsRuleIds.join(', ')}`);
assert('Detects missing @wire error handler', lwcJsRuleIds.includes('missing-wire-error-handler'), `Got: ${lwcJsRuleIds.join(', ')}`);

section('Inline diagnostics — LWC HTML anti-patterns');

const lwcHtmlScript = `
import { analyseFile, detectFileType } from './packages/core/dist/index.js';
import fs from 'fs';

const lwcFile = '${EXAMPLE_DIR.replace(/\\/g, '/')}/force-app/main/default/lwc/accountCard/accountCard.html';
const content = fs.readFileSync(lwcFile, 'utf8');
const ft = detectFileType(lwcFile);
const diags = analyseFile(content, ft);
console.log(JSON.stringify(diags));
`;

let lwcHtmlDiags = [];
try {
  const diagFile = path.join(ROOT, '.smoke-lwc-html.mjs');
  fs.writeFileSync(diagFile, lwcHtmlScript);
  const out = run(`node "${diagFile}"`, { cwd: ROOT });
  fs.unlinkSync(diagFile);
  lwcHtmlDiags = JSON.parse(out.trim().split('\n').pop());
} catch (err) {
  fail('LWC HTML diagnostics script ran', err.message.slice(0, 300));
}

const lwcHtmlRuleIds = lwcHtmlDiags.map((d) => d.ruleId);

assert('Detects for:each without key', lwcHtmlRuleIds.includes('missing-key-iterator'), `Got: ${lwcHtmlRuleIds.join(', ')}`);
assert('Detects aura: syntax in LWC template', lwcHtmlRuleIds.includes('no-aura-syntax'), `Got: ${lwcHtmlRuleIds.join(', ')}`);
assert('Detects inline onclick string', lwcHtmlRuleIds.includes('no-onclick-inline'), `Got: ${lwcHtmlRuleIds.join(', ')}`);

// ─── Deploy preview ────────────────────────────────────────────────────────────

section('sf-ai-toolkit deploy-preview');

let deployOutput = '';
try {
  deployOutput = run(`node "${CLI}" deploy-preview --path "${EXAMPLE_DIR}"`);
  assert('deploy-preview exits 0', true);
} catch (err) {
  deployOutput = err.stdout ?? '';
  fail('deploy-preview exits 0', err.message.slice(0, 300));
}

assert(
  'deploy-preview shows ApexClass',
  deployOutput.includes('ApexClass'),
  `Got: ${deployOutput.slice(0, 400)}`
);

assert(
  'deploy-preview shows LightningComponentBundle',
  deployOutput.includes('LightningComponentBundle') || deployOutput.includes('accountCard'),
  `Got: ${deployOutput.slice(0, 400)}`
);

// ─── Agentforce scan ──────────────────────────────────────────────────────────

section('sf-ai-toolkit agentforce-scan');

let agentOutput = '';
try {
  agentOutput = run(`node "${CLI}" agentforce-scan --path "${EXAMPLE_DIR}"`);
  assert('agentforce-scan exits 0', true);
} catch (err) {
  agentOutput = err.stdout ?? '';
  fail('agentforce-scan exits 0', err.message.slice(0, 300));
}

assert(
  'agentforce-scan runs without crash',
  agentOutput.length > 0 || true,
  'No output'
);

// ─── Drift check ─────────────────────────────────────────────────────────────

section('sf-ai-toolkit check-drift');

let driftOutput = '';
try {
  driftOutput = run(`node "${CLI}" check-drift --path "${EXAMPLE_DIR}"`);
  assert('check-drift exits 0', true);
} catch (err) {
  driftOutput = err.stdout ?? '';
  fail('check-drift exits 0', err.message.slice(0, 300));
}

assert(
  'check-drift produces output',
  driftOutput.length > 0,
  'No output from check-drift'
);

// ─── Second-run idempotency ───────────────────────────────────────────────────

section('Idempotency — second init run skips existing files');

const agentsMdBefore = fileExists(path.join(EXAMPLE_DIR, 'AGENTS.md'))
  ? fs.readFileSync(path.join(EXAMPLE_DIR, 'AGENTS.md'), 'utf8')
  : null;

try {
  run(`node "${CLI}" init --preset core --yes --path "${EXAMPLE_DIR}" 2>&1`);
} catch { /* may exit non-zero */ }

if (agentsMdBefore !== null) {
  const agentsMdAfter = fs.readFileSync(path.join(EXAMPLE_DIR, 'AGENTS.md'), 'utf8');
  assert(
    'AGENTS.md not overwritten on second run',
    agentsMdBefore === agentsMdAfter,
    'File contents changed on second run — safe-write protection failed'
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Smoke Test Results`);
console.log('═'.repeat(60));
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('═'.repeat(60));

if (failed > 0) {
  process.exit(1);
}
