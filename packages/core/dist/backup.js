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
exports.createBackup = createBackup;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
function timestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
        `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`);
}
async function createBackup(rootPath, filePaths) {
    const backupDir = path.join(rootPath, '.ai-kit-salesforce-backup', timestamp());
    await fs.ensureDir(backupDir);
    for (const filePath of filePaths) {
        const exists = await fs.pathExists(filePath);
        if (!exists)
            continue;
        const relativePath = path.relative(rootPath, filePath);
        const backupFilePath = path.join(backupDir, relativePath + '.bak');
        await fs.ensureDir(path.dirname(backupFilePath));
        await fs.copy(filePath, backupFilePath);
    }
    return backupDir;
}
//# sourceMappingURL=backup.js.map