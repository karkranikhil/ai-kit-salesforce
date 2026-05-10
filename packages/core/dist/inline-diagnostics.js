"use strict";
/**
 * Inline rule annotations — detects Salesforce anti-patterns in source files
 * and maps them back to the Cursor rule that governs them.
 *
 * Each rule produces zero or more Diagnostic entries with a file range,
 * message, and the source rule file for quick navigation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFileType = detectFileType;
exports.analyseFile = analyseFile;
exports.getDiagnosticSummary = getDiagnosticSummary;
// ─── SOQL-in-loop / DML-in-loop detection ─────────────────────────────────
// We track loop depth and flag any SOQL SELECT or DML found inside a loop block.
function apexDiagnostics(lines) {
    const diagnostics = [];
    let loopDepth = 0;
    let braceDepth = 0;
    // Track brace depths when a loop opened so we can close properly
    const loopOpenDepths = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Count brace opens/closes on this line
        const opens = (line.match(/\{/g) ?? []).length;
        const closes = (line.match(/\}/g) ?? []).length;
        // Loop openers — for, while, do, forEach
        const isLoopOpener = /\b(for|while)\s*\(/.test(trimmed) ||
            /\.forEach\s*\(/.test(trimmed) ||
            /\bdo\s*\{/.test(trimmed);
        if (isLoopOpener) {
            loopDepth++;
            loopOpenDepths.push(braceDepth + opens - closes);
        }
        braceDepth += opens - closes;
        // Pop loop depth when we close back past the loop's open depth
        while (loopOpenDepths.length > 0 &&
            braceDepth < loopOpenDepths[loopOpenDepths.length - 1]) {
            loopOpenDepths.pop();
            loopDepth = Math.max(0, loopDepth - 1);
        }
        if (loopDepth > 0) {
            // SOQL inside loop
            if (/\[\s*SELECT\b/i.test(line)) {
                const col = line.search(/\[\s*SELECT/i);
                diagnostics.push({
                    line: i,
                    startCol: col,
                    endCol: -1,
                    message: 'SOQL query inside a loop — violates bulkification rules. Move query outside the loop.',
                    ruleFile: '.cursor/rules/apex.mdc',
                    severity: 'error',
                    ruleId: 'no-soql-in-loop',
                });
            }
            // DML inside loop
            const dmlMatch = line.match(/\b(insert|update|delete|upsert|undelete|merge)\s+/i);
            if (dmlMatch && !/\/\//.test(line.slice(0, (dmlMatch.index ?? 0)))) {
                diagnostics.push({
                    line: i,
                    startCol: dmlMatch.index ?? 0,
                    endCol: -1,
                    message: `DML operation (${dmlMatch[1]}) inside a loop — violates bulkification rules. Collect records first, then DML outside loop.`,
                    ruleFile: '.cursor/rules/apex.mdc',
                    severity: 'error',
                    ruleId: 'no-dml-in-loop',
                });
            }
        }
    }
    return diagnostics;
}
// ─── missing-test-setup detection ─────────────────────────────────────────
// In test classes (name ends with Test), warn if no @TestSetup and > 1 test method.
function testSetupDiagnostics(lines) {
    const diagnostics = [];
    // Check if this looks like a test class (class name ends with Test)
    const classLine = lines.findIndex((l) => /\bclass\s+\w+Test\b/.test(l));
    if (classLine === -1)
        return diagnostics;
    const hasTestSetup = lines.some((l) => /@TestSetup\b/i.test(l));
    if (hasTestSetup)
        return diagnostics;
    // Count @IsTest annotations (test methods)
    const testMethodCount = lines.filter((l) => /@IsTest\b/i.test(l)).length;
    if (testMethodCount > 1) {
        diagnostics.push({
            line: classLine,
            startCol: 0,
            endCol: -1,
            message: `Test class has ${testMethodCount} test methods but no @TestSetup method — consider adding a @TestSetup to avoid data setup duplication.`,
            ruleFile: '.cursor/rules/apex.mdc',
            severity: 'warning',
            ruleId: 'missing-test-setup',
        });
    }
    return diagnostics;
}
// ─── no-naked-catch detection ──────────────────────────────────────────────
// Flag empty catch blocks.
function nakedCatchDiagnostics(lines) {
    const diagnostics = [];
    const joined = lines.join('\n');
    // Match catch blocks that are effectively empty: only whitespace between braces
    // Handles: } catch (Exception e) { } or multiline empty catch
    const catchPattern = /\}\s*catch\s*\([^)]+\)\s*\{(\s*)\}/g;
    let match;
    while ((match = catchPattern.exec(joined)) !== null) {
        // Find which line this is on
        const before = joined.slice(0, match.index);
        const lineIndex = (before.match(/\n/g) ?? []).length;
        // Only flag if the body is truly empty (no statements)
        const body = match[1];
        if (/^\s*$/.test(body)) {
            diagnostics.push({
                line: lineIndex,
                startCol: 0,
                endCol: -1,
                message: 'Empty catch block (naked catch) — log or rethrow the exception instead of swallowing it.',
                ruleFile: '.cursor/rules/apex.mdc',
                severity: 'warning',
                ruleId: 'no-naked-catch',
            });
        }
    }
    return diagnostics;
}
const SIMPLE_CHECKS = [
    // ── without sharing class declaration (no sharing keyword at all) ──────────
    {
        ruleId: 'missing-sharing-declaration',
        message: 'Class declared without sharing — use `with sharing` by default. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line) => {
            if (!/\bclass\b/.test(line))
                return false;
            if (/\bwith sharing\b|\bwithout sharing\b|\binherited sharing\b/.test(line))
                return false;
            return /\b(public|global|private)\b.*\bclass\b/.test(line);
        },
    },
    // ── no-without-sharing-bypass ─────────────────────────────────────────────
    // Flags `without sharing` unless the previous line has an explanatory comment.
    {
        ruleId: 'no-without-sharing-bypass',
        message: '`without sharing` detected without an explanatory comment on the previous line. Add a comment explaining why this bypass is intentional.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line, i, all) => {
            if (!/\bwithout sharing\b/.test(line))
                return false;
            if (!/\bclass\b/.test(line))
                return false;
            // Check previous line for a comment
            if (i === 0)
                return true; // no previous line
            const prevLine = all[i - 1].trim();
            return !prevLine.startsWith('//') && !prevLine.startsWith('/*') && !prevLine.startsWith('*');
        },
    },
    // ── Hardcoded Salesforce-style IDs ────────────────────────────────────────
    {
        ruleId: 'no-hardcoded-id',
        message: 'Possible hardcoded Salesforce ID — use Custom Metadata or pass IDs as parameters. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line) => {
            return /['"][a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?['"]/.test(line) && !/\/\/.*['"]/.test(line);
        },
    },
    // ── no-debug-pii ──────────────────────────────────────────────────────────
    // Expanded: also flags password, token, key, secret, jwt, ssn, credit
    {
        ruleId: 'no-debug-pii',
        message: 'Debug statement may log sensitive data — ensure no PII or credentials are included. See .cursor/rules/safety.mdc.',
        ruleFile: '.cursor/rules/safety.mdc',
        severity: 'warning',
        test: (line) => /System\.debug/i.test(line) &&
            /email|phone|ssn|password|token|secret|key|credential|jwt|credit/i.test(line),
    },
    // ── no-seealldata ─────────────────────────────────────────────────────────
    {
        ruleId: 'no-seealldata',
        message: 'SeeAllData=true is dangerous — tests should create their own data. Remove SeeAllData=true. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'error',
        test: (line) => /SeeAllData\s*=\s*true/i.test(line),
    },
];
// ─── LWC JS diagnostics ───────────────────────────────────────────────────────
function lwcJsDiagnostics(lines) {
    const diagnostics = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // no-console-log
        const consoleMatch = line.match(/\bconsole\.(log|warn|error|info|debug)\s*\(/);
        if (consoleMatch && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: consoleMatch.index ?? 0,
                endCol: -1,
                message: `console.${consoleMatch[1]}() found — remove before production. Use the lwc/logger module or a custom service instead.`,
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'no-console-log',
            });
        }
        // no-inner-html
        const innerHtmlIdx = line.search(/\.innerHTML\s*=/);
        if (innerHtmlIdx !== -1 && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: innerHtmlIdx,
                endCol: -1,
                message: 'Direct innerHTML assignment is an XSS risk in LWC — use template-based rendering instead.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-inner-html',
            });
        }
        // no-hardcoded-url
        if (/['"][^'"]*\/(apex|lightning|setup|s\/)\/[^'"]+['"]/.test(line) && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: 0,
                endCol: -1,
                message: 'Hardcoded Salesforce URL detected — use NavigationMixin or a site-relative URL to support Experience Cloud and org migrations.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'no-hardcoded-url',
            });
        }
    }
    // missing-wire-error-handler: @wire property wiring without error handling
    const hasWire = lines.some((l) => /@wire\s*\(/.test(l));
    if (hasWire) {
        const fullContent = lines.join('\n');
        const hasErrorHandling = /\{\s*data\s*,\s*error\s*\}/.test(fullContent) ||
            /\{\s*error\s*,\s*data\s*\}/.test(fullContent) ||
            /this\.\w+\.error\b/.test(fullContent) ||
            /get\s+error\s*\(\)/.test(fullContent);
        if (!hasErrorHandling) {
            const wireLineIdx = lines.findIndex((l) => /@wire\s*\(/.test(l));
            diagnostics.push({
                line: wireLineIdx,
                startCol: 0,
                endCol: -1,
                message: '@wire adapter used without error property handling — destructure { data, error } or handle .error to display failures gracefully.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'missing-wire-error-handler',
            });
        }
    }
    return diagnostics;
}
// ─── LWC HTML diagnostics ─────────────────────────────────────────────────────
function lwcHtmlDiagnostics(lines) {
    const diagnostics = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // missing-key-iterator: for:each without key on the same or next line
        if (/for:each\s*=/.test(line) && !/\bkey\s*=/.test(line)) {
            diagnostics.push({
                line: i,
                startCol: Math.max(0, line.search(/for:each/)),
                endCol: -1,
                message: 'for:each iterator is missing a key= attribute — required by LWC for efficient DOM reconciliation.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'missing-key-iterator',
            });
        }
        // no-aura-syntax
        const auraIdx = line.search(/\baura:/);
        if (auraIdx !== -1) {
            diagnostics.push({
                line: i,
                startCol: auraIdx,
                endCol: -1,
                message: 'Aura syntax (aura:*) found in an LWC template — use lwc:* directives instead.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-aura-syntax',
            });
        }
        // no-onclick-inline: raw onclick="handler()" without LWC binding
        if (/\bonclick\s*=\s*["'][^{]/.test(line)) {
            diagnostics.push({
                line: i,
                startCol: Math.max(0, line.search(/\bonclick/)),
                endCol: -1,
                message: 'Inline onclick handler string detected — LWC requires event bindings like onclick={handleClick}, not onclick="handleClick()".',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-onclick-inline',
            });
        }
    }
    return diagnostics;
}
function detectFileType(filePath) {
    if (filePath.endsWith('.cls') || filePath.endsWith('.trigger'))
        return 'apex';
    if (filePath.endsWith('.js') && filePath.includes('/lwc/'))
        return 'lwc-js';
    if (filePath.endsWith('.html') && filePath.includes('/lwc/'))
        return 'lwc-html';
    return 'unknown';
}
function analyseFile(content, fileType) {
    const lines = content.split('\n');
    const diagnostics = [];
    if (fileType === 'apex') {
        diagnostics.push(...apexDiagnostics(lines));
        diagnostics.push(...testSetupDiagnostics(lines));
        diagnostics.push(...nakedCatchDiagnostics(lines));
        for (let i = 0; i < lines.length; i++) {
            for (const check of SIMPLE_CHECKS) {
                if (check.test(lines[i], i, lines)) {
                    const range = check.getRange ? check.getRange(lines[i]) : [0, -1];
                    diagnostics.push({
                        line: i,
                        startCol: range[0],
                        endCol: range[1],
                        message: check.message,
                        ruleFile: check.ruleFile,
                        severity: check.severity,
                        ruleId: check.ruleId,
                    });
                }
            }
        }
    }
    else if (fileType === 'lwc-js') {
        diagnostics.push(...lwcJsDiagnostics(lines));
    }
    else if (fileType === 'lwc-html') {
        diagnostics.push(...lwcHtmlDiagnostics(lines));
    }
    return diagnostics;
}
/**
 * Returns a 1-line summary like "3 errors, 2 warnings" or "No issues"
 */
function getDiagnosticSummary(diagnostics) {
    if (diagnostics.length === 0)
        return 'No issues';
    const errors = diagnostics.filter((d) => d.severity === 'error').length;
    const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
    const infos = diagnostics.filter((d) => d.severity === 'info').length;
    const parts = [];
    if (errors > 0)
        parts.push(`${errors} ${errors === 1 ? 'error' : 'errors'}`);
    if (warnings > 0)
        parts.push(`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`);
    if (infos > 0)
        parts.push(`${infos} ${infos === 1 ? 'info' : 'infos'}`);
    return parts.join(', ');
}
//# sourceMappingURL=inline-diagnostics.js.map