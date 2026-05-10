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
exports.applySetup = applySetup;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const templates_1 = require("./templates");
const safe_write_1 = require("./safe-write");
const backup_1 = require("./backup");
function resolvePathInsideRoot(rootPath, relativePath) {
    const normalizedRoot = path.resolve(rootPath);
    const resolvedPath = path.resolve(normalizedRoot, relativePath);
    if (resolvedPath !== normalizedRoot && !resolvedPath.startsWith(normalizedRoot + path.sep)) {
        throw new Error(`Path escapes project root: ${relativePath}`);
    }
    return resolvedPath;
}
async function applySetup(rootPath, plan) {
    const result = {
        filesCreated: [],
        filesModified: [],
        filesSkipped: [],
        packageJsonUpdated: false,
        forceIgnoreUpdated: false,
        errors: [],
    };
    // Collect existing files that will be modified for backup
    const filesToBackup = [];
    for (const planned of plan.files) {
        if (planned.action !== 'create') {
            try {
                filesToBackup.push(resolvePathInsideRoot(rootPath, planned.relativePath));
            }
            catch (err) {
                result.errors.push(String(err));
            }
        }
    }
    if (plan.forceIgnoreLines.length > 0) {
        const fi = path.join(rootPath, '.forceignore');
        if (await fs.pathExists(fi))
            filesToBackup.push(fi);
    }
    if (Object.keys(plan.packageJsonScripts).length > 0) {
        filesToBackup.push(path.join(rootPath, 'package.json'));
    }
    if (!plan.dryRun && filesToBackup.length > 0) {
        try {
            const backupPath = await (0, backup_1.createBackup)(rootPath, filesToBackup);
            result.backupPath = backupPath;
        }
        catch (err) {
            result.errors.push(`Backup failed: ${String(err)}`);
        }
    }
    // Apply file operations
    for (const planned of plan.files) {
        if (planned.action === 'skip') {
            result.filesSkipped.push(planned.relativePath);
            continue;
        }
        let fullPath;
        try {
            fullPath = resolvePathInsideRoot(rootPath, planned.relativePath);
        }
        catch (err) {
            result.errors.push(`Failed to write ${planned.relativePath}: ${String(err)}`);
            continue;
        }
        const content = templates_1.TEMPLATES[planned.templateKey] ?? `# ${planned.relativePath}\n\n<!-- TODO: Add content -->\n`;
        try {
            const writeResult = await (0, safe_write_1.writeFileSafe)(fullPath, content, { dryRun: plan.dryRun });
            if (writeResult.action === 'create') {
                result.filesCreated.push(planned.relativePath);
            }
            else if (writeResult.action === 'append' || writeResult.action === 'merge') {
                result.filesModified.push(planned.relativePath);
            }
            else {
                result.filesSkipped.push(planned.relativePath);
            }
        }
        catch (err) {
            result.errors.push(`Failed to write ${planned.relativePath}: ${String(err)}`);
        }
    }
    // Update .forceignore
    if (plan.forceIgnoreLines.length > 0) {
        try {
            const fiPath = path.join(rootPath, '.forceignore');
            if (!plan.dryRun) {
                await (0, safe_write_1.appendMissingLines)(fiPath, plan.forceIgnoreLines);
            }
            result.forceIgnoreUpdated = true;
        }
        catch (err) {
            result.errors.push(`Failed to update .forceignore: ${String(err)}`);
        }
    }
    // Update package.json scripts
    if (Object.keys(plan.packageJsonScripts).length > 0) {
        try {
            if (!plan.dryRun) {
                const added = await (0, safe_write_1.mergePackageJsonScripts)(rootPath, plan.packageJsonScripts);
                result.packageJsonUpdated = added.length > 0;
            }
            else {
                result.packageJsonUpdated = true;
            }
        }
        catch (err) {
            result.errors.push(`Failed to update package.json: ${String(err)}`);
        }
    }
    return result;
}
//# sourceMappingURL=apply.js.map