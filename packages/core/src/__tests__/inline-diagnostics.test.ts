import { describe, it, expect } from 'vitest';
import { analyseFile, detectFileType } from '../inline-diagnostics';

describe('detectFileType', () => {
  it('detects Apex class', () => {
    expect(detectFileType('/project/force-app/main/default/classes/MyClass.cls')).toBe('apex');
  });
  it('detects Apex trigger', () => {
    expect(detectFileType('/project/force-app/main/default/triggers/MyTrigger.trigger')).toBe('apex');
  });
  it('detects LWC JS', () => {
    expect(detectFileType('/project/force-app/main/default/lwc/myComp/myComp.js')).toBe('lwc-js');
  });
  it('returns unknown for other files', () => {
    expect(detectFileType('/project/README.md')).toBe('unknown');
  });
});

describe('analyseFile — SOQL in loop', () => {
  it('flags SOQL inside a for loop', () => {
    const code = `
public class MyClass {
  public void doWork(List<Id> ids) {
    for (Id id : ids) {
      List<Account> accs = [SELECT Id FROM Account WHERE Id = :id];
    }
  }
}`;
    const diags = analyseFile(code, 'apex');
    const soqlDiag = diags.find((d) => d.message.includes('SOQL query inside a loop'));
    expect(soqlDiag).toBeDefined();
    expect(soqlDiag?.ruleFile).toBe('.cursor/rules/apex.mdc');
    expect(soqlDiag?.severity).toBe('error');
  });

  it('does not flag SOQL outside a loop', () => {
    const code = `
public class MyClass {
  public void doWork(List<Id> ids) {
    List<Account> accs = [SELECT Id FROM Account WHERE Id IN :ids];
    for (Account a : accs) {
      System.debug(a.Id);
    }
  }
}`;
    const diags = analyseFile(code, 'apex');
    expect(diags.filter((d) => d.message.includes('SOQL'))).toHaveLength(0);
  });

  it('flags DML inside a while loop', () => {
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
    const diags = analyseFile(code, 'apex');
    const dmlDiag = diags.find((d) => d.message.includes('DML operation'));
    expect(dmlDiag).toBeDefined();
    expect(dmlDiag?.severity).toBe('error');
  });

  it('flags a class without sharing declaration', () => {
    const code = `public class MyService {\n  public void run() {}\n}`;
    const diags = analyseFile(code, 'apex');
    const sharingDiag = diags.find((d) => d.message.includes('without sharing'));
    expect(sharingDiag).toBeDefined();
    expect(sharingDiag?.severity).toBe('warning');
  });

  it('does not flag a class with with sharing', () => {
    const code = `public with sharing class MyService {\n  public void run() {}\n}`;
    const diags = analyseFile(code, 'apex');
    expect(diags.filter((d) => d.message.includes('without sharing'))).toHaveLength(0);
  });

  it('flags System.debug with email keyword', () => {
    const code = `public class X {\n  void m() { System.debug('user email: ' + u.Email); }\n}`;
    const diags = analyseFile(code, 'apex');
    const debugDiag = diags.find((d) => d.message.includes('Debug statement'));
    expect(debugDiag).toBeDefined();
  });

  it('returns empty array for non-apex file type', () => {
    const code = `for (let i = 0; i < items.length; i++) { fetch(url); }`;
    const diags = analyseFile(code, 'unknown');
    expect(diags).toHaveLength(0);
  });
});

describe('analyseFile — LWC JS diagnostics', () => {
  it('flags console.log in LWC JS', () => {
    const code = `import { LightningElement } from 'lwc';\nexport default class Foo extends LightningElement {\n  connectedCallback() { console.log('hello'); }\n}`;
    const diags = analyseFile(code, 'lwc-js');
    const d = diags.find((x) => x.ruleId === 'no-console-log');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
    expect(d?.ruleFile).toBe('.cursor/rules/lwc.mdc');
  });

  it('does not flag commented-out console.log', () => {
    const code = `// console.log('debug')`;
    const diags = analyseFile(code, 'lwc-js');
    expect(diags.filter((d) => d.ruleId === 'no-console-log')).toHaveLength(0);
  });

  it('flags innerHTML assignment', () => {
    const code = `this.template.querySelector('div').innerHTML = userInput;`;
    const diags = analyseFile(code, 'lwc-js');
    const d = diags.find((x) => x.ruleId === 'no-inner-html');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });

  it('flags hardcoded Salesforce URL', () => {
    const code = `const url = '/lightning/r/Account/001000000000001/view';`;
    const diags = analyseFile(code, 'lwc-js');
    const d = diags.find((x) => x.ruleId === 'no-hardcoded-url');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
  });

  it('flags @wire without error handling', () => {
    const code = `import { wire } from 'lwc';\nimport getRecord from '@salesforce/apex/Ctrl.getRecord';\nexport default class Foo {\n  @wire(getRecord, { recordId: '$id' })\n  record;\n}`;
    const diags = analyseFile(code, 'lwc-js');
    const d = diags.find((x) => x.ruleId === 'missing-wire-error-handler');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
  });

  it('does not flag @wire when error is handled', () => {
    const code = `@wire(getRecord, { recordId: '$id' })\nwiredRecord({ data, error }) {\n  if (error) this.error = error;\n  else if (data) this.record = data;\n}`;
    const diags = analyseFile(code, 'lwc-js');
    expect(diags.filter((d) => d.ruleId === 'missing-wire-error-handler')).toHaveLength(0);
  });
});

describe('analyseFile — LWC HTML diagnostics', () => {
  it('flags for:each without key', () => {
    const code = `<template>\n  <template for:each={items} for:item="item">\n    <p>{item.Name}</p>\n  </template>\n</template>`;
    const diags = analyseFile(code, 'lwc-html');
    const d = diags.find((x) => x.ruleId === 'missing-key-iterator');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });

  it('does not flag for:each when key is present', () => {
    const code = `<template for:each={items} for:item="item" key={item.Id}><p>{item.Name}</p></template>`;
    const diags = analyseFile(code, 'lwc-html');
    expect(diags.filter((d) => d.ruleId === 'missing-key-iterator')).toHaveLength(0);
  });

  it('flags aura: syntax in LWC template', () => {
    const code = `<aura:if isTrue="{!v.show}"><p>Hello</p></aura:if>`;
    const diags = analyseFile(code, 'lwc-html');
    const d = diags.find((x) => x.ruleId === 'no-aura-syntax');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });

  it('flags inline onclick string handler', () => {
    const code = `<button onclick="handleClick()">Click</button>`;
    const diags = analyseFile(code, 'lwc-html');
    const d = diags.find((x) => x.ruleId === 'no-onclick-inline');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });

  it('does not flag correct onclick={handler} binding', () => {
    const code = `<button onclick={handleClick}>Click</button>`;
    const diags = analyseFile(code, 'lwc-html');
    expect(diags.filter((d) => d.ruleId === 'no-onclick-inline')).toHaveLength(0);
  });
});
