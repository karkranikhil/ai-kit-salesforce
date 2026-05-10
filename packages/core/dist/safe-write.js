"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFileSafe = writeFileSafe;
exports.appendMissingLines = appendMissingLines;
exports.mergePackageJsonScripts = mergePackageJsonScripts;
exports.determineAction = determineAction;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const templates_1 = require("./templates");
async function writeFileSafe(filePath, content, options = {}) {
    const { dryRun = false, overwrite = false, markerLabel } = options;
    const exists = await fs.pathExists(filePath);
    if (!exists) {
        if (!dryRun) {
            await fs.ensureDir(path.dirname(filePath));
            const finalContent = markerLabel ? (0, templates_1.wrapInMarker)(content) : content;
            await fs.writeFile(filePath, finalContent, 'utf8');
        }
        return { path: filePath, action: 'create', skipped: false };
    }
    // File exists — decide what to do
    if (overwrite) {
        if (!dryRun) {
            await fs.writeFile(filePath, content, 'utf8');
        }
        return { path: filePath, action: 'create', skipped: false };
    }
    if (markerLabel) {
        // Append or replace inside marker block
        return updateMarkerBlock(filePath, content, dryRun);
    }
    // No marker, no overwrite — skip
    return {
        path: filePath,
        action: 'skip',
        skipped: true,
        reason: 'File already exists and overwrite is disabled',
    };
}
async function updateMarkerBlock(filePath, newContent, dryRun) {
    const existing = await fs.readFile(filePath, 'utf8');
    const startIdx = existing.indexOf(templates_1.MARKER_START);
    const endIdx = existing.indexOf(templates_1.MARKER_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        // Replace content inside existing marker block
        const before = existing.slice(0, startIdx);
        const after = existing.slice(endIdx + templates_1.MARKER_END.length);
        const updated = before + (0, templates_1.wrapInMarker)(newContent) + after;
        if (!dryRun) {
            await fs.writeFile(filePath, updated, 'utf8');
        }
        return { path: filePath, action: 'merge', skipped: false };
    }
    // No marker found — append new marker block
    const appended = existing.trimEnd() + '\n\n' + (0, templates_1.wrapInMarker)(newContent);
    if (!dryRun) {
        await fs.writeFile(filePath, appended, 'utf8');
    }
    return { path: filePath, action: 'append', skipped: false };
}
async function appendMissingLines(filePath, lines) {
    const exists = await fs.pathExists(filePath);
    let currentContent = '';
    if (exists) {
        currentContent = await fs.readFile(filePath, 'utf8');
    }
    const missing = lines.filter((line) => !currentContent.includes(line));
    if (missing.length === 0)
        return [];
    const toAppend = '\n' + missing.join('\n') + '\n';
    await fs.ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, toAppend, 'utf8');
    return missing;
}
async function mergePackageJsonScripts(rootPath, scripts) {
    const pkgPath = path.join(rootPath, 'package.json');
    const exists = await fs.pathExists(pkgPath);
    if (!exists)
        return [];
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    if (!pkg.scripts)
        pkg.scripts = {};
    const added = [];
    for (const [name, cmd] of Object.entries(scripts)) {
        if (!pkg.scripts[name]) {
            pkg.scripts[name] = cmd;
            added.push(name);
        }
    }
    if (added.length > 0) {
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
    return added;
}
function determineAction(filePath, fileExists) {
    if (!fileExists)
        return 'create';
    return 'skip';
}
//# sourceMappingURL=safe-write.js.map