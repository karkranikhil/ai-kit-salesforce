"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const inline_diagnostics_1 = require("../inline-diagnostics");
(0, vitest_1.describe)('detectFileType', () => {
    (0, vitest_1.it)('detects Apex class', () => {
        (0, vitest_1.expect)((0, inline_diagnostics_1.detectFileType)('/project/force-app/main/default/classes/MyClass.cls')).toBe('apex');
    });
    (0, vitest_1.it)('detects Apex trigger', () => {
        (0, vitest_1.expect)((0, inline_diagnostics_1.detectFileType)('/project/force-app/main/default/triggers/MyTrigger.trigger')).toBe('apex');
    });
    (0, vitest_1.it)('detects LWC JS', () => {
        (0, vitest_1.expect)((0, inline_diagnostics_1.detectFileType)('/project/force-app/main/default/lwc/myComp/myComp.js')).toBe('lwc-js');
    });
    (0, vitest_1.it)('returns unknown for other files', () => {
        (0, vitest_1.expect)((0, inline_diagnostics_1.detectFileType)('/project/README.md')).toBe('unknown');
    });
});
(0, vitest_1.describe)('analyseFile — SOQL in loop', () => {
    (0, vitest_1.it)('flags SOQL inside a for loop', () => {
        const code = `
public class MyClass {
  public void doWork(List<Id> ids) {
    for (Id id : ids) {
      List<Account> accs = [SELECT Id FROM Account WHERE Id = :id];
    }
  }
}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'apex');
        const soqlDiag = diags.find((d) => d.message.includes('SOQL query inside a loop'));
        (0, vitest_1.expect)(soqlDiag).toBeDefined();
        (0, vitest_1.expect)(soqlDiag?.ruleFile).toBe('.cursor/rules/apex.mdc');
        (0, vitest_1.expect)(soqlDiag?.severity).toBe('error');
    });
    (0, vitest_1.it)('does not flag SOQL outside a loop', () => {
        const code = `
public class MyClass {
  public void doWork(List<Id> ids) {
    List<Account> accs = [SELECT Id FROM Account WHERE Id IN :ids];
    for (Account a : accs) {
      System.debug(a.Id);
    }
  }
}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'apex');
        (0, vitest_1.expect)(diags.filter((d) => d.message.includes('SOQL'))).toHaveLength(0);
    });
    (0, vitest_1.it)('flags DML inside a while loop', () => {
        const code = `
public class MyClass {
  public void doWork(List<Account> accs) {
    Integer i = 0;
    while (i < accs.size()) {
      insert accs[i];
      i++;
    }
  }
}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'apex');
        const dmlDiag = diags.find((d) => d.message.includes('DML operation'));
        (0, vitest_1.expect)(dmlDiag).toBeDefined();
        (0, vitest_1.expect)(dmlDiag?.severity).toBe('error');
    });
    (0, vitest_1.it)('flags a class without sharing declaration', () => {
        const code = `public class MyService {\n  public void run() {}\n}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'apex');
        const sharingDiag = diags.find((d) => d.message.includes('without sharing'));
        (0, vitest_1.expect)(sharingDiag).toBeDefined();
        (0, vitest_1.expect)(sharingDiag?.severity).toBe('warning');
    });
    (0, vitest_1.it)('does not flag a class with with sharing', () => {
        const code = `public with sharing class MyService {\n  public void run() {}\n}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'apex');
        (0, vitest_1.expect)(diags.filter((d) => d.message.includes('without sharing'))).toHaveLength(0);
    });
    (0, vitest_1.it)('flags System.debug with email keyword', () => {
        const code = `public class X {\n  void m() { System.debug('user email: ' + u.Email); }\n}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'apex');
        const debugDiag = diags.find((d) => d.message.includes('Debug statement'));
        (0, vitest_1.expect)(debugDiag).toBeDefined();
    });
    (0, vitest_1.it)('returns empty array for non-apex file type', () => {
        const code = `for (let i = 0; i < items.length; i++) { fetch(url); }`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'unknown');
        (0, vitest_1.expect)(diags).toHaveLength(0);
    });
});
(0, vitest_1.describe)('analyseFile — LWC JS diagnostics', () => {
    (0, vitest_1.it)('flags console.log in LWC JS', () => {
        const code = `import { LightningElement } from 'lwc';\nexport default class Foo extends LightningElement {\n  connectedCallback() { console.log('hello'); }\n}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-js');
        const d = diags.find((x) => x.ruleId === 'no-console-log');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('warning');
        (0, vitest_1.expect)(d?.ruleFile).toBe('.cursor/rules/lwc.mdc');
    });
    (0, vitest_1.it)('does not flag commented-out console.log', () => {
        const code = `// console.log('debug')`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-js');
        (0, vitest_1.expect)(diags.filter((d) => d.ruleId === 'no-console-log')).toHaveLength(0);
    });
    (0, vitest_1.it)('flags innerHTML assignment', () => {
        const code = `this.template.querySelector('div').innerHTML = userInput;`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-js');
        const d = diags.find((x) => x.ruleId === 'no-inner-html');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('error');
    });
    (0, vitest_1.it)('flags hardcoded Salesforce URL', () => {
        const code = `const url = '/lightning/r/Account/001000000000001/view';`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-js');
        const d = diags.find((x) => x.ruleId === 'no-hardcoded-url');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('warning');
    });
    (0, vitest_1.it)('flags @wire without error handling', () => {
        const code = `import { wire } from 'lwc';\nimport getRecord from '@salesforce/apex/Ctrl.getRecord';\nexport default class Foo {\n  @wire(getRecord, { recordId: '$id' })\n  record;\n}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-js');
        const d = diags.find((x) => x.ruleId === 'missing-wire-error-handler');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('warning');
    });
    (0, vitest_1.it)('does not flag @wire when error is handled', () => {
        const code = `@wire(getRecord, { recordId: '$id' })\nwiredRecord({ data, error }) {\n  if (error) this.error = error;\n  else if (data) this.record = data;\n}`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-js');
        (0, vitest_1.expect)(diags.filter((d) => d.ruleId === 'missing-wire-error-handler')).toHaveLength(0);
    });
});
(0, vitest_1.describe)('analyseFile — LWC HTML diagnostics', () => {
    (0, vitest_1.it)('flags for:each without key', () => {
        const code = `<template>\n  <template for:each={items} for:item="item">\n    <p>{item.Name}</p>\n  </template>\n</template>`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-html');
        const d = diags.find((x) => x.ruleId === 'missing-key-iterator');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('error');
    });
    (0, vitest_1.it)('does not flag for:each when key is present', () => {
        const code = `<template for:each={items} for:item="item" key={item.Id}><p>{item.Name}</p></template>`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-html');
        (0, vitest_1.expect)(diags.filter((d) => d.ruleId === 'missing-key-iterator')).toHaveLength(0);
    });
    (0, vitest_1.it)('flags aura: syntax in LWC template', () => {
        const code = `<aura:if isTrue="{!v.show}"><p>Hello</p></aura:if>`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-html');
        const d = diags.find((x) => x.ruleId === 'no-aura-syntax');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('error');
    });
    (0, vitest_1.it)('flags inline onclick string handler', () => {
        const code = `<button onclick="handleClick()">Click</button>`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-html');
        const d = diags.find((x) => x.ruleId === 'no-onclick-inline');
        (0, vitest_1.expect)(d).toBeDefined();
        (0, vitest_1.expect)(d?.severity).toBe('error');
    });
    (0, vitest_1.it)('does not flag correct onclick={handler} binding', () => {
        const code = `<button onclick={handleClick}>Click</button>`;
        const diags = (0, inline_diagnostics_1.analyseFile)(code, 'lwc-html');
        (0, vitest_1.expect)(diags.filter((d) => d.ruleId === 'no-onclick-inline')).toHaveLength(0);
    });
});
//# sourceMappingURL=inline-diagnostics.test.js.map