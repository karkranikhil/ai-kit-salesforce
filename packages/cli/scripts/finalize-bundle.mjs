#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledPath = path.join(__dirname, '..', 'dist', 'bundled', 'index.js');
const outputPath = path.join(__dirname, '..', 'dist', 'bundle.js');

let content = fs.readFileSync(bundledPath, 'utf8');

// Strip any existing shebang lines, then prepend exactly one
content = content.replace(/^(#!.+\n)+/, '');
const final = `#!/usr/bin/env node\n${content}`;

fs.writeFileSync(outputPath, final, { encoding: 'utf8', mode: 0o755 });
console.log(`  bundled → dist/bundle.js (${(final.length / 1024).toFixed(0)}KB)`);
