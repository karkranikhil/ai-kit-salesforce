"use strict";
/**
 * Provides hover explanation content for AI-Kit diagnostics.
 * Maps diagnostic ruleFile → human-readable explanation with a link to the rule file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHoverContent = getHoverContent;
// ─── Lookup table keyed by ruleId or message keyword ──────────────────────
const RULE_ENTRIES = {
    // ── apex.mdc rules ────────────────────────────────────────────────────────
    'no-soql-in-loop': {
        title: 'SOQL inside a loop (no-soql-in-loop)',
        explanation: 'Executing SOQL queries inside loops causes N+1 database query problems and will hit Salesforce governor limits (max 100 SOQL queries per transaction). Always bulk-query before the loop.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Move the SOQL query outside the loop. Collect all required IDs first, then query in bulk using a WHERE ... IN :ids clause.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
    },
    'no-dml-in-loop': {
        title: 'DML inside a loop (no-dml-in-loop)',
        explanation: 'Performing DML (insert/update/delete/upsert) inside loops hits the Salesforce governor limit of 150 DML statements per transaction and causes poor performance.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Collect records in a List inside the loop, then perform a single bulk DML operation (e.g. insert recordList) after the loop completes.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
    },
    'missing-sharing-declaration': {
        title: 'Missing sharing declaration (missing-sharing-declaration)',
        explanation: 'Apex classes without an explicit sharing keyword default to `without sharing` behavior in some contexts, which can expose records the running user should not see. Always declare sharing mode explicitly.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add `with sharing` to your class declaration: `public with sharing class MyClass`. Use `without sharing` only when you have a documented business reason.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm',
    },
    'no-without-sharing-bypass': {
        title: 'Undocumented without sharing bypass (no-without-sharing-bypass)',
        explanation: '`without sharing` grants the code system-level record access regardless of the running user\'s permissions. This is a security-sensitive decision that must be justified.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add a comment on the line before the class declaration explaining why `without sharing` is required, e.g.: `// Intentionally without sharing — bulk data processing job runs in system context`.',
    },
    'no-hardcoded-id': {
        title: 'Hardcoded Salesforce ID (no-hardcoded-id)',
        explanation: 'Hardcoded IDs are org-specific and will break when code is deployed to a different sandbox or production. They also make automated testing impossible.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Replace hardcoded IDs with Custom Metadata Types, Custom Settings, or pass the ID as a parameter. Example: `MyConfig__mdt.getInstance(\'Default\').RecordId__c`.',
    },
    'missing-test-setup': {
        title: 'Missing @TestSetup method (missing-test-setup)',
        explanation: 'Test classes with multiple test methods that each create their own data can be slow and brittle. A shared @TestSetup method creates data once and is rolled back between tests.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add a static `@TestSetup` method to create shared test data once:\n```apex\n@TestSetup\nstatic void makeData() {\n  // insert shared test records\n}\n```',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_testsetup_annotation.htm',
    },
    'no-seealldata': {
        title: 'SeeAllData=true is dangerous (no-seealldata)',
        explanation: '`SeeAllData=true` allows tests to access real org data, making tests fragile, environment-dependent, and a potential data security risk. Tests should create their own data.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Remove `SeeAllData=true` from `@IsTest(SeeAllData=true)`. Use `@TestSetup` or test factory classes to create isolated test data instead.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_seealldata_using.htm',
    },
    'no-naked-catch': {
        title: 'Empty catch block (no-naked-catch)',
        explanation: 'Empty catch blocks silently swallow exceptions, making bugs invisible. They hide problems that could corrupt data or leave transactions in an inconsistent state.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Always handle exceptions explicitly:\n```apex\ncatch (Exception e) {\n  System.debug(LoggingLevel.ERROR, \'Error: \' + e.getMessage());\n  throw e; // or AuraHandledException, etc.\n}\n```',
    },
    // ── lwc.mdc rules ─────────────────────────────────────────────────────────
    'no-console-log': {
        title: 'console.log() in LWC (no-console-log)',
        explanation: 'console.log and related methods left in production LWC code clutter browser dev-tools, can expose sensitive data, and fail security reviews. Use a custom logger service instead.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Remove the console statement or replace with a lwc/logger import, e.g.:\n```js\nimport { createLogger } from \'c/logger\';\nconst logger = createLogger();\nlogger.info(\'message\');\n```',
    },
    'no-inner-html': {
        title: 'innerHTML assignment in LWC (no-inner-html)',
        explanation: 'Setting innerHTML directly in an LWC component bypasses the Locker Service sandbox and creates XSS vulnerabilities. LWC\'s template engine already escapes values safely.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use LWC template bindings ({property}) or lightning-formatted-rich-text for user content. If you need dynamic HTML, sanitize with DOMPurify first.',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/security-locker-service.html',
    },
    'no-hardcoded-url': {
        title: 'Hardcoded Salesforce URL (no-hardcoded-url)',
        explanation: 'Hardcoded /apex/, /lightning/, or /setup/ URLs break across Experience Cloud sites, sandbox migrations, and org renames. They also fail when the org\'s My Domain changes.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use NavigationMixin for navigation:\n```js\nimport { NavigationMixin } from \'lightning/navigation\';\nthis[NavigationMixin.Navigate]({ type: \'standard__recordPage\', ... });\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/use-navigate-basic.html',
    },
    'missing-wire-error-handler': {
        title: 'Missing @wire error handler (missing-wire-error-handler)',
        explanation: '@wire adapters can fail if the user lacks permissions, the record doesn\'t exist, or the network is unavailable. Without error handling, the component silently shows blank content.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Destructure both data and error from the wired property:\n```js\n@wire(getRecord, { recordId: \'$recordId\', fields })\nwiredRecord({ data, error }) {\n  if (error) { this.error = error; }\n  else if (data) { this.record = data; }\n}\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/wire-service-component.html',
    },
    'missing-key-iterator': {
        title: 'Missing key in for:each (missing-key-iterator)',
        explanation: 'LWC requires a unique key= attribute on the direct child of for:each iterators. Without it, LWC cannot efficiently reconcile the DOM when the list changes, causing rendering bugs.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Add key={item.Id} (or another unique field) to the direct child element:\n```html\n<template for:each={items} for:item="item">\n  <c-my-item key={item.Id} item={item}></c-my-item>\n</template>\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/create-render-list.html',
    },
    'no-aura-syntax': {
        title: 'Aura syntax in LWC template (no-aura-syntax)',
        explanation: 'aura:* tags and attributes are only valid in Aura components. Using them in LWC templates causes runtime errors and will not compile.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Replace Aura equivalents: aura:if → lwc:if, aura:iteration → for:each, aura:attribute → @api property.',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/migrate-aura-to-lwc.html',
    },
    'no-onclick-inline': {
        title: 'Inline onclick string in LWC template (no-onclick-inline)',
        explanation: 'LWC requires event bindings to be expressions, not strings. onclick="handler()" is HTML syntax that won\'t work in LWC and may raise a compile error.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use LWC expression binding:\n```html\n<!-- Wrong -->\n<button onclick="handleClick()">Click</button>\n<!-- Right -->\n<button onclick={handleClick}>Click</button>\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/events-add-handler.html',
    },
    // ── safety.mdc rules ──────────────────────────────────────────────────────
    'no-debug-pii': {
        title: 'PII / credentials in debug log (no-debug-pii)',
        explanation: 'Logging sensitive data (passwords, tokens, SSNs, email addresses, credit card info) creates compliance and security risks. Salesforce debug logs can be accessed by admins.',
        ruleFile: '.cursor/rules/safety.mdc',
        fixSuggestion: 'Remove sensitive data from debug statements. If you must debug auth issues, log only non-sensitive identifiers, not the actual secret values.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_debug_log.htm',
    },
};
// ─── Rule-file fallback tables ─────────────────────────────────────────────
const RULEFILE_DEFAULTS = {
    '.cursor/rules/apex.mdc': {
        explanation: 'This diagnostic is governed by the Apex coding rules defined in your project.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Open the rule file for detailed guidance.',
    },
    '.cursor/rules/safety.mdc': {
        explanation: 'This diagnostic is governed by the security and safety rules defined in your project.',
        ruleFile: '.cursor/rules/safety.mdc',
        fixSuggestion: 'Review the safety rule file and ensure no sensitive data is exposed.',
    },
    '.cursor/rules/deployment.mdc': {
        explanation: 'This diagnostic is governed by the deployment safety rules defined in your project.',
        ruleFile: '.cursor/rules/deployment.mdc',
        fixSuggestion: 'Review the deployment rule file before proceeding.',
    },
    '.cursor/rules/lwc.mdc': {
        explanation: 'This diagnostic is governed by the LWC development rules defined in your project.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Review the LWC rule file and follow component best practices.',
    },
};
/**
 * Returns appropriate HoverContent based on ruleId (preferred), message patterns, or ruleFile fallback.
 */
function getHoverContent(ruleFile, message, ruleId) {
    // Direct ruleId lookup — fastest and most precise
    if (ruleId && RULE_ENTRIES[ruleId])
        return RULE_ENTRIES[ruleId];
    // Match by specific message patterns (for callers that don't pass ruleId)
    if (/SOQL query inside a loop/i.test(message))
        return RULE_ENTRIES['no-soql-in-loop'];
    if (/DML operation.*inside a loop/i.test(message))
        return RULE_ENTRIES['no-dml-in-loop'];
    if (/SeeAllData/i.test(message))
        return RULE_ENTRIES['no-seealldata'];
    if (/Empty catch block/i.test(message))
        return RULE_ENTRIES['no-naked-catch'];
    if (/hardcoded Salesforce ID/i.test(message))
        return RULE_ENTRIES['no-hardcoded-id'];
    if (/without sharing.*explanatory comment/i.test(message))
        return RULE_ENTRIES['no-without-sharing-bypass'];
    if (/Class declared without sharing/i.test(message))
        return RULE_ENTRIES['missing-sharing-declaration'];
    if (/@TestSetup/i.test(message))
        return RULE_ENTRIES['missing-test-setup'];
    if (/Debug statement may log sensitive/i.test(message))
        return RULE_ENTRIES['no-debug-pii'];
    if (/console\.\w+\(\) found/i.test(message))
        return RULE_ENTRIES['no-console-log'];
    if (/innerHTML assignment/i.test(message))
        return RULE_ENTRIES['no-inner-html'];
    if (/Hardcoded Salesforce URL/i.test(message))
        return RULE_ENTRIES['no-hardcoded-url'];
    if (/@wire adapter used without error/i.test(message))
        return RULE_ENTRIES['missing-wire-error-handler'];
    if (/for:each iterator is missing a key/i.test(message))
        return RULE_ENTRIES['missing-key-iterator'];
    if (/Aura syntax.*in an LWC/i.test(message))
        return RULE_ENTRIES['no-aura-syntax'];
    if (/Inline onclick/i.test(message))
        return RULE_ENTRIES['no-onclick-inline'];
    // Fall back to rule-file-level defaults
    const ruleFileDefault = RULEFILE_DEFAULTS[ruleFile];
    if (ruleFileDefault) {
        return {
            title: `AI-Kit Diagnostic (${ruleFile})`,
            ...ruleFileDefault,
        };
    }
    // Generic fallback
    return {
        title: 'AI-Kit Diagnostic',
        explanation: 'This location was flagged by an AI-Kit rule check.',
        ruleFile: ruleFile || 'unknown',
        fixSuggestion: 'Review the flagged code and the associated rule file for guidance.',
    };
}
//# sourceMappingURL=hover-provider.js.map