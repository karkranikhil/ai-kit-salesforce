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
exports.readOrgContext = readOrgContext;
exports.formatOrgContext = formatOrgContext;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
async function readJsonSafe(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function readOrgContext(rootPath) {
    const p = (...parts) => path.join(rootPath, ...parts);
    // 1. .sf/config.json — modern SF CLI auth
    const sfConfig = await readJsonSafe(p('.sf', 'config.json'));
    if (sfConfig) {
        const target = sfConfig['target-org'];
        const defaultOrg = sfConfig['target-org'];
        if (target || defaultOrg) {
            return { defaultOrg: defaultOrg ?? target, targetOrg: target, source: 'sf-config' };
        }
    }
    // 2. sfdx-project.json — may carry defaultOrg key
    const sfdxProject = await readJsonSafe(p('sfdx-project.json'));
    if (sfdxProject) {
        const defaultOrg = sfdxProject['defaultOrg'];
        if (defaultOrg) {
            return { defaultOrg, source: 'sfdx-project' };
        }
    }
    // 3. .sfdx/sfdx-config.json — legacy
    const sfdxConfig = await readJsonSafe(p('.sfdx', 'sfdx-config.json'));
    if (sfdxConfig) {
        const defaultusername = sfdxConfig['defaultusername'];
        if (defaultusername) {
            return { defaultOrg: defaultusername, source: 'sfdx-config' };
        }
    }
    return { source: 'none' };
}
function formatOrgContext(ctx) {
    if (ctx.targetOrg)
        return ctx.targetOrg;
    if (ctx.defaultOrg)
        return ctx.defaultOrg;
    return 'unknown';
}
//# sourceMappingURL=org-context.js.map