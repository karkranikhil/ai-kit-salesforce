# Publishing Guide
> Maintained by **Nikhil Karkra**

## Prerequisites

- npm account with publish access to `@ai-kit-salesforce/cli` and `@ai-kit-salesforce/core`
- VS Code Marketplace publisher account named `ai-kit-salesforce`
- Personal Access Token from https://marketplace.visualstudio.com/manage

---

## Step 1 — Publish core to npm

Core must be published before the CLI because the CLI declares it as a production
dependency (consumers who install `@ai-kit-salesforce/cli` will resolve core from the registry).

```bash
cd packages/core
npm publish
# or: npm publish --access public
```

---

## Step 2 — Publish CLI to npm

The CLI bundles core at build time via ncc so it is self-contained, but the
package.json still declares `@ai-kit-salesforce/core` as a dep so that consumers
who import the programmatic API get the correct version.

```bash
cd packages/cli
npm publish
```

Users can then run:
```bash
npx @ai-kit-salesforce/cli init

# or install globally for the ai-kit-sf command:
npm install -g @ai-kit-salesforce/cli
ai-kit-sf init
```

---

## Step 3 — Package and publish the VS Code extension

```bash
cd packages/vscode-extension

# Ensure VSCE is available
npm install -g @vscode/vsce

# Set your PAT
export VSCE_PAT=<your-personal-access-token>

# Package (creates ai-kit-salesforce-0.1.0.vsix)
npm run package

# Publish to the Marketplace
npm run publish
# or: vsce publish --pat $VSCE_PAT
```

The `.vsix` file can also be installed locally for testing:
```bash
code --install-extension ai-kit-salesforce-0.1.0.vsix
```

---

## Version bumping

Before each release, update the version in all three `package.json` files:

```bash
# Core
cd packages/core && npm version patch   # or minor / major

# CLI
cd packages/cli && npm version patch

# VS Code extension
cd packages/vscode-extension && npm version patch
```

Then rebuild, test, and publish:

```bash
npm run build
npm test
npm run smoke-test
```

---

## What each artifact contains

| Artifact | Contents | Size |
|----------|----------|------|
| `@ai-kit-salesforce/core@0.1.0.tgz` | All compiled `.js` + `.d.ts` files (no tests) | ~67 KB |
| `@ai-kit-salesforce/cli@0.1.0.tgz` | Single bundled `bundle.js` + LICENSE | ~140 KB |
| `ai-kit-salesforce-0.1.0.vsix` | Bundled `extension.js` + icon + LICENSE | ~75 KB |
