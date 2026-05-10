#!/usr/bin/env node
// Moves the ncc bundle into the expected location for vsce packaging.
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundledPath = path.join(__dirname, '..', 'dist', 'bundled', 'index.js');
const outputPath = path.join(__dirname, '..', 'dist', 'extension.js');

const content = fs.readFileSync(bundledPath, 'utf8');
fs.writeFileSync(outputPath, content, 'utf8');

console.log(`  bundled extension.js → dist/extension.js (${(content.length / 1024).toFixed(0)}KB)`);
